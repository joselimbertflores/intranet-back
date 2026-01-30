import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';

import { CalendarService } from './calendar.service';
import { CreateCalendarEventDto } from './dtos';
import { PaginationParamsDto } from '../common';

@Controller('calendar')
export class EventController {
  constructor(private readonly eventService: CalendarService) {}

  @Post()
  create(@Body() dto: CreateCalendarEventDto) {
    return this.eventService.create(dto);
  }

  @Get()
  findAll(@Query() query: PaginationParamsDto) {
    return this.eventService.findAll(query);
  }
}
