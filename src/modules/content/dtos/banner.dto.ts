import { Transform, Type } from 'class-transformer';
import {
  ValidateNested,
  ArrayMinSize,
  IsNotEmpty,
  IsArray,
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsUrl,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
  ArrayMaxSize,
} from 'class-validator';
import { BannerLinkType } from '../entities';

export class HeroSlideDto {
  @IsString()
  @IsNotEmpty()
  image: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  redirectUrl?: string;
}

export class ReplaceHeroSlideDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => HeroSlideDto)
  slides: HeroSlideDto[];
}

export class BannerItemDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  /**
   * Obligatorio en creación.
   * En update lo puedes mandar igual (simple) o hacerlo opcional.
   * Aquí lo dejo opcional y lo validamos en service si id no viene.
   */
  @IsUUID()
  @IsOptional()
  imageId?: string;

  @IsOptional()
  @IsEnum(BannerLinkType)
  linkType?: BannerLinkType = BannerLinkType.INTERNAL;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }): unknown => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  url?: string;

  @IsOptional()
  @IsBoolean()
  openInNewTab?: boolean = false;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class ReplaceBannersDto {
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => BannerItemDto)
  items: BannerItemDto[];
}
