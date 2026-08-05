import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

import { mkdir, unlink, writeFile } from 'fs/promises';
import { dirname, join, parse, resolve } from 'path';
import { EntityManager, Repository } from 'typeorm';
import { createReadStream, existsSync } from 'fs';
import mime from 'mime-types';
import sharp from 'sharp';
import { randomUUID } from 'crypto';

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
  private readonly logger = new Logger(FilesService.name);
  private readonly BASE_UPLOAD_PATH: string;
  private readonly PUBLIC_FILE_BASE_PATH = '/api/files';

  constructor(
    private readonly configService: ConfigService<EnvironmentVariables, true>,
    @InjectRepository(StoredFile) private readonly fileRepository: Repository<StoredFile>,
  ) {
    const uploadPath = this.configService.getOrThrow('UPLOAD_PATH', { infer: true });
    this.BASE_UPLOAD_PATH = resolve(process.cwd(), uploadPath);
  }

  async uploadFile(file: Express.Multer.File, context: FileContext): Promise<UploadResult> {
    const saved = await this.saveFile({
      context,
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
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
      mimeType: 'application/pdf',
      context,
    });

    const pdfPath = join(this.BASE_UPLOAD_PATH, savedPdf.storageKey);

    try {
      const previewBuffer = await generatePdfPreview(pdfPath);
      if (previewBuffer) {
        await this.saveDerivedPreview(previewBuffer, savedPdf, context);
      } else {
        this.logger.warn(`PDF preview could not be generated for file ${savedPdf.id}: no page content`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown preview generation error';
      this.logger.warn(`PDF preview could not be generated for file ${savedPdf.id}: ${message}`);
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

  buildPublicFileUrl(fileId: string): string {
    const appPublicUrl = this.configService.getOrThrow('INTRANET_PUBLIC_URL', { infer: true });
    return new URL(`${this.PUBLIC_FILE_BASE_PATH}/${fileId}`, appPublicUrl).toString();
  }

  async claimPendingFile(fileId: string, context: FileContext, manager: EntityManager): Promise<StoredFile> {
    const fileRepository = manager.getRepository(StoredFile);

    const file = await fileRepository.findOne({ where: { id: fileId }, relations: { derivedFiles: true } });

    if (!file) throw new NotFoundException('File not found');

    if (file.status !== FileStatus.PENDING) {
      throw new BadRequestException('File is not pending');
    }

    if (file.context !== context) {
      throw new BadRequestException('File does not belong to this context');
    }

    if (file.kind !== StoredFileKind.ORIGINAL || file.sourceFileId) {
      throw new BadRequestException('File must be an original file');
    }

    const result = await fileRepository.update(
      { id: file.id, status: FileStatus.PENDING },
      { status: FileStatus.ACTIVE },
    );

    if (result.affected !== 1) throw new BadRequestException('File is not available for use');
    if (file.derivedFiles?.length) {
      await fileRepository.update(
        { sourceFileId: file.id, context: file.context, status: FileStatus.PENDING },
        { status: FileStatus.ACTIVE },
      );

      file.derivedFiles.forEach((derivedFile) => {
        if (derivedFile.status === FileStatus.PENDING) {
          derivedFile.status = FileStatus.ACTIVE;
        }
      });
    }
    file.status = FileStatus.ACTIVE;

    return file;
  }

  async replaceActiveFileWithPendingFile(
    currentFileId: string,
    newPendingFileId: string,
    context: FileContext,
    manager: EntityManager,
  ) {
    if (currentFileId === newPendingFileId) {
      throw new BadRequestException('Replacement file must be different from current file');
    }
    const newFile = await this.claimPendingFile(newPendingFileId, context, manager);
    await this.markActiveFileAsOrphaned(currentFileId, manager, context);
    return newFile;
  }

  async markActiveFileAsOrphaned(fileId: string, manager: EntityManager, expectedContext?: FileContext): Promise<void> {
    const fileRepository = manager.getRepository(StoredFile);

    const file = await fileRepository.findOne({ where: { id: fileId }, relations: { derivedFiles: true } });

    if (!file) throw new NotFoundException('File not found');

    if (expectedContext && file.context !== expectedContext) {
      throw new BadRequestException('File does not belong to the expected context');
    }

    if (file.sourceFileId) throw new BadRequestException('Derived files cannot be orphaned directly');

    if (file.status !== FileStatus.ACTIVE) {
      throw new BadRequestException('Only active files can be marked as orphaned');
    }

    const result = await fileRepository.update(
      { id: file.id, status: FileStatus.ACTIVE },
      { status: FileStatus.ORPHANED },
    );

    if (result.affected !== 1) {
      throw new BadRequestException('Only active files can be marked as orphaned');
    }

    await fileRepository.update({ sourceFileId: file.id, status: FileStatus.ACTIVE }, { status: FileStatus.ORPHANED });

    file.status = FileStatus.ORPHANED;
    file.derivedFiles?.forEach((derivedFile) => {
      if (derivedFile.status === FileStatus.ACTIVE) {
        derivedFile.status = FileStatus.ORPHANED;
      }
    });
  }

  async getActiveFileStream(id: string) {
    const file = await this.fileRepository.findOne({ where: { id, status: FileStatus.ACTIVE } });

    if (!file) throw new NotFoundException('File not found');

    const finalPath = join(this.BASE_UPLOAD_PATH, file.storageKey);

    if (!existsSync(finalPath)) {
      throw new NotFoundException('File not found');
    }

    return { file, stream: createReadStream(finalPath) };
  }

  private async saveFile(params: SaveFileParams): Promise<StoredFile> {
    const { mimeType, context, buffer, originalName, kind = StoredFileKind.ORIGINAL, sourceFile } = params;
    const extension = this.resolveExtensionOrFail(mimeType);
    const storageKey = this.buildStorageKey(context, extension);
    const finalPath = join(this.BASE_UPLOAD_PATH, storageKey);

    await this.ensureFolderExists(dirname(finalPath));
    await writeFile(finalPath, buffer);

    const normalizedName = this.normalizeOriginalName(originalName);

    const entity = this.fileRepository.create({
      originalName: normalizedName,
      storageKey,
      mimeType,
      sizeBytes: buffer.length,
      context,
      status: FileStatus.PENDING,
      kind,
      sourceFile: sourceFile ?? null,
      sourceFileId: sourceFile?.id ?? null,
    });

    try {
      return await this.fileRepository.save(entity);
    } catch (error) {
      await this.deletePhysicalFile(finalPath);
      throw error;
    }
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

  private async ensureFolderExists(folderPath: string) {
    await mkdir(folderPath, { recursive: true });
  }

  private resolveExtensionOrFail(mimeType: string): string {
    const extension = mime.extension(mimeType);

    if (!extension) {
      throw new BadRequestException(`Unsupported mime type: ${mimeType}`);
    }

    return extension;
  }

  private buildStorageKey(context: FileContext, extension: string): string {
    return `${context}/${randomUUID()}.${extension}`;
  }

  private normalizeOriginalName(originalName: string): string {
    return Buffer.from(originalName, 'latin1').toString('utf8');
  }

  private async deletePhysicalFile(path: string): Promise<void> {
    try {
      await unlink(path);
    } catch {
      // Best-effort cleanup after a database persistence failure.
    }
  }
}
