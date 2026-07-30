import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { IsNull, LessThan, Not, Repository } from 'typeorm';
import { Frequency, RRule, Weekday as RRuleWeekday } from 'rrule';

import { PortalCalendarDto } from './types/interfaces/portal-calendar.interface';
import { CalendarEvent, RecurrenceConfig, RecurrenceFrequency, WeekDay } from './entities';

const MAX_RANGE_IN_MS = 366 * 24 * 60 * 60 * 1000;

@Injectable()
export class PublicCalendarService {
  constructor(@InjectRepository(CalendarEvent) private readonly eventsRepository: Repository<CalendarEvent>) {}

  async getEventsInRange(start: Date, end: Date) {
    this.validateRange(start, end);

    const [singleEvents, recurringEvents] = await Promise.all([
      this.getSingleEvents(start, end),
      this.getRecurringEvents(start, end),
    ]);
    return [...singleEvents, ...recurringEvents].sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
    );
  }

  private async getSingleEvents(start: Date, end: Date) {
    const events = await this.eventsRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.communication', 'communication')
      .leftJoinAndSelect('communication.type', 'type')
      .where('event.isActive = true')
      .andWhere('event.recurrenceConfig IS NULL')
      .andWhere('event.startDate < :end', { end })
      .andWhere('event.endDate > :start', { start })
      .getMany();

    return events.map((event) => this.mapOccurrence(event, event.startDate, event.endDate));
  }

  private async getRecurringEvents(start: Date, end: Date) {
    const result = await this.eventsRepository.find({
      where: {
        isActive: true,
        recurrenceConfig: Not(IsNull()),
        startDate: LessThan(end),
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
    if (!event.recurrenceConfig) return [];

    const durationMs = event.endDate.getTime() - event.startDate.getTime();
    const recurrenceSearchStart = new Date(rangeStart.getTime() - durationMs);
    const rule = this.buildRRule(event.recurrenceConfig, event.startDate);

    return rule
      .between(recurrenceSearchStart, rangeEnd, true)
      .map((start) => ({ start, end: new Date(start.getTime() + durationMs) }))
      .filter(({ start, end }) => start < rangeEnd && end > rangeStart)
      .map(({ start, end }) => this.mapOccurrence(event, start, end));
  }

  private buildRRule(config: RecurrenceConfig, startDate: Date) {
    const frequencies: Record<RecurrenceFrequency, Frequency> = {
      [RecurrenceFrequency.DAILY]: RRule.DAILY,
      [RecurrenceFrequency.WEEKLY]: RRule.WEEKLY,
      [RecurrenceFrequency.MONTHLY]: RRule.MONTHLY,
      [RecurrenceFrequency.YEARLY]: RRule.YEARLY,
    };
    const weekDays: Record<WeekDay, RRuleWeekday> = {
      [WeekDay.MO]: RRule.MO,
      [WeekDay.TU]: RRule.TU,
      [WeekDay.WE]: RRule.WE,
      [WeekDay.TH]: RRule.TH,
      [WeekDay.FR]: RRule.FR,
      [WeekDay.SA]: RRule.SA,
      [WeekDay.SU]: RRule.SU,
    };

    return new RRule({
      freq: frequencies[config.frequency],
      interval: config.interval,
      byweekday: config.byWeekDays?.map((day) => weekDays[day]),
      until: config.until ? new Date(config.until) : undefined,
      dtstart: startDate,
    });
  }

  private validateRange(start: Date, end: Date) {
    const startTime = start.getTime();
    const endTime = end.getTime();

    if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
      throw new BadRequestException('Invalid calendar range');
    }
    if (endTime - startTime > MAX_RANGE_IN_MS) {
      throw new BadRequestException('Calendar range cannot exceed 366 days');
    }
  }

  private mapOccurrence(event: CalendarEvent, start: Date, end?: Date): PortalCalendarDto {
    const isRecurring = !!event.recurrenceConfig;
    return {
      id: isRecurring ? `${event.id}_${start.toISOString()}` : event.id,
      title: event.title,
      description: event.description,
      start: start,
      end: end,
      allDay: event.allDay,
      isRecurring,
      ...(event.communication?.isActive && {
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
