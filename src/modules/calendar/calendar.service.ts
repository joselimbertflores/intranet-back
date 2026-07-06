import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { EntityManager, ILike, Repository } from 'typeorm';
import { RRule, rrulestr } from 'rrule';
import { addDays, startOfDay } from 'date-fns';

import { CalendarEvent } from './entities';
import { CreateCalendarEventDto, RecurrenceConfigDto, UpdateCalendarEventDto } from './dtos';
import { PaginationParamsDto } from '../common';
import { CommunicationService } from '../communications/communication.service';
import { Communication } from '../communications/entities';

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

    let communication: Communication | null = null;
    if (communicationId) {
      communication = await this.communicationService.findByIdOrFail(communicationId);

      const existing = await this.eventRepository.findOne({ where: { communication: { id: communication.id } } });
      if (existing) throw new BadRequestException('This communication already has an associated event');
    }

    const model = this.eventRepository.create({
      ...props,
      startDate,
      endDate,
      ...(communication && { communication }),
    });
    if (recurrence) {
      model.recurrenceConfig = recurrence;
      model.recurrenceRule = this.buildRRule(recurrence, dto.startDate);
    }
    return await this.eventRepository.save(model);
  }

  async update(id: string, dto: UpdateCalendarEventDto) {
    const event = await this.eventRepository.findOneBy({ id });

    if (!event) throw new NotFoundException('Event not found');
    const { recurrence: newRecurrence, startDate, endDate, ...props } = dto;

    const start = startDate ?? event.startDate;
    const end = endDate ?? event.endDate;
    const allDay = dto.allDay ?? event.allDay;

    const normalized = this.normalizeDates(start, end, allDay);

    event.startDate = normalized.startDate;
    event.endDate = normalized.endDate;

    if ('recurrence' in dto && newRecurrence === null) {
      event.recurrenceConfig = null;
      event.recurrenceRule = null;
    }

    if (newRecurrence || (dto.startDate && event.recurrenceConfig)) {
      const newConfigRecurrence = newRecurrence! ?? event.recurrenceConfig;
      event.recurrenceConfig = newConfigRecurrence;
      event.recurrenceRule = this.buildRRule(newConfigRecurrence, event.startDate);
    }

    Object.assign(event, props);

    return this.eventRepository.save(event);
  }

  async getOne(id: string) {
    return await this.eventRepository.findOneBy({ id });
  }

  async remove(id: string) {
    const result = await this.eventRepository.delete(id);
    return (result.affected ?? 0 > 0)
      ? { ok: true, message: 'Event deleted' }
      : { ok: false, message: 'Event not found' };
  }

  private buildRRule(config: RecurrenceConfigDto, startDate: Date): string {
    this.validateRecurrence(config, startDate);
    return new RRule({
      freq: RRule[config.frequency],
      interval: config.interval,
      byweekday: config.byWeekDays?.map((d) => RRule[d]),
      until: config.until,
      dtstart: startDate,
    }).toString();
  }

  private validateRecurrence(config: RecurrenceConfigDto, startDate: Date) {
    if (config.until && config.until <= startDate) {
      throw new BadRequestException('La fecha de finalización de recurrencia debe ser posterior a la fecha de inicio');
    }
  }

  private normalizeDates(start: Date, end: Date | undefined, allDay: boolean) {
    if (allDay) {
      const startDate = startOfDay(start);
      return {
        startDate: startDate,
        endDate: addDays(startDate, 1),
      };
    }

    if (!end) {
      throw new BadRequestException('endDate is required for timed events');
    }

    return {
      startDate: start,
      endDate: end,
    };
  }
}
