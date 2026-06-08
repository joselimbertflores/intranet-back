import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { DocumentSectionService } from '../services/document-section.service';
import { CreateSectionDto, UpdateSectionDto } from '../dtos';
import { DocumentSection } from '../entities/document-section.entity';
import { ProtectedResource } from 'src/modules/auth/decorators';
import { Resource } from 'src/modules/users/entities';

@ProtectedResource(Resource.DOCUMENTS)
@Controller('sections')
export class SectionController {
  constructor(private readonly sectionService: DocumentSectionService) {}

  @Post()
  create(@Body() createSectionDto: CreateSectionDto): Promise<DocumentSection> {
    return this.sectionService.create(createSectionDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSectionDto: UpdateSectionDto) {
    return this.sectionService.update(id, updateSectionDto);
  }

  @Get()
  getTree() {
    return this.sectionService.getTree();
  }
}
