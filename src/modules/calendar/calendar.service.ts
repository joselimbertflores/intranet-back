import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { DataSource, ILike, QueryFailedError, Repository } from 'typeorm';

import { CalendarEvent, RecurrenceConfig } from './entities';
import { CreateCalendarEventDto, RecurrenceConfigDto, RecurrenceFrequency, UpdateCalendarEventDto } from './dtos';
import { PaginationParamsDto } from '../../common/dtos';
import { CommunicationsService } from '../communications/communications.service';
import { Communication } from '../communications/entities';

const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;
const MILLISECONDS_PER_DAY = 24 * MILLISECONDS_PER_HOUR;
const INSTITUTIONAL_UTC_OFFSET_MS = -4 * MILLISECONDS_PER_HOUR;

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(CalendarEvent) private eventRepository: Repository<CalendarEvent>,
    private readonly communicationsService: CommunicationsService,
    private readonly dataSource: DataSource,
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
    const { communicationId, recurrence, startDate, endDate, allDay, ...props } = dto;
    const normalizedDates = this.normalizeDates(startDate, endDate, allDay);
    const recurrenceConfig = recurrence ? this.normalizeRecurrenceConfig(recurrence, normalizedDates.startDate) : null;
    const communication = await this.resolveCommunication(communicationId);

    const model = this.eventRepository.create({
      ...props,
      ...normalizedDates,
      allDay,
      recurrenceConfig,
      communication,
    });

    return this.saveEvent(model, communicationId);
  }

  async update(id: string, dto: UpdateCalendarEventDto) {
    const event = await this.eventRepository.findOneBy({ id });
    if (!event) throw new NotFoundException('Event not found');

    const { recurrence, startDate, endDate, allDay: newAllDay, communicationId, ...props } = dto;
    const allDay = newAllDay ?? event.allDay;
    const changesEventType = newAllDay !== undefined && newAllDay !== event.allDay;

    if (changesEventType && !allDay && endDate === undefined) {
      throw new BadRequestException('endDate is required when changing an all-day event to a timed event');
    }

    const effectiveEndDate = changesEventType ? endDate : (endDate ?? event.endDate);
    const normalizedDates = this.normalizeDates(startDate ?? event.startDate, effectiveEndDate, allDay);

    if (communicationId !== undefined) {
      const communication = await this.resolveCommunication(communicationId, event.id);
      event.communication = communication;
    }

    let recurrenceConfig = event.recurrenceConfig;
    if (recurrence === null) {
      recurrenceConfig = null;
    } else if (recurrence !== undefined) {
      recurrenceConfig = this.normalizeRecurrenceConfig(recurrence, normalizedDates.startDate);
    } else if (recurrenceConfig && (startDate !== undefined || newAllDay !== undefined)) {
      recurrenceConfig = this.normalizeRecurrenceConfig(recurrenceConfig, normalizedDates.startDate);
    }

    Object.assign(event, props, normalizedDates, { allDay, recurrenceConfig });
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

  async removeWithCommunication(eventId: string) {
    return this.dataSource.transaction(async (manager) => {
      const event = await manager.findOne(CalendarEvent, {
        where: { id: eventId },
        relations: { communication: true },
      });

      if (!event) throw new NotFoundException('Event not found');
      if (!event.communication) {
        throw new BadRequestException('Event has no associated communication');
      }

      const communicationId = event.communication.id;
      await manager.remove(event);
      await this.communicationsService.remove(communicationId, manager);
    });
  }

  private validateRecurrence(config: RecurrenceConfigDto | RecurrenceConfig, startDate: Date) {
    const isWeekly = config.frequency === RecurrenceFrequency.WEEKLY;

    if (isWeekly && !config.byWeekDays?.length) {
      throw new BadRequestException('byWeekDays is required for weekly recurrence');
    }
    if (!isWeekly && config.byWeekDays !== undefined) {
      throw new BadRequestException('byWeekDays is only valid for weekly recurrence');
    }

    const until = config.until instanceof Date ? config.until : config.until ? new Date(config.until) : undefined;
    if (until && until <= startDate) {
      throw new BadRequestException('until must be after startDate');
    }
  }

  private normalizeRecurrenceConfig(config: RecurrenceConfigDto | RecurrenceConfig, startDate: Date): RecurrenceConfig {
    this.validateRecurrence(config, startDate);

    const until = config.until instanceof Date ? config.until.toISOString() : config.until;

    return {
      frequency: config.frequency,
      interval: config.interval,
      ...(config.byWeekDays && { byWeekDays: [...config.byWeekDays] }),
      ...(until && { until }),
    };
  }

  private normalizeDates(startDate: Date, endDate: Date | undefined, allDay: boolean) {
    if (!allDay) {
      if (!endDate) throw new BadRequestException('endDate is required for timed events');

      this.validateDateRange(startDate, endDate);
      return { startDate, endDate };
    }

    const normalizedStart = this.startOfInstitutionalDay(startDate);
    const normalizedEnd = endDate
      ? this.startOfInstitutionalDay(endDate)
      : new Date(normalizedStart.getTime() + MILLISECONDS_PER_DAY);

    this.validateDateRange(normalizedStart, normalizedEnd);

    return {
      startDate: normalizedStart,
      endDate: normalizedEnd,
    };
  }

  private validateDateRange(startDate: Date, endDate: Date) {
    if (endDate <= startDate) {
      throw new BadRequestException('endDate must be after startDate');
    }
  }

  private startOfInstitutionalDay(date: Date): Date {
    const institutionalDate = new Date(date.getTime() + INSTITUTIONAL_UTC_OFFSET_MS);
    institutionalDate.setUTCHours(0, 0, 0, 0);
    return new Date(institutionalDate.getTime() - INSTITUTIONAL_UTC_OFFSET_MS);
  }

  private async resolveCommunication(
    communicationId: string | null | undefined,
    currentEventId?: string,
  ): Promise<Communication | null> {
    if (!communicationId) return null;

    const communication = await this.communicationsService.findByIdOrFail(communicationId);
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
