import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';

import { CreateCommunicationDto, UpdateCommunicationDto } from './dtos';
import { CommunicationsService } from './communications.service';
import { PaginationParamsDto } from '../common';
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

  @Get('types')
  getTypes() {
    return this.communicationsService.getTypes();
  }
}
