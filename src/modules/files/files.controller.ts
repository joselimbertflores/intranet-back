import {
  Controller,
  Get,
  Ip,
  Param,
  ParseFilePipeBuilder,
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
import { ALLOWED_FILE_TYPES } from './constants';
import { GetFileDto } from './dtos/get-file.dto';
import { FilesService } from './files.service';
import { FileGroup } from './file-group.enum';
import { Public } from '../auth/decorators';
import { FileContext } from './enums/file-context.enum';
import { createReadStream } from 'fs';

@Public()
@Controller('files')
export class FilesController {
  constructor(private filesService: FilesService) {}

  @Post('hero-section')
  @UseInterceptors(FileInterceptor('file'))
  uploadHeroSlideImage(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addValidator(
          new CustomFileTypeValidator({
            validTypes: ALLOWED_FILE_TYPES.HERO_SLIDES,
          }),
        )
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
        .build(),
    )
    file: Express.Multer.File,
  ) {
    return this.filesService.saveTempFile(file);
  }

  // @Post('document')
  // @UseInterceptors(FileInterceptor('file'))
  // uploadDocument(
  //   @UploadedFile(
  //     new ParseFilePipeBuilder()
  //       .addValidator(
  //         new CustomFileTypeValidator({
  //           validTypes: ALLOWED_FILE_TYPES.DOCUMENTS,
  //         }),
  //       )
  //       .addMaxSizeValidator({ maxSize: 20 * 1024 * 1024 })
  //       .build(),
  //   )
  //   file: Express.Multer.File,
  // ) {
  //   return this.filesService.saveTempFile(file);
  // }

  @Post('documents')
  @UseInterceptors(FileInterceptor('file'))
  uploadDocument(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addValidator(
          new CustomFileTypeValidator({
            validTypes: ALLOWED_FILE_TYPES.DOCUMENTS,
          }),
        )
        .addMaxSizeValidator({ maxSize: 20 * 1024 * 1024 })
        .build(),
    )
    file: Express.Multer.File,
  ) {
    return this.filesService.upload(file, FileContext.DOCUMENT_RECORDS);
  }

  @Post('quick-access')
  @UseInterceptors(FileInterceptor('file'))
  uploadQuickAccessIcon(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addValidator(
          new CustomFileTypeValidator({
            validTypes: ALLOWED_FILE_TYPES.QUICK_ACCESS,
          }),
        )
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
        .build(),
    )
    file: Express.Multer.File,
  ) {
    return this.filesService.saveTempFile(file);
  }

  @Post('tutorials')
  @UseInterceptors(FileInterceptor('file'))
  uploadTutorialVideo(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addValidator(
          new CustomFileTypeValidator({
            validTypes: ALLOWED_FILE_TYPES.TUTORIALS,
          }),
        )
        .addMaxSizeValidator({
          maxSize: 300 * 1024 * 1024,
        })
        .build(),
    )
    file: Express.Multer.File,
  ) {
    return this.filesService.upload(file, FileContext.TUTORIALS);
  }

  @Post('communication')
  @UseInterceptors(FileInterceptor('file'))
  uploadCommunication(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addValidator(
          new CustomFileTypeValidator({
            validTypes: ALLOWED_FILE_TYPES.COMMUNICATIONS,
          }),
        )
        .addMaxSizeValidator({ maxSize: 10 * 1024 * 1024 })
        .build(),
    )
    file: Express.Multer.File,
  ) {
    return this.filesService.uploadPdfWithDerivedPreview(file, FileContext.COMMUNICATIONS);
  }

  @Get(':group/:fileName')
  getFile(@Res() res: Response, @Param() requestParams: GetFileDto) {
    const path = this.filesService.getStaticFilePath(requestParams);
    res.sendFile(path);
  }

  @Get(':id')
  async serveFile(
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Param('id') id: string,
    @Query('download') download: string | undefined,
  ) {
    const file = await this.filesService.findFileOrFail(id);

    const isDownload = download === 'true';

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader(
      'Content-Disposition',
      isDownload ? `attachment; filename="${file.originalName}"` : `inline; filename="${file.originalName}"`,
    );

    if (isDownload) {
      await this.filesService.tryIncrementDownloadCount(file.id, ip);
    }

    return new StreamableFile(createReadStream(this.filesService.getAbsolutePath(file)));
  }
}
