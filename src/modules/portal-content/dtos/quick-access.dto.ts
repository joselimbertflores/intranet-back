import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);
const trimOrNull = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  return value.trim() || null;
};

export class CreateQuickAccessDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @Transform(trimString)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(trimOrNull)
  description?: string | null;

  @IsUUID()
  imageFileId: string;

  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'backgroundColor must be a valid hexadecimal color like #477998',
  })
  @Transform(({ value }): unknown => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  backgroundColor: string;

  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    require_valid_protocol: true,
    require_host: true,
    require_tld: false,
    allow_protocol_relative_urls: false,
    disallow_auth: true,
  })
  url: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateQuickAccessDto extends PartialType(CreateQuickAccessDto) {}

export class ReorderQuickAccessesDto {
  @IsArray()
  @ArrayUnique({
    message: 'Duplicate quick access IDs are not allowed',
  })
  @IsInt({ each: true })
  @Min(1, { each: true })
  ids: number[];
}
