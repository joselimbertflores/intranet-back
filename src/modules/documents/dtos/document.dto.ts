import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationParamsDto } from 'src/modules/common';
import { DocumentStatus } from '../entities';
import { PartialType } from '@nestjs/mapped-types';

export class DocumentDto {
  @IsString()
  @IsNotEmpty()
  displayName: string;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @IsString()
  @IsNotEmpty()
  originalName: string;

  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsNumber()
  @Type(() => Number)
  sizeBytes: number;
}

export class CreateDocumentsDto {
  @IsInt()
  @Type(() => Number)
  sectionId: number;

  @IsInt()
  @Type(() => Number)
  typeId: number;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  subtypeId?: number;

  @IsInt()
  @Min(2000)
  @Max(new Date().getFullYear() + 1)
  @Type(() => Number)
  @IsOptional()
  fiscalYear?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentDto)
  documents: DocumentDto[];
}

export class UpdateDocumentDto extends PartialType(DocumentDto) {
  @IsEnum(DocumentStatus)
  @IsOptional()
  status?: DocumentStatus;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  fiscalYear?: number;
}

type OrderDirection = 'ASC' | 'DESC';

export class NewFilterDocumentsDto extends PaginationParamsDto {
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  sectionId?: number;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  typeId?: number;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  subtypeId?: number;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  fiscalYear?: number;
}
export class FilterDocumentsDto extends PaginationParamsDto {
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  categoryId?: number;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  sectionId?: number;

  // @IsIn(['asc', 'desc'])
  @IsOptional()
  orderDirection?: OrderDirection = 'DESC';

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  fiscalYear?: number;
}
