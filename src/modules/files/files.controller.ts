import { Controller, Get, Param, ParseFilePipeBuilder, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';

import { CustomFileTypeValidator } from './validators/custom-file-type.validator';
import { ALLOWED_FILE_TYPES } from './constants';
import { GetFileDto } from './dtos/get-file.dto';
import { FilesService } from './files.service';
import { FileGroup } from './file-group.enum';

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
    return this.filesService.saveFile(file, FileGroup.HERO_SLIDES);
  }

  @Post('document')
  @UseInterceptors(FileInterceptor('file'))
  uploadDocument(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addValidator(
          new CustomFileTypeValidator({
            validTypes: ALLOWED_FILE_TYPES.DOCUMENTS,
          }),
        )
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
        .build(),
    )
    file: Express.Multer.File,
  ) {
    return this.filesService.newSaveFile(file);
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
    return this.filesService.saveFile(file, FileGroup.QUICK_ACCESS);
  }

  @Post('tutorial-video')
  @UseInterceptors(FileInterceptor('file'))
  uploadTutorialVideo(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addValidator(
          new CustomFileTypeValidator({
            validTypes: ['mp4'],
          }),
        )
        .addMaxSizeValidator({
          maxSize: 200 * 1024 * 1024,
        })
        .build(),
    )
    file: Express.Multer.File,
  ) {
    return this.filesService.saveVideo(file, FileGroup.ASSISTANCE);
  }

  @Post('tutorial-image')
  @UseInterceptors(FileInterceptor('file'))
  uploadTutorialImage(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addValidator(
          new CustomFileTypeValidator({
            validTypes: ['jpg', 'jpeg', 'png'],
          }),
        )
        .addMaxSizeValidator({
          maxSize: 5 * 1024 * 1024,
        })
        .build(),
    )
    file: Express.Multer.File,
  ) {
    return this.filesService.saveFile(file, FileGroup.ASSISTANCE);
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
    return this.filesService.savePdfWithThumbnail(file, FileGroup.COMUNICATIONS);
  }

  @Get(':group/:fileName')
  getFile(@Res() res: Response, @Param() requestParams: GetFileDto) {
    const path = this.filesService.getStaticFilePath(requestParams);
    res.sendFile(path);
  }
}
