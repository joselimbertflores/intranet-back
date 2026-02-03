import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';

import { CalendarService } from './calendar.service';
import { CreateCalendarEventDto, UpdateCalendarEventDto } from './dtos';
import { PaginationParamsDto } from '../common';

@Controller('calendar')
export class EventController {
  constructor(private readonly eventService: CalendarService) {}

  @Post()
  create(@Body() dto: CreateCalendarEventDto) {
    return this.eventService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCalendarEventDto) {
    return this.eventService.update(id, dto);
  }

  @Get()
  findAll(@Query() query: PaginationParamsDto) {
    return this.eventService.findAll(query);
  }
}
