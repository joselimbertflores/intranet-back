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

import { SearchPortalDocumentsDto } from 'src/modules/documents/dtos';
import { PublicDocumentService } from 'src/modules/documents/services';

@Public()
@Controller('portal-documents')
export class PortalDocumentsController {
  constructor(private publicDocumentService: PublicDocumentService) {}

  @Get('filters')
  async getDocumentFilters() {
    const [organizationalUnits, types] = await Promise.all([
      this.publicDocumentService.getOrganizationalUnits(),
      this.publicDocumentService.getTypes(),
    ]);
    return { organizationalUnits, types };
  }

  @Get()
  searchDocuments(@Query() body: SearchPortalDocumentsDto) {
    return this.publicDocumentService.searchDocuments(body);
  }

  @Public()
  @Get(':id/file')
  async getDocumentFile(
    @Res({ passthrough: true }) res: Response,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('download', new DefaultValuePipe(false), ParseBoolPipe) download: boolean,
  ) {
    const { file, stream } = await this.publicDocumentService.getDocumentFileStream(id, { countDownload: download });

    const disposition = download ? 'attachment' : 'inline';
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `${disposition}; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);
    res.setHeader('Content-Length', file.sizeBytes);
    res.setHeader('Cache-Control', 'no-cache');

    return new StreamableFile(stream);
  }
}
