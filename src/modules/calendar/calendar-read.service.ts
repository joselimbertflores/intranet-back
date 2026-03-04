import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { IsNull, LessThanOrEqual, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { RRule } from 'rrule';

import { PortalCalendarDto } from './types/interfaces/portal-calendar.interface';
import { CalendarEvent } from './entities';

@Injectable()
export class CalendarReadService {
  constructor(@InjectRepository(CalendarEvent) private eventRepo: Repository<CalendarEvent>) {}

  async getEventsInRange(start: Date, end: Date) {
    const [singleEvents, recurringEvents] = await Promise.all([
      this.getSingleEvents(start, end),
      this.getRecurringEvents(start, end),
    ]);
    return [...singleEvents, ...recurringEvents].sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
    );
  }

  private async getSingleEvents(start: Date, end: Date) {
    const events = await this.eventRepo
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.communication', 'communication')
      .leftJoinAndSelect('communication.type', 'type')
      .where('event.isActive = true')
      .andWhere('event.recurrenceRule IS NULL')
      .andWhere('event.startDate < :end', { end })
      .andWhere('event.endDate > :start', { start })
      .getMany();

    return events.map((event) => this.mapOccurrence(event, event.startDate, event.endDate));
  }

  private async getRecurringEvents(start: Date, end: Date) {
    const result = await this.eventRepo.find({
      where: {
        isActive: true,
        recurrenceRule: Not(IsNull()),
        startDate: LessThanOrEqual(end),
      },
      relations: {
        communication: {
          type: true,
        },
      },
    });
    return result.flatMap((event) => this.expandRecurringEvent(event, start, end));
  }

  private expandRecurringEvent(event: CalendarEvent, rangeStart: Date, rangeEnd: Date) {
    if (!event.recurrenceRule) return [];
    const rule = RRule.fromString(event.recurrenceRule);
    rule.options.dtstart = event.startDate;

    const durationMs = event.endDate.getTime() - event.startDate.getTime();

    return rule.between(rangeStart, rangeEnd, true).map((date) => {
      const start = date;
      const end = durationMs ? new Date(start.getTime() + durationMs) : undefined;

      return this.mapOccurrence(event, start, end);
    });
  }

  private mapOccurrence(event: CalendarEvent, start: Date, end?: Date): PortalCalendarDto {
    const isRecurring = !!event.recurrenceRule;
    return {
      // Generar ids distintos para eventos recurrentes
      id: isRecurring ? `${event.id}_${start.toISOString()}` : event.id,
      title: event.title,
      description: event.description,
      start: start,
      end: end,
      allDay: event.allDay,
      isRecurring,
      ...(event.communication && {
        communication: {
          id: event.communication.id,
          reference: event.communication.reference,
          code: event.communication.code,
          type: event.communication.type.name,
        },
      }),
    };
  }
}
