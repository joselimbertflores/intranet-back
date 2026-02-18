import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { EntityManager, ILike, Repository } from 'typeorm';
import { RRule, rrulestr } from 'rrule';

import { CalendarEvent } from './entities';
import { CreateCalendarEventDto, RecurrenceConfigDto, UpdateCalendarEventDto } from './dtos';
import { PaginationParamsDto } from '../common';
import { CommunicationService } from '../communications/communication.service';
import { Communication } from '../communications/entities';

function overlapsRange(evStart: Date, evEnd: Date | null, rangeStart: Date, rangeEnd: Date) {
  const end = evEnd ?? evStart; // si no hay endDate, se considera instante
  return evStart < rangeEnd && end > rangeStart;
}

function addMs(date: Date, ms: number) {
  return new Date(date.getTime() + ms);
}

// Helpers
function toRRuleDate(date: Date) {
  // formato UTC: YYYYMMDDTHHMMSSZ
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

function mapFreq(freq: string) {
  switch (freq) {
    case 'DAILY':
      return RRule.DAILY;
    case 'WEEKLY':
      return RRule.WEEKLY;
    case 'MONTHLY':
      return RRule.MONTHLY;
    case 'YEARLY':
      return RRule.YEARLY;
    default:
      return RRule.WEEKLY;
  }
}

function mapWeekdays(days?: string[]) {
  if (!days?.length) return undefined;
  const m: Record<string, any> = {
    MO: RRule.MO,
    TU: RRule.TU,
    WE: RRule.WE,
    TH: RRule.TH,
    FR: RRule.FR,
    SA: RRule.SA,
    SU: RRule.SU,
  };
  return days.map((d) => m[d]).filter(Boolean);
}

export interface CalendarOccurrenceDto {
  id: string; // id único por ocurrencia
  parentId: string; // id del evento maestro (útil para editar)
  title: string;
  start: string; // ISO
  end?: string; // ISO
  allDay: boolean;
  description?: string;
  communicationId?: string;
}

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

    let communication: Communication | null = null;
    if (communicationId) {
      communication = await this.communicationService.findByIdOrFail(communicationId);

      const existing = await this.eventRepository.findOne({ where: { communication: { id: communication.id } } });
      if (existing) throw new BadRequestException('This communication already has an associated event');
    }

    const model = this.eventRepository.create({ ...props, ...(communication && { communication }) });
    if (recurrence) {
      model.recurrenceConfig = recurrence;
      model.recurrenceRule = this.buildRRule(recurrence, dto.startDate);
    }
    return await this.eventRepository.save(model);
  }

  async update(id: string, dto: UpdateCalendarEventDto) {
    const event = await this.eventRepository.findOneBy({ id });

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
    return this.eventRepository.save({ ...event, ...props });
  }

  async getOne(id: string) {
    return await this.eventRepository.findOneBy({ id });
  }

  async setCommunicationState(communicationId: string, isActive: boolean) {
    const communication = await this.communicationService.findByIdOrFail(communicationId);
    if (communication.isActive === isActive) return;
    await this.communicationService.setActiveState(communicationId, isActive);
    await this.eventRepository.update({ communication: { id: communicationId } }, { isActive });
    return { ok: true, message: isActive ? 'Communication activated' : 'Communication deactivated' };
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

  async getOccurrences(rangeStart: Date, rangeEnd: Date): Promise<CalendarOccurrenceDto[]> {
    // 1) Trae eventos “maestros” que podrían aparecer en el rango
    // OJO: para recurrentes, startDate puede ser antiguo pero igual aplica.
    const masters = await this.eventRepository.find({
      relations: { communication: true },
    });

    const out: CalendarOccurrenceDto[] = [];

    for (const ev of masters) {
      // NO recurrente
      if (!ev.recurrenceRule && !ev.recurrenceConfig) {
        if (overlapsRange(ev.startDate, ev.endDate ?? null, rangeStart, rangeEnd)) {
          out.push({
            id: ev.id,
            parentId: ev.id,
            title: ev.title,
            start: ev.startDate.toISOString(),
            end: ev.endDate?.toISOString(),
            allDay: ev.allDay,
            description: ev.description,
            communicationId: ev.communication?.id,
          });
        }
        continue;
      }

      // Recurrente (regla)
      // Recomendación: usa recurrenceRule como fuente principal si existe.
      // Asegúrate de que la regla tenga DTSTART (o lo fuerzas desde startDate).
      const durationMs = ev.endDate ? ev.endDate.getTime() - ev.startDate.getTime() : 0;

      let rule: RRule;

      if (ev.recurrenceRule) {
        // Si tu RRULE no incluye DTSTART, rrulestr usa "now" por defecto => malo.
        // Solución simple: si no trae DTSTART, la prependes.
        const hasDtStart = /DTSTART/i.test(ev.recurrenceRule);
        const rruleStr = hasDtStart
          ? ev.recurrenceRule
          : `DTSTART:${toRRuleDate(ev.startDate)}\nRRULE:${ev.recurrenceRule.replace(/^RRULE:/i, '')}`;

        rule = rrulestr(rruleStr) as RRule;
      } else {
        // Si solo tienes recurrenceConfig, construyes RRule desde ahí.
        rule = new RRule({
          freq: mapFreq(ev.recurrenceConfig!.frequency),
          interval: ev.recurrenceConfig!.interval ?? 1,
          byweekday: mapWeekdays(ev.recurrenceConfig!.byWeekDays),
          dtstart: ev.startDate,
          // until: opcional si lo manejas
        });
      }

      // 2) Expande dentro del rango
      const dates = rule.between(rangeStart, rangeEnd, true);

      for (const d of dates) {
        const occStart = d;
        const occEnd = durationMs > 0 ? addMs(occStart, durationMs) : undefined;

        out.push({
          id: `${ev.id}__${occStart.toISOString()}`,
          parentId: ev.id,
          title: ev.title,
          start: occStart.toISOString(),
          end: occEnd?.toISOString(),
          allDay: ev.allDay,
          description: ev.description,
          communicationId: ev.communication?.id,
        });
      }
    }

    return out;
  }
}
