import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateDocumentTypeDto, UpdateDocumentTypeDto } from '../dtos';
import { ProtectedResource } from 'src/modules/auth/decorators';
import { DocumentTypeService } from '../services';
import { Resource } from 'src/modules/users/entities';
import { PaginationParamsDto } from 'src/common/dtos';

@ProtectedResource(Resource.DOCUMENTS)
@Controller('document-types')
export class DocumentTypeController {
  constructor(private readonly typeService: DocumentTypeService) {}

  @Get()
  findAll(@Query() queryParams: PaginationParamsDto) {
    return this.typeService.findAll(queryParams);
  }

  @Post()
  create(@Body() body: CreateDocumentTypeDto) {
    return this.typeService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateDocumentTypeDto) {
    return this.typeService.update(+id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.typeService.remove(id);
  }
}
