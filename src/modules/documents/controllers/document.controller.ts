import { Body, Controller, Get, Param, ParseIntPipe, Put, Query } from '@nestjs/common';
import { DocumentTypeService, DocumentSectionService, DocumentService } from '../services';
import { CreateDocumentsDto } from '../dtos';
import { PaginationDto } from 'src/modules/common';

@Controller('documents')
export class DocumentController {
  constructor(
    private documentCategoryService: DocumentTypeService,
    private documentSectionService: DocumentSectionService,
    private documentService: DocumentService,
  ) {}

  @Get('categories-sections')
  getCategories() {
    return this.documentCategoryService.getCategoriesWithSections();
  }

  @Get('sections')
  getSections() {
    // return this.documentSectionService.getSections();
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
