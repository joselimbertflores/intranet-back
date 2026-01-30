import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import { RRule } from 'rrule';

import { CalendarEvent } from './entities';
import { CreateCalendarEventDto, RecurrenceConfigDto, UpdateCalendarEventDto } from './dtos';
import { PaginationParamsDto } from '../common';

@Injectable()
export class CalendarService {
  constructor(@InjectRepository(CalendarEvent) private eventRepository: Repository<CalendarEvent>) {}

  async findAll({ limit, offset }: PaginationParamsDto) {
    const [events, total] = await this.eventRepository.findAndCount({
      where: { isActive: true },
      skip: offset,
      take: limit,
      order: { createdAt: 'desc' },
    });
    console.log(events);
    return { events, total };
  }

  async create(dto: CreateCalendarEventDto) {
    const { recurrence, ...props } = dto;
    const model = this.eventRepository.create({ ...props });
    if (recurrence) {
      model.recurrenceConfig = recurrence;
      model.recurrenceRule = this.buildRRule(recurrence, dto.startDate);
    }
    const event = this.eventRepository.create(model);
    const result = await this.eventRepository.save(event);
    console.log(result);
    return result;
  }

  async update(id: string, dto: UpdateCalendarEventDto) {
    const event = await this.eventRepository.findOneBy({ id });

    if (!event) throw new NotFoundException('Event not found');
    const { recurrence, ...props } = dto;

    Object.assign(event, {
      ...dto,
      // startDate: dto.startDate ? dto.startDate : event.startDate,
      // endDate: dto.endDate ? dto.endDate : event.endDate,
    });

    if ('recurrence' in dto && recurrence === null) {
      event.recurrenceConfig = null;
      event.recurrenceRule = null;
    }

    // actualizar recurrencia o regenerar si cambia startDate
    if (recurrence || (dto.startDate && event.recurrenceConfig)) {
      const config = recurrence! ?? event.recurrenceConfig;
      event.recurrenceConfig = config;
      event.recurrenceRule = this.buildRRule(config, event.startDate);
    }
    return this.eventRepository.save(event);
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
}
