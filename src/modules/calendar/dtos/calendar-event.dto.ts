import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsDate,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import { IsAfterDate } from '../decorators';
import { RecurrenceFrequency, WeekDay } from '../entities';

export { RecurrenceFrequency, WeekDay };

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
  recurrence?: RecurrenceConfigDto | null;

  @IsOptional()
  @IsUUID()
  communicationId?: string | null;
}

export class UpdateCalendarEventDto extends PartialType(CreateCalendarEventDto) {}

export class GetCalendarRangeDto {
  @IsISO8601()
  start: string;

  @IsISO8601()
  @IsAfterDate('start')
  end: string;
}
