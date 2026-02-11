import { Body, Controller, Get, Ip, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';

import {
  DocumentTypeService,
  DocumentService,
  DocumentSectionService,
  DocumentSearchService,
} from '../documents/services';
import { HeroSlidesService, QuickAccessService } from '../content/services';
import { CommunicationService } from '../communications/communication.service';
import { FilterDocumentsDto, SearchPortalDocumentsDto } from '../documents/dtos';
import { PaginationParamsDto } from '../common';
import { Public } from '../auth/decorators';

@Public()
@Controller('portal')
export class PortalController {
  constructor(
    private quickAccessService: QuickAccessService,
    private documentService: DocumentService,
    private heroSlideService: HeroSlidesService,
    private coomunicationService: CommunicationService,
    private sectionService: DocumentSectionService,
    private documentTypeService: DocumentTypeService,
    private documentSearchService: DocumentSearchService,
  ) {}

  @Get('document-filters')
  async getDocumentFilters() {
    const [sections, types] = await Promise.all([
      this.documentSearchService.getSections(),
      this.documentSearchService.getTypes(),
    ]);
    return { sections, types };
  }

  @Get('documents')
  searchDocuments(@Query() body: SearchPortalDocumentsDto) {
    return this.documentSearchService.searchDocuments(body);
  }

  @Get('home')
  async getHomeData() {
    const [slides, quickAccess, communications, documents] = await Promise.all([
      this.heroSlideService.findAll(),
      this.quickAccessService.findAll(),
      this.coomunicationService.getLatest(10),
      this.documentService.getMostDownloaded(),
    ]);

    return {
      slides,
      quickAccess,
      communications,
      documents,
    };
  }

  @Patch('document/:id/increment-download')
  incrementDownload(@Param('id') id: string, @Ip() ip: string) {
    return this.documentService.incrementDownloadCount(id, ip);
  }
}
