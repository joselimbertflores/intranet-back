import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';

import { CreateCommunicationDto, UpdateCommunicationDto } from './dtos/communication.dto';
import { CommunicationService } from './communication.service';
import { PaginationParamsDto } from '../common';

@Controller('communications')
export class CommunicationController {
  constructor(private communicationService: CommunicationService) {}

  @Get('types')
  getTYpes() {
    return this.communicationService.getTypes();
  }

  @Post()
  create(@Body() body: CreateCommunicationDto) {
    return this.communicationService.create(body);
  }

  @Patch('/:id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateCommunicationDto) {
    return this.communicationService.update(id, body);
  }

  @Get()
  findAll(@Query() queryParams: PaginationParamsDto) {
    return this.communicationService.findAll(queryParams);
  }
}
