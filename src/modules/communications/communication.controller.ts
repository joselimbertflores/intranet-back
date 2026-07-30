import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';

import { CreateCommunicationDto, UpdateCommunicationDto } from './dtos';
import { CommunicationsService } from './communications.service';
import { PaginationParamsDto } from '../../common/dtos';
import { ProtectedResource } from '../auth/decorators';
import { Resource } from '../users/entities';

@ProtectedResource(Resource.COMMUNICATIONS)
@Controller('communications')
export class CommunicationController {
  constructor(private readonly communicationsService: CommunicationsService) {}

  @Get()
  findAll(@Query() queryParams: PaginationParamsDto) {
    return this.communicationsService.findAll(queryParams);
  }

  @Post()
  create(@Body() body: CreateCommunicationDto) {
    return this.communicationsService.create(body);
  }

  @Patch('/:id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateCommunicationDto) {
    return this.communicationsService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.communicationsService.remove(id);
  }

  @Get('types')
  getTypes() {
    return this.communicationsService.getTypes();
  }
}
