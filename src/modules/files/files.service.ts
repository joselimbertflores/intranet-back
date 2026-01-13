import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { mkdir, unlink, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { v4 as uuid } from 'uuid';
import { existsSync } from 'fs';

import { generatePdfThumbnail } from 'src/helpers';
import { EnvironmentVariables } from 'src/config';
import { GetFileDto } from './dtos/get-file.dto';
import { FileGroup } from './file-group.enum';

export interface savedFile {
  fileName: string;
  originalName: string;
  type: string;
  sizeBytes: number;
}

const FOLDERS: Record<string, string[]> = {
  images: ['jpg', 'png', 'jpeg'],
  documents: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ods', 'ppt'],
  videos: ['mp4'],
  audios: ['mp3'],
};

@Injectable()
export class FilesService {
  private readonly BASE_UPLOAD_PATH = join(__dirname, '..', '..', '..', 'static', 'uploads');

  constructor(private configService: ConfigService<EnvironmentVariables>) {}

  async saveFile(file: Express.Multer.File, group: FileGroup): Promise<savedFile> {
    try {
      const { filePath, savedFileName } = await this.buildSavePathFile(file, group);

      await writeFile(filePath, new Uint8Array(file.buffer));

      const decodedOriginalName = Buffer.from(file.originalname, 'latin1').toString('utf8');

      return {
        fileName: savedFileName,
        originalName: decodedOriginalName,
        type: this.getFileType(file.mimetype),
        sizeBytes: file.size,
      };
    } catch (error) {
      throw new InternalServerErrorException('Error saving file');
    }
  }

  async savePdfWithThumbnail(file: Express.Multer.File, group: FileGroup) {
    try {
      const { filePath, savedFileName } = await this.buildSavePathFile(file, group);

      await writeFile(filePath, new Uint8Array(file.buffer));

      const groupPath = join(this.BASE_UPLOAD_PATH, group);

      const imagesDir = join(groupPath, 'images');

      await this.ensureFolderExists(imagesDir);

      const previewName = await generatePdfThumbnail(filePath, imagesDir);

      const decodedOriginalName = Buffer.from(file.originalname, 'latin1').toString('utf8');

      return {
        fileName: savedFileName,
        originalName: decodedOriginalName,
        previewName,
      };
    } catch (error) {
      throw new InternalServerErrorException('Error saving pdf file');
    }
  }

  async saveVideo(file: Express.Multer.File, group: FileGroup) {
    try {
      const { filePath, savedFileName } = await this.buildSavePathFile(file, group);

      await writeFile(filePath, new Uint8Array(file.buffer));

      const groupPath = join(this.BASE_UPLOAD_PATH, group);

      const videoDir = join(groupPath, 'videos');

      await this.ensureFolderExists(videoDir);

      const decodedOriginalName = Buffer.from(file.originalname, 'latin1').toString('utf8');

      return {
        fileName: savedFileName,
        originalName: decodedOriginalName,
        type: this.getFileType(file.mimetype),
        sizeBytes: file.size,
      };
    } catch (error) {
      throw new InternalServerErrorException('Error saving pdf file');
    }
  }

  getStaticFilePath({ fileName, group }: GetFileDto): string {
    const extension = extname(fileName).replace('.', '');
    const subfolder = this.getFolderByExtension(extension);
    const filePath = join(this.BASE_UPLOAD_PATH, group, subfolder, fileName);
    if (!existsSync(filePath)) {
      throw new BadRequestException(`No file found with name ${fileName}`);
    }
    return filePath;
  }

  buildFileUrl(filename: string, group: FileGroup): string {
    const host = this.configService.get('HOST', { infer: true });
    return `${host}/files/${group}/${filename}`;
  }

  async deleteFile(fileName: string, group: FileGroup): Promise<void> {
    const extension = extname(fileName).replace('.', '');
    const subfolder = this.getFolderByExtension(extension);

    const filePath = join(this.BASE_UPLOAD_PATH, group, subfolder, fileName);

    if (existsSync(filePath)) {
      await unlink(filePath);
    }
  }

  async deleteMany(fileNames: string[], group: FileGroup): Promise<void> {
    await Promise.all(fileNames.map((file) => this.deleteFile(file, group)));
  }

  private getFolderByExtension(ext: string): string {
    ext = ext.toLowerCase();
    for (const [folder, extensions] of Object.entries(FOLDERS)) {
      if (extensions.includes(ext)) {
        return folder;
      }
    }
    return 'others';
  }

  private async buildSavePathFile(file: Express.Multer.File, group: FileGroup) {
    const fileExtension = file.originalname.split('.').pop()?.toLowerCase() ?? '';

    const subfolder = this.getFolderByExtension(fileExtension);

    const folderPath = join(this.BASE_UPLOAD_PATH, group, subfolder);

    await this.ensureFolderExists(folderPath);

    const savedFileName = `${uuid()}.${fileExtension}`;

    const filePath = join(folderPath, savedFileName);

    return { filePath, savedFileName };
  }

  private async ensureFolderExists(path: string): Promise<void> {
    if (!existsSync(path)) {
      await mkdir(path, { recursive: true });
    }
  }

  private getFileType(mimetype: string): 'image' | 'video' | 'audio' | 'document' {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'audio';
    return 'document';
  }
}
