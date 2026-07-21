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
  ValidateIf,
  ArrayUnique,
} from 'class-validator';
import { ArrayUniqueBy } from 'src/common/validation/decorators';

const absoluteOrInternalPathRegex = /^(https?:\/\/[^\s]+|\/(?!\/)[^\s]*)$/i;
const optionalTrimmedString = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  return value.trim() || null;
};
const hasLink = (dto: FeaturedBannerBatchItemDto): boolean => dto.linkLabel != null || dto.linkUrl != null;

export class FeaturedBannerBatchItemDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  id?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @Transform(({ value }): unknown => (typeof value === 'string' ? value.trim() : value))
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(optionalTrimmedString)
  description?: string | null;

  @ValidateIf(hasLink)
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  @Transform(optionalTrimmedString)
  linkLabel?: string | null;

  @ValidateIf(hasLink)
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  @Matches(absoluteOrInternalPathRegex, {
    message: 'linkUrl must be an absolute http(s) URL or an internal path like /documents',
  })
  @Transform(optionalTrimmedString)
  linkUrl?: string | null;

  @IsUUID()
  imageId: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SaveFeaturedBannersBatchDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => FeaturedBannerBatchItemDto)
  @ArrayUniqueBy<FeaturedBannerBatchItemDto>((item) => item.id, {
    ignoreNullish: true,
    message: 'Duplicate featured banner IDs are not allowed in the payload',
  })
  @ArrayUnique((item: FeaturedBannerBatchItemDto) => item.imageId, {
    message: 'Duplicate featured banner image IDs are not allowed',
  })
  items: FeaturedBannerBatchItemDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @ArrayUnique({
    message: 'Duplicate deleted featured banner IDs are not allowed',
  })
  deletedIds?: number[];
}
