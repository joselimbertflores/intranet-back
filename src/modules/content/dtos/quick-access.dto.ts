import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { QUICK_ACCESS_ICON_KEYS } from '../entities';
import type { QuickAccessIconKey } from '../entities';

export class QuickAccessBatchItemDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  id?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(QUICK_ACCESS_ICON_KEYS)
  iconKey: QuickAccessIconKey;

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SaveQuickAccessesBatchDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => QuickAccessBatchItemDto)
  items: QuickAccessBatchItemDto[];
}
