import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { DocumentTypeService, DocumentSectionService } from '../services';
import { CreateSectionDto } from '../dtos';

@Controller('document-sections')
export class DocumentSectionController {
  constructor(
    private documentSectionService: DocumentSectionService,
    private documentTypeService: DocumentTypeService,
  ) {}

  @Get('types')
  getDocumentTypes() {
    return this.documentTypeService.getActiveTypes();
  }

  @Get()
  findAll() {
    return this.documentSectionService.findAll();
  }

  @Post()
  create(@Body() body: CreateSectionDto) {
    return this.documentSectionService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: CreateSectionDto) {
    return this.documentSectionService.update(+id, body);
  }
}
