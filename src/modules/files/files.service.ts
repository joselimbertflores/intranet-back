import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { mkdir, rename, unlink, writeFile } from 'fs/promises';
import { basename, extname, join } from 'path';
import { v4 as uuid } from 'uuid';
import { existsSync } from 'fs';

import { pdfToPng } from 'pdf-to-png-converter';

import { EnvironmentVariables } from 'src/config';
import { GetFileDto } from './dtos/get-file.dto';
import { FileGroup } from './file-group.enum';

const FOLDERS: Record<string, string[]> = {
  images: ['jpg', 'png', 'jpeg'],
  documents: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ods', 'ppt'],
  videos: ['mp4'],
  audios: ['mp3'],
};

@Injectable()
export class FilesService {
  private readonly BASE_PATH = join(__dirname, '..', '..', '..', 'static', 'uploads');
  private readonly TEMP_PATH = join(this.BASE_PATH, 'temp');

  constructor(private configService: ConfigService<EnvironmentVariables>) {}

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

  async saveTempPdfWithPreview(file: Express.Multer.File) {
    const tempPdf = await this.saveTempFile(file);

    const baseName = basename(tempPdf.fileName, '.pdf');
    const previewName = `${baseName}-preview.png`;

    const tempPdfPath = join(this.TEMP_PATH, tempPdf.fileName);
    const tempPreviewPath = join(this.TEMP_PATH, previewName);

    await this.generatePdfThumbnail(tempPdfPath, tempPreviewPath);

    return {
      fileName: tempPdf.fileName,
      originalName: tempPdf.originalName,
      mimeType: tempPdf.mimeType,
      sizeBytes: file.size,
      previewFileName: previewName,
    };
  }

  async finalizeFile(tempFileName: string, group: FileGroup): Promise<void> {
    const tempPath = join(this.TEMP_PATH, tempFileName);

    if (!existsSync(tempPath)) {
      throw new InternalServerErrorException(`Temp file ${tempFileName} not found`);
    }

    const folder = this.resolveFolderByExtension(tempFileName);
    const finalDir = join(this.BASE_PATH, group, folder);
    const finalPath = join(finalDir, tempFileName);

    await this.ensureFolderExists(finalDir);

    await rename(tempPath, finalPath);
  }

  private async ensureFolderExists(path: string): Promise<void> {
    if (!existsSync(path)) {
      await mkdir(path, { recursive: true });
    }
  }

  /**
   * Elimina archivo de su ubicación final
   */
  async deleteFile(fileName: string, group: FileGroup): Promise<void> {
    const folder = this.resolveFolderByExtension(fileName);
    const filePath = join(this.BASE_PATH, group, folder, fileName);
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

  async confirmFiles(fileNames: string[], group: FileGroup): Promise<void> {
    await Promise.all(fileNames.map((file) => this.finalizeFile(file, group)));
  }

  getStaticFilePath({ fileName, group }: GetFileDto): string {
    const extension = extname(fileName).replace('.', '');
    const subfolder = this.resolveFolderByExtension(extension);
    const filePath = join(this.BASE_PATH, group, subfolder, fileName);
    if (!existsSync(filePath)) {
      throw new BadRequestException(`No file found with name ${fileName}`);
    }
    return filePath;
  }

  buildFileUrl(filename: string, group: FileGroup): string {
    const host = this.configService.get('HOST', { infer: true });
    return `${host}/files/${group}/${filename}`;
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
}
