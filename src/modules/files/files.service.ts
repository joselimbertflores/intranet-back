import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

import { randomUUID } from 'crypto';
import { access, mkdir, unlink, writeFile } from 'fs/promises';
import { dirname, join, parse } from 'path';
import { EntityManager, Repository } from 'typeorm';
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
    private configService: ConfigService<EnvironmentVariables>,
  ) {}

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

  async claimPendingFile(fileId: string, manager: EntityManager): Promise<StoredFile> {
    const fileRepository = manager.getRepository(StoredFile);

    const file = await fileRepository.findOne({ where: { id: fileId }, relations: { derivedFiles: true } });

    if (!file) throw new NotFoundException('File not found');

    if (file.sourceFileId) throw new BadRequestException('Derived files cannot be claimed directly');

    if (file.status !== FileStatus.PENDING) throw new BadRequestException('File is not available for use');

    const result = await fileRepository.update(
      { id: file.id, status: FileStatus.PENDING },
      { status: FileStatus.ACTIVE },
    );

    if (result.affected !== 1) throw new BadRequestException('File is not available for use');

    if (file.derivedFiles?.length) {
      await fileRepository.update({ sourceFileId: file.id, status: FileStatus.PENDING }, { status: FileStatus.ACTIVE });

      file.derivedFiles.forEach((derivedFile) => {
        if (derivedFile.status === FileStatus.PENDING) {
          derivedFile.status = FileStatus.ACTIVE;
        }
      });
    }
    file.status = FileStatus.ACTIVE;

    return file;
  }

  async replaceActiveFileWithPendingFile(currentFileId: string, newPendingFileId: string, manager: EntityManager) {
    if (currentFileId === newPendingFileId) {
      throw new BadRequestException('Replacement file must be different from current file');
    }
    const newFile = await this.claimPendingFile(newPendingFileId, manager);
    await this.markActiveFileAsOrphaned(currentFileId, manager);
    return newFile;
  }

  private async markActiveFileAsOrphaned(fileId: string, manager: EntityManager): Promise<void> {
    const fileRepository = manager.getRepository(StoredFile);

    const file = await fileRepository.findOne({ where: { id: fileId }, relations: { derivedFiles: true } });

    if (!file) throw new NotFoundException('File not found');

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
