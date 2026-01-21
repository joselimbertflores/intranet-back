import { Body, Controller, Get, Param, ParseIntPipe, Put, Query } from '@nestjs/common';
import { DocumentTypeService, DocumentSectionService, DocumentService } from '../services';
import { CreateDocumentsDto } from '../dtos';
import { PaginationDto } from 'src/modules/common';

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
  findAll(@Query() queryParams: PaginationDto) {
    return this.documentService.getDocumentsToManage(queryParams);
  }

  @Put('sync/:relationId')
  syncDocuments(@Param('relationId', ParseIntPipe) relationId: string, @Body() documentsDto: CreateDocumentsDto) {
    return this.documentService.syncDocuments(+relationId, documentsDto);
  }
}
