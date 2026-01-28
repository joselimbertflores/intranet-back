import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import { RRule } from 'rrule';

import { CalendarEvent } from './entities';
import { CreateCalendarEventDto, UpdateCalendarEventDto } from './dtos';

@Injectable()
export class CalendarService {
  constructor(@InjectRepository(CalendarEvent) private eventRepository: Repository<CalendarEvent>) {}

  async create(dto: CreateCalendarEventDto) {
    this.validateDates(dto.startDate, dto.endDate);

    if (dto.recurrenceRule) this.validateRRule(dto.recurrenceRule);
    

    const event = this.eventRepository.create({
      ...dto,
      startDate: dto.startDate,
      ...(dto.endDate && { endDate: dto.endDate }),
    });
    
    console.log(event);

    return this.eventRepository.save(event);
  }

  async update(id: string, dto: UpdateCalendarEventDto) {
    const event = await this.eventRepository.findOneBy({ id });

    if (!event) throw new NotFoundException('Event not found');

    if (dto.startDate) this.validateDates(dto.startDate, dto.endDate);

    if (dto.recurrenceRule) this.validateRRule(dto.recurrenceRule);

    Object.assign(event, {
      ...dto,
      startDate: dto.startDate ? dto.startDate : event.startDate,
      endDate: dto.endDate ? dto.endDate : event.endDate,
    });

    return this.eventRepository.save(event);
  }

  private validateRRule(rule: string) {
    try {
      RRule.fromString(rule);
    } catch {
      throw new BadRequestException('Invalid recurrence rule.');
    }
  }

  private validateDates(startDate: Date, endDate?: Date): void {
    if (endDate && endDate < startDate) {
      throw new BadRequestException("End date can't be before start date");
    }
  }
}
