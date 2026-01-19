import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { DocumentTypeService } from '../services';
import { CreateDocumentTypeDto, UpdateDocumentTypeDto } from '../dtos';

@Controller('document-type')
export class DocumentCategoryController {
  constructor(private documentTypeService: DocumentTypeService) {}

  @Get('categories')
  getCategories() {
    return this.documentTypeService.findAll();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateDocumentTypeDto) {
    return this.documentTypeService.update(+id, body);
  }

  @Post()
  create(@Body() body: CreateDocumentTypeDto) {
    return this.documentTypeService.create(body);
  }

  @Get()
  findAll() {
    return this.documentTypeService.findAll();
  }

  @Delete('subtype/:id')
  removeSubtype(@Param('id') id: string) {
    return this.documentTypeService.removeSubtype(+id);
  }
}
