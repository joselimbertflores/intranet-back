import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateDirectorySiteDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ValidateIf((dto: CreateDirectorySiteDto) => dto.latitude != null || dto.longitude != null)
  @IsDefined()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number | null;

  @ValidateIf((dto: CreateDirectorySiteDto) => dto.latitude != null || dto.longitude != null)
  @IsDefined()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number | null;
}

export class UpdateDirectorySiteDto extends PartialType(CreateDirectorySiteDto) {}
