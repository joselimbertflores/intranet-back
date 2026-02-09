import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { SectionService } from '../services/section.service';
import { CreateSectionDto, UpdateSectionDto } from '../dtos';
import { Section } from '../entities/section.entity';

@Controller('sections')
export class SectionController {
  constructor(private readonly sectionService: SectionService) {}

  @Post()
  create(@Body() createSectionDto: CreateSectionDto): Promise<Section> {
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
