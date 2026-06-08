import {
  Controller,
  Get,
  Ip,
  Param,
  ParseFilePipeBuilder,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';

import { CustomFileTypeValidator } from './validators/custom-file-type.validator';
import { FileContext } from './enums/file-context.enum';
import { ALLOWED_FILE_TYPES } from './constants';
import { FilesService } from './files.service';
import { Public } from '../auth/decorators';

@Controller('files')
export class FilesController {
  constructor(private filesService: FilesService) {}

  @Post('banners')
  @UseInterceptors(FileInterceptor('file'))
  uploadHeroSlideImage(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addValidator(
          new CustomFileTypeValidator({
            validTypes: ALLOWED_FILE_TYPES.banners,
          }),
        )
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
        .build(),
    )
    file: Express.Multer.File,
  ) {
    return this.filesService.uploadImage(file, FileContext.BANNERS);
  }

  @Post('documents')
  @UseInterceptors(FileInterceptor('file'))
  uploadDocument(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addValidator(
          new CustomFileTypeValidator({
            validTypes: ALLOWED_FILE_TYPES['document-records'],
          }),
        )
        .addMaxSizeValidator({ maxSize: 20 * 1024 * 1024 })
        .build(),
    )
    file: Express.Multer.File,
  ) {
    return this.filesService.uploadFile(file, FileContext.DOCUMENT_RECORDS);
  }

  @Post('tutorials')
  @UseInterceptors(FileInterceptor('file'))
  uploadTutorialVideo(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addValidator(
          new CustomFileTypeValidator({
            validTypes: ALLOWED_FILE_TYPES.tutorials,
          }),
        )
        .addMaxSizeValidator({
          maxSize: 300 * 1024 * 1024,
        })
        .build(),
    )
    file: Express.Multer.File,
  ) {
    return this.filesService.uploadFile(file, FileContext.TUTORIALS);
  }

  @Post('communication')
  @UseInterceptors(FileInterceptor('file'))
  uploadCommunication(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addValidator(
          new CustomFileTypeValidator({
            validTypes: ALLOWED_FILE_TYPES.communications,
          }),
        )
        .addMaxSizeValidator({ maxSize: 10 * 1024 * 1024 })
        .build(),
    )
    file: Express.Multer.File,
  ) {
    return this.filesService.uploadPdf(file, FileContext.COMMUNICATIONS);
  }

  @Public()
  @Get(':id')
  async serveFile(
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('download') download?: string,
  ) {
    const file = await this.filesService.findActiveFileOrFail(id);

    const isDownload = download === 'true';

    const filePath = await this.filesService.getAbsolutePathOrFail(file);

    const stats = await stat(filePath);

    res.setHeader('Content-Type', file.mimeType);

    res.setHeader(
      'Content-Disposition',
      `${isDownload ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
    );

    res.setHeader('Content-Length', stats.size);

    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    if (isDownload) {
      await this.filesService.tryIncrementDownloadCount(file.id, ip);
    }
    return new StreamableFile(createReadStream(filePath));
  }
}
