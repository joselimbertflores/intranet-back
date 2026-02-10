import { Body, Controller, Get, Ip, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';

import {
  DocumentTypeService,
  DocumentService,
  DocumentSectionService,
  DocumentFilterReadService,
} from '../documents/services';
import { HeroSlidesService, QuickAccessService } from '../content/services';
import { CommunicationService } from '../communications/communication.service';
import { FilterDocumentsDto } from '../documents/dtos';
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
    private documentFilterService: DocumentFilterReadService,
  ) {}

  @Get('document-filters')
  async getDocumentFilters() {
    const [sections, types] = await Promise.all([
      this.documentFilterService.getSections(),
      this.documentFilterService.getTypes(),
    ]);

    return { sections, types };
  }

  @Get('document-filters')
  getDocumentTypesAndSubtypes() {
    return this.documentTypeService.getActiveTypesWithSubtypes();
  }

  @Post('documents')
  filterDocuments(@Body() body: FilterDocumentsDto) {
    return this.documentService.filterDocuments(body);
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
