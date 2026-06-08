import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { DirectoryService } from './directory.service';
import { CreateDirectoryEntryDto, UpdateDirectoryEntryDto } from './dtos';
import { ProtectedResource } from '../auth/decorators';
import { Resource } from '../users/entities';

@ProtectedResource(Resource.DIRECTORY)
@Controller('directory')
export class DirectoryController {
  constructor(private directoryService: DirectoryService) {}

  @Get()
  getTree() {
    return this.directoryService.findAllAdmin();
  }

  @Post()
  create(@Body() dto: CreateDirectoryEntryDto) {
    return this.directoryService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDirectoryEntryDto) {
    return this.directoryService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.directoryService.remove(id);
  }
}
