import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateDocumentTypeDto, UpdateDocumentTypeDto } from '../dtos';
import { DocumentTypeService } from '../services';

@Controller('document-types')
export class DocumentCategoryController {
  constructor(private documentTypeService: DocumentTypeService) {}

  @Get()
  findAll() {
    return this.documentTypeService.findAll();
  }

  @Post()
  create(@Body() body: CreateDocumentTypeDto) {
    return this.documentTypeService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateDocumentTypeDto) {
    return this.documentTypeService.update(+id, body);
  }

  @Delete('subtype/:id')
  removeSubtype(@Param('id') id: string) {
    return this.documentTypeService.removeSubtype(+id);
  }
}
