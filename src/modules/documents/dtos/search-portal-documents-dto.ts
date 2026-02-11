import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaginationParamsDto } from 'src/modules/common';

export class SearchPortalDocumentsDto extends PaginationParamsDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  section?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  type?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  subtype?: string;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  year?: number;
}
