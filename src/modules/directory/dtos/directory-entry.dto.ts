import { PartialType } from '@nestjs/mapped-types';
import { Transform, TransformFnParams, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
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

const normalizeStringArray = ({ value }: TransformFnParams): unknown => {
  if (value === null) {
    return value;
  }

  if (!Array.isArray(value)) {
    return value;
  }

  return value
    .map((item: unknown) => (typeof item === 'string' ? item.trim() : item))
    .filter((item: unknown) => item !== '');
};

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

  @IsOptional()
  @Transform(normalizeStringArray)
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  extensions?: string[];

  @Transform(normalizeStringArray)
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  @ArrayUnique()
  phones?: string[];

  @IsOptional()
  @Transform(trim)
  @IsEmail()
  @MaxLength(160)
  email?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  siteId?: number ;

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
