import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import { RRule } from 'rrule';

import { CalendarEvent } from './entities';
import { CreateCalendarEventDto, RecurrenceConfigDto, UpdateCalendarEventDto } from './dtos';

@Injectable()
export class CalendarService {
  constructor(@InjectRepository(CalendarEvent) private eventRepository: Repository<CalendarEvent>) {}

  async create(dto: CreateCalendarEventDto) {
    const { recurrence, ...props } = dto;
    const model = this.eventRepository.create({ ...props });
    if (recurrence) {
      model.recurrenceConfig = recurrence;
      model.recurrenceRule = this.buildRRule(recurrence, dto.startDate);
    }
    const event = this.eventRepository.create(model);
    return this.eventRepository.save(event);
  }

  async update(id: string, dto: UpdateCalendarEventDto) {
    const event = await this.eventRepository.findOneBy({ id });

    if (!event) throw new NotFoundException('Event not found');

    Object.assign(event, {
      ...dto,
      // startDate: dto.startDate ? dto.startDate : event.startDate,
      // endDate: dto.endDate ? dto.endDate : event.endDate,
    });

    return this.eventRepository.save(event);
  }

  private buildRRule(config: RecurrenceConfigDto, startDate: Date): string {
    this.validateRecurrence(config, startDate);
    return new RRule({
      freq: RRule[config.frequency],
      interval: config.interval,
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
