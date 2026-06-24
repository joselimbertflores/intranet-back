import { Transform, Type } from 'class-transformer';
import { IsInt, IsPositive, Min, Max, IsOptional, IsString, MaxLength } from 'class-validator';

export class PaginationParamsDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Min(1)
  @Max(50)
  @IsOptional()
  readonly limit?: number = 10;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  readonly offset?: number = 0;

  @Transform(({ value }) => {
    if (typeof value !== 'string') return value as unknown;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  readonly term?: string;
}
