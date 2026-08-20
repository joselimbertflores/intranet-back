import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaginationParamsDto } from 'src/common/dtos';
import { DocumentValidityStatus } from '../entities';

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

  @IsEnum(DocumentValidityStatus)
  @IsOptional()
  validityStatus?: DocumentValidityStatus;
}
