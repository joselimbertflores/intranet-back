import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

import { mkdir, rename, unlink, writeFile } from 'fs/promises';
import { dirname, extname, join } from 'path';
import { v4 as uuid } from 'uuid';
import { existsSync } from 'fs';

import { pdfToPng } from 'pdf-to-png-converter';

import { EnvironmentVariables } from 'src/config';
import { GetFileDto } from './dtos/get-file.dto';
import { FileGroup } from './file-group.enum';
import { FileStatus, StoredFile } from './entities/stored-file.entity';
import { Repository } from 'typeorm';
import { FileContext } from './enums/file-context.enum';
import { UploadResult } from './interfaces';
import { generatePdfPreview } from 'src/helpers';

const FOLDERS: Record<string, string[]> = {
  images: ['jpg', 'png', 'jpeg'],
  documents: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ods', 'ppt'],
  videos: ['mp4'],
  audios: ['mp3'],
};

@Injectable()
export class FilesService {
  private readonly BASE_UPLOAD_PATH = join(__dirname, '..', '..', '..', 'static', 'uploads');

  private readonly TEMP_PATH = join(this.BASE_UPLOAD_PATH, 'temp');

  constructor(
    @InjectRepository(StoredFile) private readonly fileRepository: Repository<StoredFile>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService<EnvironmentVariables>,
  ) {}

  async upload(file: Express.Multer.File, context: FileContext): Promise<UploadResult> {
    const extension = extname(file.originalname).replace('.', '').toLowerCase();

    if (!extension) {
      throw new BadRequestException('File must have an extension');
    }

    const storedName = `${uuid()}.${extension}`;
    const storageKey = `${context}/${storedName}`;
    const finalPath = join(this.BASE_UPLOAD_PATH, storageKey);

    await this.ensureFolderExists(dirname(finalPath));

    // 1️⃣ Guardar archivo físico
    await writeFile(finalPath, file.buffer);

    // 2️⃣ Crear entidad StoredFile
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');

    const entity = this.fileRepository.create({
      storedName,
      originalName,
      storageKey,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    });

    const saved = await this.fileRepository.save(entity);

    // 3️⃣ Respuesta al front
    return {
      fileId: saved.id,
      originalName: saved.originalName,
    };
  }

  async uploadPdfWithDerivedPreview(file: Express.Multer.File, context: FileContext): Promise<UploadResult> {
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are allowed');
    }

    const extension = extname(file.originalname).toLowerCase();
    if (extension !== '.pdf') {
      throw new BadRequestException('Invalid PDF extension');
    }

    const pdfStoredName = `${uuid()}.pdf`;
    const pdfStorageKey = `${context}/${pdfStoredName}`;
    const pdfPath = join(this.BASE_UPLOAD_PATH, pdfStorageKey);

    await this.ensureFolderExists(dirname(pdfPath));
    await writeFile(pdfPath, file.buffer);

    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');

    const pdfEntity = this.fileRepository.create({
      storedName: pdfStoredName,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      storageKey: pdfStorageKey,
      originalName,
    });

    const savedPdf = await this.fileRepository.save(pdfEntity);

    const previewBuffer = await generatePdfPreview(pdfPath);

    if (previewBuffer) {
      const previewStoredName = `${uuid()}.png`;
      const previewStorageKey = `${context}/previews/${previewStoredName}`;
      const previewPath = join(this.BASE_UPLOAD_PATH, previewStorageKey);

      await this.ensureFolderExists(dirname(previewPath));

      await writeFile(previewPath, previewBuffer);

      const previewEntity = this.fileRepository.create({
        storedName: previewStoredName,
        originalName: originalName.replace(/\.pdf$/i, '') + ' (preview).png',
        mimeType: 'image/png',
        sizeBytes: previewBuffer.length,
        storageKey: previewStorageKey,
        parentFile: savedPdf,
      });
      await this.fileRepository.save(previewEntity);
    }

    return {
      fileId: savedPdf.id,
      originalName: savedPdf.originalName,
    };
  }

  async getFileForDownload(fileId: string) {
    const file = await this.fileRepository.findOneBy({ id: fileId });

    if (!file || file.status !== FileStatus.ACTIVE) {
      throw new NotFoundException();
    }

    const path = join(this.BASE_UPLOAD_PATH, file.storageKey);

    return {
      path,
      downloadName: file.originalName,
    };
  }

  async getFilePath(fileId: string): Promise<string> {
    const file = await this.fileRepository.findOneBy({ id: fileId });

    if (!file || file.status === FileStatus.REMOVED) {
      throw new NotFoundException('File not found');
    }

    const fullPath = join(this.BASE_UPLOAD_PATH, file.storageKey);

    if (!existsSync(fullPath)) {
      throw new NotFoundException('Physical file not found');
    }

    return fullPath;
  }

  async saveTempFile(file: Express.Multer.File) {
    const extension = extname(file.originalname).replace('.', '').toLowerCase();
    if (!extension) {
      throw new BadRequestException('File must have an extension');
    }

    const fileName = `${uuid()}.${extension}`;
    const tempFilePath = join(this.TEMP_PATH, fileName);

    await this.ensureFolderExists(this.TEMP_PATH);

    await writeFile(tempFilePath, file.buffer);

    return {
      fileName,
      originalName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
      mimeType: file.mimetype,
      sizeBytes: file.size,
    };
  }

  async finalizeFile(tempFileName: string, group: FileGroup): Promise<void> {
    const tempPath = join(this.TEMP_PATH, tempFileName);

    if (!existsSync(tempPath)) {
      throw new InternalServerErrorException(`Temp file ${tempFileName} not found`);
    }

    const folder = this.resolveFolderByExtension(tempFileName);
    const finalDir = join(this.BASE_UPLOAD_PATH, group, folder);
    const finalPath = join(finalDir, tempFileName);

    await this.ensureFolderExists(finalDir);

    await rename(tempPath, finalPath);
  }

  /**
   * Elimina archivo de su ubicación final
   */
  async deleteFile(fileName: string, group: FileGroup): Promise<void> {
    const folder = this.resolveFolderByExtension(fileName);
    const filePath = join(this.BASE_UPLOAD_PATH, group, folder, fileName);
    if (existsSync(filePath)) {
      await unlink(filePath);
    }
  }

  /**
   * Elimina múltiples archivos de su ubicación final
   */
  async deleteFiles(fileNames: string[], group: FileGroup): Promise<void> {
    await Promise.all(fileNames.map((file) => this.deleteFile(file, group)));
  }

  async finalizeFiles(fileNames: string[], group: FileGroup): Promise<void> {
    await Promise.all(fileNames.map((file) => this.finalizeFile(file, group)));
  }

  getStaticFilePath({ fileName, group }: GetFileDto): string {
    const subfolder = this.resolveFolderByExtension(fileName);
    const filePath = join(this.BASE_UPLOAD_PATH, group, subfolder, fileName);
    if (!existsSync(filePath)) {
      throw new BadRequestException(`No file found with name ${fileName}`);
    }
    return filePath;
  }

  private resolveFolderByExtension(fileName: string): string {
    const extension = extname(fileName).replace('.', '').toLowerCase();
    const folder = Object.keys(FOLDERS).find((key) => FOLDERS[key].includes(extension));
    return folder || 'others';
  }

  async generatePdfThumbnail(pdfPath: string, outputPath: string): Promise<void> {
    const [image] = await pdfToPng(pdfPath, {
      pagesToProcess: [1],
      viewportScale: 0.7,
    });

    if (!image?.content) {
      throw new InternalServerErrorException('Failed to generate PDF thumbnail');
    }

    await writeFile(outputPath, image.content);
  }

  async findFileOrFail(id: string): Promise<StoredFile> {
    const file = await this.fileRepository.findOne({ where: { id } });
    if (!file) throw new NotFoundException('File not found');
    return file;
  }

  getAbsolutePath(file: StoredFile): string {
    return join(this.BASE_UPLOAD_PATH, file.storageKey);
  }

  buildFileUrl(filename: string, group: FileGroup): string {
    const host = this.configService.get('HOST', { infer: true });
    return `${host}/files/${group}/${filename}`;
  }

  buildPublicFileUrl(id: string) {
    const host = this.configService.getOrThrow<string>('HOST');
    return `${host}/files/${id}`;
  }

  async tryIncrementDownloadCount(id: string, userIp: string): Promise<void> {
    const cacheKey = `download:${id}:${userIp}`;

    const alreadyCounted = await this.cacheManager.get<boolean>(cacheKey);
    if (alreadyCounted) return;

    await this.fileRepository.increment({ id }, 'downloadCount', 1);

    await this.cacheManager.set(cacheKey, true, 300000);
  }

  private async ensureFolderExists(path: string): Promise<void> {
    if (!existsSync(path)) {
      await mkdir(path, { recursive: true });
    }
  }
}
