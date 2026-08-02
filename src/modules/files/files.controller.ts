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
import { ProtectedResource, Public } from '../auth/decorators';
import { Resource } from '../users/entities';

const documentUploadConfig = FILE_UPLOAD_CONFIG[FileContext.DOCUMENT_RECORDS];
const tutorialUploadConfig = FILE_UPLOAD_CONFIG[FileContext.TUTORIALS];

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('hero-slides')
  @UseInterceptors(FileInterceptor('file'))
  uploadHeroSlideImage(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addValidator(
          new CustomFileTypeValidator({
            validTypes: FILE_UPLOAD_CONFIG[FileContext.HERO_SLIDES].validTypes,
          }),
        )
        .addMaxSizeValidator({ maxSize: FILE_UPLOAD_CONFIG[FileContext.HERO_SLIDES].maxSizeBytes })
        .build(),
    )
    file: Express.Multer.File,
  ) {
    return this.filesService.uploadImage(file, FileContext.HERO_SLIDES);
  }

  @Post('featured-banners')
  @UseInterceptors(FileInterceptor('file'))
  uploadFeaturedBannerImage(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addValidator(
          new CustomFileTypeValidator({
            validTypes: FILE_UPLOAD_CONFIG[FileContext.FEATURED_BANNERS].validTypes,
          }),
        )
        .addMaxSizeValidator({ maxSize: FILE_UPLOAD_CONFIG[FileContext.FEATURED_BANNERS].maxSizeBytes })
        .build(),
    )
    file: Express.Multer.File,
  ) {
    return this.filesService.uploadImage(file, FileContext.FEATURED_BANNERS);
  }

  @Post('landing-notices')
  @UseInterceptors(FileInterceptor('file'))
  uploadLandingNoticeImage(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addValidator(
          new CustomFileTypeValidator({
            validTypes: FILE_UPLOAD_CONFIG[FileContext.LANDING_NOTICES].validTypes,
          }),
        )
        .addMaxSizeValidator({ maxSize: FILE_UPLOAD_CONFIG[FileContext.LANDING_NOTICES].maxSizeBytes })
        .build(),
    )
    file: Express.Multer.File,
  ) {
    return this.filesService.uploadImage(file, FileContext.LANDING_NOTICES);
  }

  @Post('documents')
  @ProtectedResource(Resource.DOCUMENTS)
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
  @ProtectedResource(Resource.TUTORIALS)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: tutorialUploadConfig.maxSizeBytes } }))
  uploadTutorialFile(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addValidator(
          new CustomFileTypeValidator({
            validTypes: tutorialUploadConfig.validTypes,
            requireDetectedType: true,
          }),
        )
        .addMaxSizeValidator({
          maxSize: tutorialUploadConfig.maxSizeBytes,
        })
        .build(),
    )
    file: Express.Multer.File,
  ) {
    return this.filesService.uploadFile(file, FileContext.TUTORIALS);
  }

  @Post('communications')
  @ProtectedResource(Resource.COMMUNICATIONS)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: FILE_UPLOAD_CONFIG[FileContext.COMMUNICATIONS].maxSizeBytes },
    }),
  )
  uploadCommunication(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addValidator(
          new CustomFileTypeValidator({
            validTypes: FILE_UPLOAD_CONFIG[FileContext.COMMUNICATIONS].validTypes,
            requireDetectedType: true,
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
