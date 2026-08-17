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
} from '@nestjs/common';
import {
  CreateDirectoryEntryDto,
  CreateDirectorySiteDto,
  UpdateDirectoryEntryDto,
  UpdateDirectorySiteDto,
} from './dtos';
import { DirectoryEntriesService, DirectorySitesService } from './services';
import { ProtectedResource } from '../auth/decorators';
import { Resource } from '../users/entities';

@ProtectedResource(Resource.DIRECTORY)
@Controller('directory')
export class DirectoryController {
  constructor(
    private directoryEntriesService: DirectoryEntriesService,
    private directorySitesService: DirectorySitesService,
  ) {}

  @Get()
  findAll() {
    return this.directoryEntriesService.findAll();
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
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.directoryEntriesService.remove(id);
  }
}
