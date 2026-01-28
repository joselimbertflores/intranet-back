import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsString, IsOptional, IsBoolean, MaxLength, IsDate } from 'class-validator';

import { IsRRule } from '../decorators';

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
  endDate?: Date;

  @IsBoolean()
  allDay: boolean;

  @IsOptional()
  @IsRRule({ message: 'Invalid recurrence rule.' })
  recurrenceRule?: string;
}

export class UpdateCalendarEventDto extends PartialType(CreateCalendarEventDto) {}
