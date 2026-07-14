import { Controller, Get, Query } from '@nestjs/common';
import { Public } from 'src/modules/auth/decorators';
import { PublicCalendarService } from 'src/modules/calendar/public-calendar.service';
import { GetCalendarRangeDto } from 'src/modules/calendar/dtos';

@Public()
@Controller('portal-calendar')
export class PortalCalendarController {
  constructor(private readonly publicCalendarService: PublicCalendarService) {}

  @Get('events')
  getCalendarEvents(@Query() { start, end }: GetCalendarRangeDto) {
    return this.publicCalendarService.getEventsInRange(new Date(start), new Date(end));
  }
}
