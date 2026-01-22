import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { DocumentTypeService, DocumentSectionService } from '../services';
import { CreateSectionDto } from '../dtos';
import { PaginationParamsDto } from 'src/modules/common';

@Controller('document-sections')
export class DocumentSectionController {
  constructor(
    private sectionService: DocumentSectionService,
    private categoryService: DocumentTypeService,
  ) {}

  @Get('doc-types')
  getCategories() {
    return this.categoryService.getActiveTypes();
  }

  @Get()
  findAll() {
    return this.sectionService.findAll();
  }

  @Post()
  create(@Body() body: CreateSectionDto) {
    return this.sectionService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: CreateSectionDto) {
    return this.sectionService.update(+id, body);
  }
}
