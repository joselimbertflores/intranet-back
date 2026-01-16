import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { DocumentTypeService } from '../services';
import { CreateDocumentTypeDto, UpdateDocumentTypeDto } from '../dtos';

@Controller('document-type')
export class DocumentCategoryController {
  constructor(private categoryService: DocumentTypeService) {}

  @Get('categories')
  getCategories() {
    return this.categoryService.findAll();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateDocumentTypeDto) {
    return this.categoryService.update(+id, body);
  }

  @Post()
  create(@Body() body: CreateDocumentTypeDto) {
    return this.categoryService.create(body);
  }

  @Get()
  findAll() {
    return this.categoryService.findAll();
  }
}
