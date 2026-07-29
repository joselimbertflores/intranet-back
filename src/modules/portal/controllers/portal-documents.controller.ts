import {
  DefaultValuePipe,
  StreamableFile,
  ParseBoolPipe,
  ParseUUIDPipe,
  Controller,
  Get,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { Public } from 'src/modules/auth/decorators';

import { SearchPublicDocumentsDto } from 'src/modules/documents/dtos';
import { DocumentDownloadService, PublicDocumentsService } from 'src/modules/documents/services';

@Public()
@Controller('portal-documents')
export class PortalDocumentsController {
  constructor(
    private readonly publicDocumentsService: PublicDocumentsService,
    private readonly documentDownloadService: DocumentDownloadService,
  ) {}

  @Get('filters')
  async getDocumentFilters() {
    const [organizationalUnits, types] = await Promise.all([
      this.publicDocumentsService.getActiveOrganizationalUnitTree(),
      this.publicDocumentsService.getActiveTypes(),
    ]);
    return { organizationalUnits, types };
  }

  @Get()
  searchDocuments(@Query() body: SearchPublicDocumentsDto) {
    return this.publicDocumentsService.searchDocuments(body);
  }

  @Public()
  @Get(':id/file')
  async getDocumentFile(
    @Res({ passthrough: true }) res: Response,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('download', new DefaultValuePipe(false), ParseBoolPipe) download: boolean,
  ) {
    const { file, stream } = await this.documentDownloadService.getDocumentFileStream(id, {
      countDownload: download,
    });

    const disposition = download ? 'attachment' : 'inline';
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `${disposition}; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);
    res.setHeader('Content-Length', file.sizeBytes);
    res.setHeader('Cache-Control', 'no-cache');

    return new StreamableFile(stream);
  }
}
