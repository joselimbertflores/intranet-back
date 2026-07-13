import { Controller, Get, Query } from '@nestjs/common';
import { Public } from 'src/modules/auth/decorators';
import { CalendarReadService } from 'src/modules/calendar/calendar-read.service';
import { GetCalendarRangeDto } from 'src/modules/calendar/dtos';

@Public()
@Controller('portal-calendar')
export class PortalCalendarController {
  constructor(private calendarReadService: CalendarReadService) {}

  @Get('events')
  getCalendarEvents(@Query() { start, end }: GetCalendarRangeDto) {
    return this.calendarReadService.getEventsInRange(new Date(start), new Date(end));
  }
}
