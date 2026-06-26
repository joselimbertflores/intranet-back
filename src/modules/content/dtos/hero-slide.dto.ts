import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const absoluteOrInternalPathRegex = /^(https?:\/\/[^\s]+|\/(?!\/)[^\s]*)$/i;

export class HeroSlideBatchItemDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  id?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Transform(({ value }): unknown => (typeof value === 'string' ? value.trim() : value))
  title: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }): unknown => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Transform(({ value }): unknown => (typeof value === 'string' ? value.trim() : value))
  linkLabel?: string;

  @IsOptional()
  @IsString()
  @Matches(absoluteOrInternalPathRegex, {
    message: 'linkUrl must be an absolute http(s) URL or an internal path like /documents',
  })
  @Transform(({ value }): unknown => (typeof value === 'string' ? value.trim() : value))
  linkUrl?: string;

  @IsUUID()
  fileId: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SaveHeroSlidesBatchDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => HeroSlideBatchItemDto)
  @ArrayMinSize(1)
  items: HeroSlideBatchItemDto[];
}
