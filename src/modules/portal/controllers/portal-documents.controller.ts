import { Controller, Get, Query } from '@nestjs/common';
import { Public } from 'src/modules/auth/decorators';

import { SearchPortalDocumentsDto } from 'src/modules/documents/dtos';
import { DocumentSearchService } from 'src/modules/documents/services';

@Public()
@Controller('portal-documents')
export class PortalDocumentsController {
  constructor(private documentSearchService: DocumentSearchService) {}

  @Get('filters')
  async getDocumentFilters() {
    const [organizationalUnits, types] = await Promise.all([
      this.documentSearchService.getOrganizationalUnits(),
      this.documentSearchService.getTypes(),
    ]);
    return { organizationalUnits, types };
  }

  @Get()
  searchDocuments(@Query() body: SearchPortalDocumentsDto) {
    return this.documentSearchService.searchDocuments(body);
  }
}
