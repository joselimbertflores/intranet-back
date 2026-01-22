import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';

import { DocumentTypeService, DocumentSectionService, DocumentService } from '../services';
import { GetAuthUser } from 'src/modules/auth/decorators';
import { PaginationParamsDto } from 'src/modules/common';
import { User } from 'src/modules/users/entities';
import { CreateDocumentsDto } from '../dtos';

@Controller('documents')
export class DocumentController {
  constructor(
    private documentSectionService: DocumentSectionService,
    private documentTypeService: DocumentTypeService,
    private documentService: DocumentService,
  ) {}

  @Get('sections')
  getCategories() {
    return this.documentSectionService.getActiveSections();
  }

  @Get('types/:sectionId')
  getTypesBySection(@Param('sectionId', ParseIntPipe) sectionId: number) {
    return this.documentTypeService.getTypesBySection(sectionId);
  }

  @Get('subtypes/:typeId')
  getSubTypesByType(@Param('typeId', ParseIntPipe) typeId: number) {
    return this.documentTypeService.getSubTypesByType(typeId);
  }

  @Get()
  findAll(@Query() queryParams: PaginationParamsDto) {
    return this.documentService.findAll(queryParams);
  }

  @Put('sync/:relationId')
  syncDocuments(@Param('relationId', ParseIntPipe) relationId: string, @Body() documentsDto: CreateDocumentsDto) {
    return this.documentService.syncDocuments(+relationId, documentsDto);
  }

  @Post()
  create(@Body() body: CreateDocumentsDto, @GetAuthUser() user: User) {
    return this.documentService.create(body, user);
  }
}
