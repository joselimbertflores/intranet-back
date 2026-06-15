import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

import { access, mkdir, writeFile } from 'fs/promises';
import { dirname, join, parse } from 'path';
import { EntityManager, In, Repository } from 'typeorm';
import { constants, existsSync } from 'fs';
import sharp from 'sharp';
import mime from 'mime-types';

import { FileStatus, StoredFile, StoredFileKind } from './entities/stored-file.entity';
import { FileContext } from './enums/file-context.enum';
import { EnvironmentVariables } from 'src/config';
import { generatePdfPreview } from 'src/helpers';
import { UploadResult } from './interfaces';

interface SaveFileParams {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  context: FileContext;
  kind?: StoredFileKind;
  sourceFile?: StoredFile;
}

@Injectable()
export class FilesService {
  private readonly BASE_UPLOAD_PATH = join(__dirname, '..', '..', '..', 'static', 'uploads');

  constructor(
    @InjectRepository(StoredFile) private readonly fileRepository: Repository<StoredFile>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService<EnvironmentVariables>,
  ) {}

  async uploadFile(file: Express.Multer.File, context: FileContext): Promise<UploadResult> {
    const saved = await this.saveFile({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      context,
    });

    return {
      id: saved.id,
      name: saved.originalName,
      message: 'File uploaded successfully',
    };
  }

  async uploadPdf(file: Express.Multer.File, context: FileContext): Promise<UploadResult> {
    const savedPdf = await this.saveFile({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      context,
    });

    const pdfPath = join(this.BASE_UPLOAD_PATH, savedPdf.storageKey);

    const previewBuffer = await generatePdfPreview(pdfPath);

    if (previewBuffer) {
      await this.saveDerivedPreview(previewBuffer, savedPdf, context);
    }

    return {
      id: savedPdf.id,
      name: savedPdf.originalName,
      message: 'File uploaded successfully',
    };
  }
  async uploadImage(file: Express.Multer.File, context: FileContext): Promise<UploadResult> {
    const optimizedBuffer = await sharp(file.buffer)
      .resize({
        width: 1600,
        height: 1600,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({
        quality: 75,
        effort: 6,
        smartSubsample: true,
      })
      .toBuffer();

    const { name } = parse(file.originalname);

    const saved = await this.saveFile({
      buffer: optimizedBuffer,
      originalName: `${name}.webp`,
      mimeType: 'image/webp',
      context,
    });

    return {
      id: saved.id,
      name: saved.originalName,
      message: 'File uploaded successfully',
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

    if (!file || file.status === FileStatus.ORPHANED) {
      throw new NotFoundException('File not found');
    }

    const fullPath = join(this.BASE_UPLOAD_PATH, file.storageKey);

    if (!existsSync(fullPath)) {
      throw new NotFoundException('Physical file not found');
    }

    return fullPath;
  }

  async findFileOrFail(id: string): Promise<StoredFile> {
    const file = await this.fileRepository.findOne({ where: { id } });
    if (!file) throw new NotFoundException('File not found');
    return file;
  }

  async findActiveFileOrFail(id: string): Promise<StoredFile> {
    const file = await this.fileRepository.findOne({ where: { id } });
    if (!file || file.status !== FileStatus.ACTIVE) throw new NotFoundException('File not found');
    return file;
  }

  async getAbsolutePathOrFail(file: StoredFile): Promise<string> {
    const path = join(this.BASE_UPLOAD_PATH, file.storageKey);

    try {
      await access(path, constants.R_OK);
    } catch {
      throw new NotFoundException('File missing from storage');
    }

    return path;
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

  async claimPendingFile(fileId: string, manager?: EntityManager): Promise<StoredFile> {
    const fileRepository = this.getFileRepository(manager);
    const file = await fileRepository.findOne({ where: { id: fileId } });

    if (!file) throw new NotFoundException('File not found');
    if (file.status !== FileStatus.PENDING) {
      throw new BadRequestException('File is not available for use');
    }

    file.status = FileStatus.ACTIVE;
    return fileRepository.save(file);
  }

  async claimPendingFileWithDerivedFiles(fileId: string, manager?: EntityManager): Promise<StoredFile> {
    const fileRepository = this.getFileRepository(manager);
    const file = await fileRepository.findOne({
      where: { id: fileId },
      relations: { derivedFiles: true },
    });

    if (!file) throw new NotFoundException('File not found');
    if (file.status !== FileStatus.PENDING) {
      throw new BadRequestException('File is not available for use');
    }

    const fileIds = this.getFileAndDerivedIds(file);
    await fileRepository.update({ id: In(fileIds) }, { status: FileStatus.ACTIVE });

    file.status = FileStatus.ACTIVE;
    file.derivedFiles?.forEach((derivedFile) => {
      derivedFile.status = FileStatus.ACTIVE;
    });

    return file;
  }

  async markFileAsOrphaned(fileId: string, manager?: EntityManager): Promise<void> {
    const fileRepository = this.getFileRepository(manager);
    const result = await fileRepository.update({ id: fileId }, { status: FileStatus.ORPHANED });

    if (!result.affected) throw new NotFoundException('File not found');
  }

  async markFileWithDerivedFilesAsOrphaned(fileId: string, manager?: EntityManager): Promise<void> {
    const fileRepository = this.getFileRepository(manager);
    const file = await fileRepository.findOne({
      where: { id: fileId },
      relations: { derivedFiles: true },
    });

    if (!file) throw new NotFoundException('File not found');

    await fileRepository.update({ id: In(this.getFileAndDerivedIds(file)) }, { status: FileStatus.ORPHANED });
  }

  async replaceActiveFile(oldFileId: string, newPendingFileId: string, manager?: EntityManager): Promise<StoredFile> {
    const fileRepository = this.getFileRepository(manager);
    const oldFile = await fileRepository.findOne({ where: { id: oldFileId } });

    if (!oldFile) throw new NotFoundException('File not found');
    if (oldFile.status !== FileStatus.ACTIVE) {
      throw new BadRequestException('Current file is not active');
    }

    const newFile = await this.claimPendingFileWithDerivedFiles(newPendingFileId, manager);
    await this.markFileWithDerivedFilesAsOrphaned(oldFileId, manager);

    return newFile;
  }

  private async saveFile(params: SaveFileParams): Promise<StoredFile> {
    const { mimeType, context, buffer, originalName, kind = StoredFileKind.ORIGINAL, sourceFile } = params;
    const extension = mime.extension(mimeType);

    if (!extension) {
      throw new Error(`Unsupported mime type: ${mimeType}`);
    }

    const storedName = `${crypto.randomUUID()}.${extension}`;
    const storageKey = `${context}/${storedName}`;
    const finalPath = join(this.BASE_UPLOAD_PATH, storageKey);

    await this.ensureFolderExists(dirname(finalPath));
    await writeFile(finalPath, buffer);

    const normalizedName = Buffer.from(originalName, 'latin1').toString('utf8');

    const entity = this.fileRepository.create({
      storedName,
      originalName: normalizedName,
      storageKey,
      mimeType,
      sizeBytes: buffer.length,
      kind,
      sourceFile,
    });
    return this.fileRepository.save(entity);
  }

  private async saveDerivedPreview(buffer: Buffer, parent: StoredFile, context: FileContext) {
    const { name } = parse(parent.originalName);

    await this.saveFile({
      buffer,
      originalName: `${name}-preview.png`,
      mimeType: 'image/png',
      context,
      kind: StoredFileKind.PREVIEW,
      sourceFile: parent,
    });
  }

  private getFileRepository(manager?: EntityManager): Repository<StoredFile> {
    return manager ? manager.getRepository(StoredFile) : this.fileRepository;
  }

  private getFileAndDerivedIds(file: StoredFile): string[] {
    return [file.id, ...(file.derivedFiles?.map((derivedFile) => derivedFile.id) ?? [])];
  }

  private async ensureFolderExists(folderPath: string) {
    await mkdir(folderPath, { recursive: true });
  }
}
