import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateEventDto, UpdateEventDto } from './dtos/event.dto';
import { Event } from './entities/event.entity';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) {}

  async create(dto: CreateEventDto): Promise<Event> {
    const event = this.eventRepository.create(dto);
    return this.eventRepository.save(event);
  }

  async findAllAdmin(): Promise<Event[]> {
    return this.eventRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Event> {
    const event = await this.eventRepository.findOne({ where: { id } });
    if (!event) throw new NotFoundException(`Event #${id} not found`);
    return event;
  }

  async update(id: number, dto: UpdateEventDto): Promise<Event> {
    const event = await this.findOne(id);
    Object.assign(event, dto);
    return this.eventRepository.save(event);
  }

  async remove(id: number): Promise<void> {
    const event = await this.findOne(id);
    event.isActive = false;
    await this.eventRepository.save(event);
  }

  async deleteHard(id: number): Promise<void> {
    await this.eventRepository.delete(id);
  }

  async findByRange(start?: string, end?: string): Promise<Event[]> {
    const qb = this.eventRepository.createQueryBuilder('event');
    qb.where('event.isActive = true').andWhere('event.isPublic = true');

    if (start && end) {
      qb.andWhere('(event.startDate BETWEEN :start AND :end OR event.endDate BETWEEN :start AND :end)', { start, end });
    }

    // incluir recurrentes (RRULE)
    qb.orWhere('event.recurrenceRule IS NOT NULL');

    qb.orderBy('event.startDate', 'ASC');

    return qb.getMany();
  }
}
