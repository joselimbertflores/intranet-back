import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { CalendarService } from './calendar.service';
import { CreateCalendarEventDto, UpdateCalendarEventDto } from './dtos';
import { PaginationParamsDto } from '../../common/dtos';
import { ProtectedResource, RequirePermissions } from '../auth/decorators';
import { Resource } from '../users/entities';

@ProtectedResource(Resource.CALENDAR)
@Controller(['calendar', 'calendar-events'])
export class CalendarController {
  constructor(private readonly eventService: CalendarService) {}

  @Get()
  findAll(@Query() query: PaginationParamsDto) {
    return this.eventService.findAll(query);
  }

  @Post()
  create(@Body() dto: CreateCalendarEventDto) {
    return this.eventService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCalendarEventDto) {
    return this.eventService.update(id, dto);
  }

  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventService.getOne(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventService.remove(id);
  }

  @Delete(':id/with-communication')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions({ resource: Resource.COMMUNICATIONS, actions: ['delete'] })
  removeWithCommunication(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventService.removeWithCommunication(id);
  }
}
