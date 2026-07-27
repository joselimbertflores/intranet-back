import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { DocumentsService, DocumentTypeService, OrganizationalUnitService } from '../services';
import { CreateDocumentBatchDto, FilterDocumentsDto, UpdateDocumentDto } from '../dtos';
import { GetAuthUser, ProtectedResource } from 'src/modules/auth/decorators';
import { Resource, User } from 'src/modules/users/entities';

@ProtectedResource(Resource.DOCUMENTS)
@Controller('documents')
export class DocumentController {
  constructor(
    private readonly organizationalUnitService: OrganizationalUnitService,
    private readonly documentTypeService: DocumentTypeService,
    private readonly documentsService: DocumentsService,
  ) {}

  @Get()
  findAll(@Query() queryParams: FilterDocumentsDto) {
    return this.documentsService.findAll(queryParams);
  }

  @Post('batch')
  createBatch(@Body() body: CreateDocumentBatchDto, @GetAuthUser() user: User) {
    return this.documentsService.createBatch(body, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateDocumentDto) {
    return this.documentsService.update(id, body);
  }

  @Get('organizational-units/tree')
  getOrganizationalUnits() {
    return this.organizationalUnitService.getTree({ onlyActive: true });
  }

  @Get('types')
  getDocumentTypes() {
    return this.documentTypeService.getActiveDocumentTypesWithSubtypes();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }
}
