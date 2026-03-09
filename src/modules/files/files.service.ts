import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

import { access, mkdir, writeFile } from 'fs/promises';
import { dirname, join, parse } from 'path';
import { Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { constants, existsSync } from 'fs';
import sharp from 'sharp';
import mime from 'mime-types';

import { FileStatus, StoredFile } from './entities/stored-file.entity';
import { FileContext } from './enums/file-context.enum';
import { EnvironmentVariables } from 'src/config';
import { generatePdfPreview } from 'src/helpers';
import { UploadResult } from './interfaces';

interface SaveFileParams {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  context: FileContext;
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

    if (!file || file.status === FileStatus.REMOVED) {
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

  private async saveFile(params: SaveFileParams): Promise<StoredFile> {
    const { mimeType, context, buffer, originalName } = params;
    const extension = mime.extension(mimeType);

    if (!extension) {
      throw new Error(`Unsupported mime type: ${mimeType}`);
    }

    const storedName = `${uuid()}.${extension}`;
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
    });
    return this.fileRepository.save(entity);
  }

  private async saveDerivedPreview(buffer: Buffer, parent: StoredFile, context: FileContext) {
    const { name } = parse(parent.originalName);

    const saved = await this.saveFile({
      buffer,
      originalName: `${name}-preview.png`,
      mimeType: 'image/png',
      context,
    });

    saved.parentFile = parent;

    await this.fileRepository.save(saved);
  }

  private async ensureFolderExists(folderPath: string) {
    await mkdir(folderPath, { recursive: true });
  }
}
