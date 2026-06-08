import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateDocumentTypeDto, UpdateDocumentTypeDto } from '../dtos';
import { ProtectedResource } from 'src/modules/auth/decorators';
import { DocumentTypeService } from '../services';
import { Resource } from 'src/modules/users/entities';

@ProtectedResource(Resource.DOCUMENTS)
@Controller('document-types')
export class DocumentTypeController {
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
