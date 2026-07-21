import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
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
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ArrayUniqueBy } from 'src/common/validation/decorators';

const absoluteOrInternalPathRegex = /^(https?:\/\/[^\s]+|\/(?!\/)[^\s]*)$/i;
const optionalTrimmedString = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  return value.trim() || null;
};

const isProvided = (value: unknown): boolean => value !== undefined && value !== null;
export const hasLink = (dto: HeroSlideBatchItemDto): boolean => isProvided(dto.linkLabel) || isProvided(dto.linkUrl);

export class HeroSlideBatchItemDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  id?: number;

  @Transform(({ value }): unknown => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  title: string;

  @Transform(optionalTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string | null;

  @Transform(optionalTrimmedString)
  @ValidateIf(hasLink)
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  linkLabel?: string | null;

  @Transform(optionalTrimmedString)
  @ValidateIf(hasLink)
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  @Matches(absoluteOrInternalPathRegex, {
    message: 'linkUrl must be an absolute http(s) URL or an internal path like /documents',
  })
  linkUrl?: string | null;

  @IsUUID()
  imageId: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SaveHeroSlidesBatchDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => HeroSlideBatchItemDto)
  @ArrayUniqueBy<HeroSlideBatchItemDto>((item) => item.id, {
    ignoreNullish: true,
    message: 'Duplicate hero slide IDs are not allowed in the payload',
  })
  @ArrayUnique((item: HeroSlideBatchItemDto) => item.imageId, {
    message: 'Duplicate hero slide image IDs are not allowed',
  })
  items: HeroSlideBatchItemDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @ArrayUnique({
    message: 'Duplicate deleted hero slide IDs are not allowed',
  })
  deletedIds?: number[];
}
