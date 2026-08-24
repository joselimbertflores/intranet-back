import {
  Controller,
  DefaultValuePipe,
  Get,
  Headers,
  HttpException,
  HttpStatus,
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
import { parseHttpByteRange } from './helpers/http-byte-range.helper';
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
    return this.filesService.uploadTutorialFile(file);
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
    @Headers('range') rangeHeader?: string,
  ) {
    const file = await this.filesService.findActiveFileOrFail(id);
    const range = parseHttpByteRange(rangeHeader, file.sizeBytes);

    res.setHeader('Accept-Ranges', 'bytes');

    if (range.kind === 'unsatisfiable') {
      res.setHeader('Content-Range', `bytes */${file.sizeBytes}`);
      throw new HttpException('Requested range not satisfiable', HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE);
    }

    const stream = this.filesService.openActiveFileStream(file, range.kind === 'partial' ? range : undefined);

    const disposition = download ? 'attachment' : 'inline';

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `${disposition}; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);
    res.setHeader('Cache-Control', 'no-cache');

    if (range.kind === 'partial') {
      const contentLength = range.end - range.start + 1;
      res.status(HttpStatus.PARTIAL_CONTENT);
      res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${file.sizeBytes}`);
      res.setHeader('Content-Length', contentLength);
    } else {
      res.setHeader('Content-Length', file.sizeBytes);
    }

    return new StreamableFile(stream);
  }
}
