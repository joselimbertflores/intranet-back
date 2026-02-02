import { PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { CreateCalendarEventDto } from 'src/modules/calendar/dtos';
import { PaginationParamsDto } from 'src/modules/common';

export class CreateCommunicationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  @Transform(({ value }) => (value as string).trim().toUpperCase())
  reference: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @Transform(({ value }) => (value as string).trim().toUpperCase())
  code: string;

  @IsString()
  @IsNotEmpty()
  originalName: string;

  @IsNotEmpty()
  @IsString()
  fileName: string;

  @IsNotEmpty()
  @IsString()
  thumbnailFileName: string;

  @Type(() => Number)
  @IsNumber()
  typeId: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateCalendarEventDto)
  calendarEvent?: CreateCalendarEventDto;
}

export class UpdateCommunicationDto extends PartialType(CreateCommunicationDto) {}

export class CreateTypeCommunicationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;
}

export class GetPublicCommunicationsDto extends PaginationParamsDto {
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  typeId?: number;
}
