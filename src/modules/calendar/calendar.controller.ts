import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';

import { CalendarService } from './calendar.service';
import { CreateCalendarEventDto, GetCalendarRangeDto, UpdateCalendarEventDto } from './dtos';
import { PaginationParamsDto } from '../common';

@Controller('calendar')
export class EventController {
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
  update(@Param('id') id: string, @Body() dto: UpdateCalendarEventDto) {
    return this.eventService.update(id, dto);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.eventService.getOne(id);
  }

  @Patch('communications/:id/deactivate')
  setCommunicationState(@Param('id') id: string, @Body() dto: { isActive: boolean }) {
    return this.eventService.setCommunicationState(id, dto.isActive);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.eventService.remove(id);
  }

  @Get('list')
  async list(@Query() q: GetCalendarRangeDto) {
    const rangeStart = new Date(q.start);
    const rangeEnd = new Date(q.end);
    return this.eventService.getOccurrences(rangeStart, rangeEnd);
  }
}
