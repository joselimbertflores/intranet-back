import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseBoolPipe,
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

import { CustomFileTypeValidator } from './validators/custom-file-type.validator';
import { FileContext } from './enums/file-context.enum';
import { FILE_UPLOAD_CONFIG } from './constants';
import { FilesService } from './files.service';
import { Public } from '../auth/decorators';

const documentUploadConfig = FILE_UPLOAD_CONFIG[FileContext.DOCUMENT_RECORDS];

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('banners')
  @UseInterceptors(FileInterceptor('file'))
  uploadHeroSlideImage(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addValidator(
          new CustomFileTypeValidator({
            validTypes: FILE_UPLOAD_CONFIG[FileContext.BANNERS].validTypes,
          }),
        )
        .addMaxSizeValidator({ maxSize: FILE_UPLOAD_CONFIG[FileContext.BANNERS].maxSizeBytes })
        .build(),
    )
    file: Express.Multer.File,
  ) {
    return this.filesService.uploadImage(file, FileContext.BANNERS);
  }

  @Post('documents')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: documentUploadConfig.maxSizeBytes } }))
  uploadDocument(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addValidator(
          new CustomFileTypeValidator({
            validTypes: documentUploadConfig.validTypes,
          }),
        )
        .addMaxSizeValidator({ maxSize: documentUploadConfig.maxSizeBytes })
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
            validTypes: FILE_UPLOAD_CONFIG[FileContext.TUTORIALS].validTypes,
          }),
        )
        .addMaxSizeValidator({
          maxSize: FILE_UPLOAD_CONFIG[FileContext.TUTORIALS].maxSizeBytes,
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
            validTypes: FILE_UPLOAD_CONFIG[FileContext.COMMUNICATIONS].validTypes,
          }),
        )
        .addMaxSizeValidator({ maxSize: FILE_UPLOAD_CONFIG[FileContext.COMMUNICATIONS].maxSizeBytes })
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
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('download', new DefaultValuePipe(false), ParseBoolPipe) download: boolean,
  ) {
    const { file, stream } = await this.filesService.getActiveFileStream(id);

    const disposition = download ? 'attachment' : 'inline';

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', file.sizeBytes);
    res.setHeader('Content-Disposition', `${disposition}; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);
    res.setHeader('Cache-Control', 'no-cache');
    return new StreamableFile(stream);
  }
}
