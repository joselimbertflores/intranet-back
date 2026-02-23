import { Transform, Type } from 'class-transformer';
import {
  Min,
  IsInt,
  IsUrl,
  Matches,
  IsArray,
  IsString,
  IsNotEmpty,
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
  @Transform(({ value }): unknown => (typeof value === 'string' ? value.trim() : value))
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
  @Transform(({ value }): unknown => (typeof value === 'string' ? value.trim() : value))
  url: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }): unknown => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^#[0-9A-F]{6}$/, { message: 'color debe ser HEX #RRGGBB (ej: #2563EB)' })
  color?: string;
}
export class ReplaceQuickAccessDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuickAccessItemDto)
  items: QuickAccessItemDto[];
}
