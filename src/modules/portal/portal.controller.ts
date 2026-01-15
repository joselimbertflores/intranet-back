import { Body, Controller, Get, Ip, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';

import { DocumentTypeService, DocumentService } from '../documents/services';
import { HeroSlidesService, QuickAccessService } from '../content/services';
import { CommunicationService } from '../communications/communication.service';
import { FilterDocumentsDto } from '../documents/dtos';
import { PaginationDto } from '../common';

@Controller('portal')
export class PortalController {
  constructor(
    private documentCategoryService: DocumentTypeService,
    private quickAccessService: QuickAccessService,
    private documentService: DocumentService,
    private heroSlideService: HeroSlidesService,
    private coomunicationService: CommunicationService,
  ) {}

  @Get('categories-sections')
  getCategoriesWithSections() {
    return this.documentCategoryService.getCategoriesWithSections();
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
