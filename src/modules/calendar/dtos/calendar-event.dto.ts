import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  ValidateNested,
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
  IsDate,
  IsEnum,
  IsInt,
  IsArray,
  ValidateIf,
  ArrayMinSize,
  Min,
  IsISO8601,
  IsUUID,
} from 'class-validator';

import { IsAfterDate } from '../decorators';

export enum RecurrenceFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export enum WeekDay {
  MO = 'MO',
  TU = 'TU',
  WE = 'WE',
  TH = 'TH',
  FR = 'FR',
  SA = 'SA',
  SU = 'SU',
}

export class RecurrenceConfigDto {
  @IsEnum(RecurrenceFrequency)
  frequency: RecurrenceFrequency;

  @IsInt()
  @Min(1)
  interval: number;

  @ValidateIf((o: RecurrenceConfigDto) => o.frequency === RecurrenceFrequency.WEEKLY)
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(WeekDay, { each: true })
  byWeekDays?: WeekDay[];

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  until?: Date;
}

export class CreateCalendarEventDto {
  @IsString()
  @MaxLength(150)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @IsAfterDate('startDate')
  endDate?: Date;

  @IsBoolean()
  allDay: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => RecurrenceConfigDto)
  recurrence?: RecurrenceConfigDto;

  @IsUUID()
  @IsOptional()
  communicationId?: string;
}

export class UpdateCalendarEventDto extends PartialType(CreateCalendarEventDto) {}

export class GetCalendarRangeDto {
  @IsISO8601()
  start: string;

  @IsISO8601()
  end: string;
}
