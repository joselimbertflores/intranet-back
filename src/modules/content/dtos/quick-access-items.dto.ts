import { Transform, Type } from 'class-transformer';
import {
  Min,
  IsInt,
  IsUrl,
  Matches,
  IsArray,
  IsString,
  IsNotEmpty,
  IsBoolean,
  MaxLength,
  IsOptional,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';

export class QuickAccessItemDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  id?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^pi pi-[a-z0-9-]+$/, {
    message: 'icon debe ser un PrimeIcon válido, ej: "pi pi-envelope"',
  })
  icon: string;

  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @Transform(({ value }): string => (typeof value === 'string' ? value.trim() : value))
  url: string;

  @IsOptional()
  @IsBoolean()
  openInNewTab?: boolean = true;
}
export class ReplaceQuickAccessDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuickAccessItemDto)
  items: QuickAccessItemDto[];
}
