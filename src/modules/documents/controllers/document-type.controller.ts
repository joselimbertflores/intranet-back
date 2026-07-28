import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateDocumentTypeDto, UpdateDocumentTypeDto } from '../dtos';
import { ProtectedResource } from 'src/modules/auth/decorators';
import { DocumentTypeService } from '../services';
import { Resource } from 'src/modules/users/entities';
import { PaginationParamsDto } from 'src/common/dtos';

@ProtectedResource(Resource.DOCUMENTS)
@Controller('document-types')
export class DocumentTypeController {
  constructor(private readonly documentTypeService: DocumentTypeService) {}

  @Get()
  findAll(@Query() queryParams: PaginationParamsDto) {
    return this.documentTypeService.findAll(queryParams);
  }

  @Post()
  create(@Body() body: CreateDocumentTypeDto) {
    return this.documentTypeService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateDocumentTypeDto) {
    return this.documentTypeService.update(+id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.documentTypeService.remove(+id);
  }
}
