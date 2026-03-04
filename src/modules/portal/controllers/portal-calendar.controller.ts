import { Controller, Get, Query } from '@nestjs/common';
import { Public } from 'src/modules/auth/decorators';
import { CalendarReadService } from 'src/modules/calendar/calendar-read.service';

@Public()
@Controller('portal-calendar')
export class PortalCalendarController {
  constructor(private calendarReadService: CalendarReadService) {}

  @Get('events')
  getCalendarEvents(@Query('start') start: string, @Query('end') end: string) {
    return this.calendarReadService.getEventsInRange(new Date(start), new Date(end));
  }
}
