import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { DocumentTypeService, DocumentService, OrganizationalUnitService } from '../services';
import { CreateDocumentsDto, NewFilterDocumentsDto, UpdateDocumentDto } from '../dtos';
import { GetAuthUser, ProtectedResource } from 'src/modules/auth/decorators';
import { Resource, User } from 'src/modules/users/entities';

@ProtectedResource(Resource.DOCUMENTS)
@Controller('documents')
export class DocumentController {
  constructor(
    private organizationalUnitService: OrganizationalUnitService,
    private documentService: DocumentService,
    private documentTypeService: DocumentTypeService,
  ) {}

  @Get()
  findAll(@Query() queryParams: NewFilterDocumentsDto, @GetAuthUser() user: User) {
    return this.documentService.findAll(queryParams, user);
  }

  @Post()
  create(@Body() body: CreateDocumentsDto, @GetAuthUser() user: User) {
    return this.documentService.create(body, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateDocumentDto) {
    return this.documentService.update(id, body);
  }

  @Get('organizational-units/tree')
  getOrganizationalUnits() {
    return this.organizationalUnitService.getTree({ onlyActive: true });
  }

  @Get('types')
  getDocumentTypes() {
    return this.documentTypeService.getActiveTypesWithSubtypes();
  }
}
