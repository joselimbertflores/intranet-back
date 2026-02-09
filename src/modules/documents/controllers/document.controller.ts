import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { DocumentTypeService, DocumentService, SectionService } from '../services';
import { CreateDocumentsDto, NewFilterDocumentsDto, UpdateDocumentDto } from '../dtos';
import { GetAuthUser } from 'src/modules/auth/decorators';
import { User } from 'src/modules/users/entities';

@Controller('documents')
export class DocumentController {
  constructor(
    private sectionService: SectionService,
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

  @Get('sections/tree')
  getCategories() {
    return this.sectionService.getTree({ onlyActive: true });
  }

  @Get('types')
  getTypesBySection() {
    return this.documentTypeService.getActiveTypesWithSubtypes();
  }
}
