import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import {
  CreateDirectoryEntryDto,
  CreateDirectorySiteDto,
  DirectorySearchDto,
  UpdateDirectoryEntryDto,
  UpdateDirectorySiteDto,
} from './dtos';
import { ProtectedResource } from '../auth/decorators';
import { Resource } from '../users/entities';
import { DirectoryEntriesService, DirectorySitesService } from './services';

@ProtectedResource(Resource.DIRECTORY)
@Controller('directory')
export class DirectoryController {
  constructor(
    private readonly directoryEntriesService: DirectoryEntriesService,
    private readonly directorySitesService: DirectorySitesService,
  ) {}

  @Get()
  findAll(@Query() query: DirectorySearchDto) {
    return this.directoryEntriesService.findAll(query);
  }

  @Get('area-names')
  findAreaNames() {
    return this.directoryEntriesService.findAreaNames();
  }

  @Get('sites')
  findSites() {
    return this.directorySitesService.findAll();
  }

  @Post('sites')
  createSite(@Body() dto: CreateDirectorySiteDto) {
    return this.directorySitesService.create(dto);
  }

  @Patch('sites/:id')
  updateSite(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDirectorySiteDto) {
    return this.directorySitesService.update(id, dto);
  }

  @Delete('sites/:id')
  removeSite(@Param('id', ParseIntPipe) id: number) {
    return this.directorySitesService.remove(id);
  }

  @Post()
  create(@Body() dto: CreateDirectoryEntryDto) {
    return this.directoryEntriesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDirectoryEntryDto) {
    return this.directoryEntriesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.directoryEntriesService.remove(id);
  }
}
