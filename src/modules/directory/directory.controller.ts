import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { DirectoryService } from './directory.service';
import {
  CreateDirectoryContactDto,
  CreateDirectorySectionDto,
  GetDirectoryContactsDto,
  GetDirectorySectionsDto,
  UpdateDirectoryContactDto,
  UpdateDirectorySectionDto,
} from './dtos';

@Controller('directory')
export class DirectoryController {
  constructor(private readonly directoryService: DirectoryService) {}

  @Get('sections')
  findSections(@Query() query: GetDirectorySectionsDto) {
    return this.directoryService.findSections(query);
  }

  @Post('sections')
  createSection(@Body() dto: CreateDirectorySectionDto) {
    console.log(dto);
    return this.directoryService.createSection(dto);
  }
  @Get(`sections/:id/contacts`)
  getContacts(@Param('id', ParseUUIDPipe) id: string) {
    return this.directoryService.getContacts(id);
  }

  @Patch('sections/:id')
  updateSection(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDirectorySectionDto) {
    return this.directoryService.updateSection(id, dto);
  }

  @Get('contacts')
  findContacts(@Query() query: GetDirectoryContactsDto) {
    return this.directoryService.findContacts(query);
  }

  @Post('contacts')
  createContact(@Body() dto: CreateDirectoryContactDto) {
    return this.directoryService.createContact(dto);
  }

  @Patch('contacts/:id')
  updateContact(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDirectoryContactDto) {
    return this.directoryService.updateContact(id, dto);
  }

  @Get()
  getDirectory() {
    return this.directoryService.getDirectoryTree();
  }
}
