import { PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateDirectoryEntryDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  areaName: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(160)
  contactLabel?: string | null;

  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  extensions: string[];

  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  phones: string[];

  @IsOptional()
  @Transform(trim)
  @IsEmail()
  @MaxLength(160)
  email?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  siteId?: number | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  siteDetails?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateDirectoryEntryDto extends PartialType(CreateDirectoryEntryDto) {}
