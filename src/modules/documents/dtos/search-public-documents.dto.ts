import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaginationParamsDto } from 'src/common/dtos';

export class SearchPublicDocumentsDto extends PaginationParamsDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  organizationalUnit?: string;

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
