import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaginationParamsDto } from 'src/modules/common';

export class SearchPortalDocumentsDto extends PaginationParamsDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  organizationalUnit?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  documentType?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  documentSubtype?: string;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  year?: number;
}
