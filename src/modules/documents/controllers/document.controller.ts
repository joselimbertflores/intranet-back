import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { DocumentTypeService, DocumentService, OrganizationalUnitService } from '../services';
import { CreateDocumentBatchDto, FilterDocumentsDto, UpdateDocumentDto } from '../dtos';
import { ProtectedResource } from 'src/modules/auth/decorators';
import { Resource } from 'src/modules/users/entities';

@ProtectedResource(Resource.DOCUMENTS)
@Controller('documents')
export class DocumentController {
  constructor(
    private organizationalUnitService: OrganizationalUnitService,
    private documentTypeService: DocumentTypeService,
    private documentService: DocumentService,
  ) {}

  @Get()
  findAll(@Query() queryParams: FilterDocumentsDto) {
    return this.documentService.findAll(queryParams);
  }

  @Post('batch')
  createBatch(@Body() body: CreateDocumentBatchDto) {
    return this.documentService.createBatch(body);
  }

  @Post()
  createBatchLegacy(@Body() body: CreateDocumentBatchDto) {
    return this.documentService.createBatch(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateDocumentDto) {
    return this.documentService.update(id, body);
  }

  @Get('organizational-units/tree')
  getOrganizationalUnits() {
    return this.organizationalUnitService.getTree();
  }

  @Get('types')
  getDocumentTypes() {
    return this.documentTypeService.getActiveTypesWithSubtypes();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.documentService.findOne(id);
  }
}
