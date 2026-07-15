import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { DirectoryService } from './directory.service';
import {
  CreateDirectoryEntryDto,
  CreateDirectorySiteDto,
  DirectorySearchDto,
  UpdateDirectoryEntryDto,
  UpdateDirectorySiteDto,
} from './dtos';
import { ProtectedResource } from '../auth/decorators';
import { Resource } from '../users/entities';

@ProtectedResource(Resource.DIRECTORY)
@Controller('directory')
export class DirectoryController {
  constructor(private directoryService: DirectoryService) {}

  @Get()
  findAll(@Query() query: DirectorySearchDto) {
    return this.directoryService.findAll(query);
  }

  @Get('area-names')
  findAreaNames() {
    return this.directoryService.findAreaNames();
  }

  @Get('sites')
  findSites() {
    return this.directoryService.findSites();
  }

  @Post('sites')
  createSite(@Body() dto: CreateDirectorySiteDto) {
    return this.directoryService.createSite(dto);
  }

  @Patch('sites/:id')
  updateSite(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDirectorySiteDto) {
    return this.directoryService.updateSite(id, dto);
  }

  @Delete('sites/:id')
  removeSite(@Param('id', ParseIntPipe) id: number) {
    return this.directoryService.removeSite(id);
  }

  @Post()
  create(@Body() dto: CreateDirectoryEntryDto) {
    return this.directoryService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDirectoryEntryDto) {
    return this.directoryService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.directoryService.remove(id);
  }
}
