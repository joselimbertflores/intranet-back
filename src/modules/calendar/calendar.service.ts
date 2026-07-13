import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { ILike, QueryFailedError, Repository } from 'typeorm';
import { RRule } from 'rrule';

import { CalendarEvent, RecurrenceConfig } from './entities';
import {
  CreateCalendarEventDto,
  RecurrenceConfigDto,
  RecurrenceFrequency,
  UpdateCalendarEventDto,
  WeekDay,
} from './dtos';
import { PaginationParamsDto } from '../common';
import { CommunicationService } from '../communications/communication.service';
import { Communication } from '../communications/entities';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const INSTITUTIONAL_TIME_ZONE_OFFSET = '-04:00';

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(CalendarEvent) private eventRepository: Repository<CalendarEvent>,
    private communicationService: CommunicationService,
  ) {}

  async findAll({ limit, offset, term }: PaginationParamsDto) {
    const [events, total] = await this.eventRepository.findAndCount({
      ...(term && { where: { title: ILike(`%${term}%`) } }),
      skip: offset,
      take: limit,
      order: { createdAt: 'desc' },
    });
    return { events, total };
  }

  async create(dto: CreateCalendarEventDto) {
    const { communicationId, recurrence, ...props } = dto;
    const { startDate, endDate } = this.normalizeDates(dto.startDate, dto.endDate, dto.allDay);
    const communication = await this.resolveCommunication(communicationId);

    const model = this.eventRepository.create({
      ...props,
      startDate,
      endDate,
      communication,
      communicationId: communication?.id ?? null,
    });

    if (recurrence) {
      model.recurrenceConfig = recurrence;
      model.recurrenceRule = this.buildRRule(recurrence, startDate);
    }

    return this.saveEvent(model, communicationId);
  }

  async update(id: string, dto: UpdateCalendarEventDto) {
    const event = await this.eventRepository.findOneBy({ id });
    if (!event) throw new NotFoundException('Event not found');

    const { recurrence: newRecurrence, startDate, endDate, communicationId, ...props } = dto;
    const start = startDate ?? event.startDate;
    const end = endDate ?? event.endDate;
    const allDay = dto.allDay ?? event.allDay;
    const normalized = this.normalizeDates(start, end, allDay);

    event.startDate = normalized.startDate;
    event.endDate = normalized.endDate;

    if (communicationId !== undefined) {
      const communication = await this.resolveCommunication(communicationId, event.id);
      event.communication = communication;
      event.communicationId = communication?.id ?? null;
    }

    if ('recurrence' in dto && newRecurrence === null) {
      event.recurrenceConfig = null;
      event.recurrenceRule = null;
    }

    const mustRebuildRecurrence =
      newRecurrence !== undefined || dto.startDate !== undefined || dto.allDay !== undefined;
    const recurrenceConfig = newRecurrence ?? event.recurrenceConfig;

    if (recurrenceConfig && mustRebuildRecurrence) {
      event.recurrenceConfig = recurrenceConfig;
      event.recurrenceRule = this.buildRRule(recurrenceConfig, event.startDate);
    }

    Object.assign(event, props);
    return this.saveEvent(event, communicationId ?? event.communicationId);
  }

  async getOne(id: string) {
    const event = await this.eventRepository.findOneBy({ id });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async remove(id: string) {
    const result = await this.eventRepository.delete(id);
    if ((result.affected ?? 0) === 0) throw new NotFoundException('Event not found');
    return { ok: true, message: 'Event deleted' };
  }

  private buildRRule(config: RecurrenceConfigDto | RecurrenceConfig, startDate: Date): string {
    this.validateRecurrence(config, startDate);

    const frequencies: Record<string, number> = {
      [RecurrenceFrequency.DAILY]: RRule.DAILY,
      [RecurrenceFrequency.WEEKLY]: RRule.WEEKLY,
      [RecurrenceFrequency.MONTHLY]: RRule.MONTHLY,
      [RecurrenceFrequency.YEARLY]: RRule.YEARLY,
    };
    const weekDays = {
      [WeekDay.MO]: RRule.MO,
      [WeekDay.TU]: RRule.TU,
      [WeekDay.WE]: RRule.WE,
      [WeekDay.TH]: RRule.TH,
      [WeekDay.FR]: RRule.FR,
      [WeekDay.SA]: RRule.SA,
      [WeekDay.SU]: RRule.SU,
    };
    const until = config.until ? new Date(config.until) : undefined;

    return new RRule({
      freq: frequencies[config.frequency],
      interval: config.interval,
      byweekday: config.byWeekDays?.map((day) => weekDays[day as WeekDay]),
      until,
      dtstart: startDate,
    }).toString();
  }

  private validateRecurrence(config: RecurrenceConfigDto | RecurrenceConfig, startDate: Date) {
    const isWeekly = config.frequency === 'WEEKLY';

    if (isWeekly && !config.byWeekDays?.length) {
      throw new BadRequestException('byWeekDays is required for weekly recurrence');
    }
    if (!isWeekly && config.byWeekDays !== undefined) {
      throw new BadRequestException('byWeekDays is only valid for weekly recurrence');
    }

    const until = config.until ? new Date(config.until) : undefined;
    if (until && (!Number.isFinite(until.getTime()) || until <= startDate)) {
      throw new BadRequestException('La fecha de finalización de recurrencia debe ser posterior a la fecha de inicio');
    }
  }

  private normalizeDates(start: Date, end: Date | undefined, allDay: boolean) {
    if (allDay) {
      const startDate = this.startOfInstitutionalDay(start);
      const normalized = { startDate, endDate: new Date(startDate.getTime() + DAY_IN_MS) };
      this.validateDateRange(normalized.startDate, normalized.endDate);
      return normalized;
    }

    if (!end) throw new BadRequestException('endDate is required for timed events');

    this.validateDateRange(start, end);
    return { startDate: start, endDate: end };
  }

  private validateDateRange(start: Date, end: Date) {
    const startTime = start.getTime();
    const endTime = end.getTime();
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
      throw new BadRequestException('endDate must be after startDate');
    }
  }

  private startOfInstitutionalDay(date: Date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return new Date(`${year}-${month}-${day}T00:00:00${INSTITUTIONAL_TIME_ZONE_OFFSET}`);
  }

  private async resolveCommunication(
    communicationId: string | null | undefined,
    currentEventId?: string,
  ): Promise<Communication | null> {
    if (!communicationId) return null;

    const communication = await this.communicationService.findByIdOrFail(communicationId);
    const associatedEvent = await this.eventRepository.findOne({ where: { communicationId } });

    if (associatedEvent && associatedEvent.id !== currentEventId) {
      throw new ConflictException('This communication already has an associated event');
    }

    return communication;
  }

  private async saveEvent(event: CalendarEvent, communicationId?: string | null) {
    try {
      return await this.eventRepository.save(event);
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const code = (error.driverError as { code?: string }).code;
        if (code === '23505') {
          throw new ConflictException('This communication already has an associated event');
        }
        if (code === '23503' && communicationId) {
          throw new NotFoundException(`Communication ${communicationId} not found`);
        }
      }
      throw error;
    }
  }
}
