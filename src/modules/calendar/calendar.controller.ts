import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';

import { CalendarService } from './calendar.service';
import { CreateCalendarEventDto, GetCalendarRangeDto, UpdateCalendarEventDto } from './dtos';
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

  @Get('list')
  async list(@Query() q: GetCalendarRangeDto) {
    const rangeStart = new Date(q.start);
    const rangeEnd = new Date(q.end);
    return this.eventService.getOccurrences(rangeStart, rangeEnd);
  }
}
