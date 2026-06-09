import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { PaginationParamsDto } from 'src/modules/common';
import { DocumentStatus } from '../entities';

export class DocumentDto {
  @IsUUID()
  fileId: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title?: string;
}

export class CreateDocumentsDto {
  @IsUUID()
  organizationalUnitId: string;

  @IsInt()
  @Type(() => Number)
  documentTypeId: number;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  documentSubtypeId?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  fiscalYear?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentDto)
  @ArrayMinSize(1)
  documents: DocumentDto[];
}

export class UpdateDocumentDto extends PartialType(DocumentDto) {
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  fiscalYear?: number | null;

  @IsUUID()
  @IsOptional()
  organizationalUnitId?: string;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  documentTypeId?: number;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  documentSubtypeId?: number | null;

  @IsEnum(DocumentStatus)
  @IsOptional()
  status?: DocumentStatus;
}

type OrderDirection = 'ASC' | 'DESC';

export class NewFilterDocumentsDto extends PaginationParamsDto {
  @IsUUID()
  @IsOptional()
  organizationalUnitId?: string;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  documentTypeId?: number;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  documentSubtypeId?: number;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  fiscalYear?: number;

  @IsEnum(DocumentStatus)
  @IsOptional()
  status?: DocumentStatus;
}
export class FilterDocumentsDto extends PaginationParamsDto {
  @IsUUID()
  @IsOptional()
  organizationalUnitId?: string;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  documentTypeId?: number;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  documentSubtypeId?: number;

  // @IsIn(['asc', 'desc'])
  @IsOptional()
  orderDirection?: OrderDirection = 'DESC';

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  fiscalYear?: number;
}
