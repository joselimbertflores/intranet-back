import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

import { TutorialBlockType } from '../entities';

const trimString = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);

const trimOrNull = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  return value.trim() || null;
};

export class CreateTutorialBlockDto {
  @IsEnum(TutorialBlockType)
  type: TutorialBlockType;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @Transform(trimString)
  content?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsUUID()
  fileId?: string;
}

export class UpdateTutorialBlockDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @Transform(trimString)
  content?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsUUID()
  fileId?: string;
}

export class CreateTutorialDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @Transform(trimOrNull)
  @IsOptional()
  @IsString()
  summary?: string | null;

  @IsOptional()
  @IsInt()
  categoryId?: number | null;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class UpdateTutorialDto extends PartialType(CreateTutorialDto) {}

export class ReorderTutorialBlocksDto {
  @IsArray()
  @IsUUID(undefined, { each: true })
  @ArrayUnique({ message: 'Duplicate block IDs are not allowed' })
  blockIds: string[];
}
