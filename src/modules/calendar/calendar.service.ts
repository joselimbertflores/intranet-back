import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { EntityManager, ILike, Repository } from 'typeorm';
import { RRule } from 'rrule';

import { CalendarEvent } from './entities';
import { CreateCalendarEventDto, RecurrenceConfigDto, UpdateCalendarEventDto } from './dtos';
import { PaginationParamsDto } from '../common';

@Injectable()
export class CalendarService {
  constructor(@InjectRepository(CalendarEvent) private eventRepository: Repository<CalendarEvent>) {}

  async findAll({ limit, offset, term }: PaginationParamsDto) {
    const [events, total] = await this.eventRepository.findAndCount({
      ...(term && { where: { title: ILike(`%${term}%`) } }),
      skip: offset,
      take: limit,
      order: { createdAt: 'desc' },
    });
    return { events, total };
  }

  async create(dto: CreateCalendarEventDto, manager?: EntityManager) {
    const repository = manager ? manager.getRepository(CalendarEvent) : this.eventRepository;
    const { recurrence, ...props } = dto;
    const model = repository.create({ ...props });
    if (recurrence) {
      model.recurrenceConfig = recurrence;
      model.recurrenceRule = this.buildRRule(recurrence, dto.startDate);
    }
    const event = repository.create(model);
    return await repository.save(event);
  }

  async update(id: string, dto: UpdateCalendarEventDto, manager?: EntityManager) {
    const repository = manager ? manager.getRepository(CalendarEvent) : this.eventRepository;

    const event = await repository.findOneBy({ id });

    if (!event) throw new NotFoundException('Event not found');
    const { recurrence: newRecurrence, ...props } = dto;

    if ('recurrence' in dto && newRecurrence === null) {
      event.recurrenceConfig = null;
      event.recurrenceRule = null;
    }

    if (newRecurrence || (dto.startDate && event.recurrenceConfig)) {
      const newConfigRecurrence = newRecurrence! ?? event.recurrenceConfig;
      event.recurrenceConfig = newConfigRecurrence;
      event.recurrenceRule = this.buildRRule(newConfigRecurrence, event.startDate);
    }
    return repository.save({ ...event, ...props });
  }

  async remove(id: string) {
    const calendarEvent = await this.eventRepository.findOne({ where: { id }, relations: { communication: true } });
    if (!calendarEvent) throw new NotFoundException('Event not found');
    if (calendarEvent.communication) {
      throw new BadRequestException('Cannot delete event with communication associated');
    }
    const result = await this.eventRepository.delete({ id });
    return { message: (result.affected ?? 0 > 0) ? 'Event deleted' : 'Event not found' };
  }

  async removeEventFromCommunication(id: string, manager: EntityManager) {
    const repository = manager.getRepository(CalendarEvent);
    const result = await repository.delete({ id });
    return { ok: true, message: (result.affected ?? 0 > 0) ? 'Event deleted' : 'Event not found' };
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
