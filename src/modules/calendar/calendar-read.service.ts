import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CalendarEvent } from './entities';
import { IsNull, LessThanOrEqual, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { RRule } from 'rrule';
import { PortalCalendarDto } from './types/interfaces/portal-calendar.interface';

@Injectable()
export class CalendarReadService {
  constructor(@InjectRepository(CalendarEvent) private eventRepo: Repository<CalendarEvent>) {}

  async getEventsInRange(rangeStart: Date, rangeEnd: Date) {
    const [singleEvents, recurringEvents] = await Promise.all([
      this.getSingleEvents(rangeStart, rangeEnd),
      this.getRecurringEvents(),
    ]);

    const expandedRecurring = recurringEvents.flatMap((event) =>
      this.expandRecurringEvent(event, rangeStart, rangeEnd),
    );

    return [...singleEvents, ...expandedRecurring];
  }

  private async getSingleEvents(rangeStart: Date, rangeEnd: Date) {
    const events = await this.eventRepo.find({
      where: {
        isActive: true,
        recurrenceRule: IsNull(),
        startDate: LessThanOrEqual(rangeEnd),
        ...(rangeStart && {
          endDate: MoreThanOrEqual(rangeStart),
        }),
      },
      relations: {
        communication: {
          type: true,
        },
      },
    });

    return events.map((event) => this.toDto(event));
  }

  private async getRecurringEvents(): Promise<CalendarEvent[]> {
    return this.eventRepo.find({
      where: {
        isActive: true,
        recurrenceRule: Not(IsNull()),
      },
      relations: {
        communication: {
          type: true,
        },
      },
    });
  }

  private toDto(event: CalendarEvent): PortalCalendarDto {
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      start: event.startDate.toISOString(),
      end: event.endDate?.toISOString(),
      allDay: event.allDay,
      isRecurring: event.recurrenceConfig !== null,
      ...(event.communication && {
        id: event.communication.id,
        reference: event.communication.reference,
        code: event.communication.code,
        type: event.communication.type.name,
      }),
    };
  }

  private expandRecurringEvent(event: CalendarEvent, rangeStart: Date, rangeEnd: Date) {
    const rule = RRule.fromString(event.recurrenceRule!);

    const durationMs = event.endDate ? event.endDate.getTime() - event.startDate.getTime() : 0;

    return rule.between(rangeStart, rangeEnd, true).map((date) => {
      const start = new Date(date);
      const end = durationMs ? new Date(start.getTime() + durationMs) : undefined;

      return this.toDto({ ...event,  });
    });
  }
}
