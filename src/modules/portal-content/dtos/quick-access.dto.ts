import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { QUICK_ACCESS_ICON_KEYS } from '../entities';
import type { QuickAccessIconKey } from '../entities';

const absoluteOrInternalPathRegex = /^(https?:\/\/[^\s]+|\/(?!\/)[^\s]*)$/i;
const trimString = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);
const trimOrNull = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  return value.trim() || null;
};

export class QuickAccessBatchItemDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  id?: number;

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

  @IsString()
  @IsIn(QUICK_ACCESS_ICON_KEYS)
  iconKey: QuickAccessIconKey;

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

export class SaveQuickAccessesBatchDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => QuickAccessBatchItemDto)
  items: QuickAccessBatchItemDto[];
}
