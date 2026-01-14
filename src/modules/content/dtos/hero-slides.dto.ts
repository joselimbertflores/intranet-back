import { Type } from 'class-transformer';
import { ValidateNested, ArrayMinSize, IsNotEmpty, IsArray, IsString, IsNumber, IsOptional } from 'class-validator';

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
