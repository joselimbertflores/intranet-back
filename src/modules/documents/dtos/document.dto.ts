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
import { PaginationParamsDto } from 'src/common/dtos';
import { DocumentStatus, DocumentValidityStatus } from '../entities';

export class CreateDocumentBatchItemDto {
  @IsUUID()
  fileId: string;

  @IsString()
  @IsNotEmpty()
  title: string;
}

export class CreateDocumentBatchDto {
  @IsUUID()
  @IsOptional()
  organizationalUnitId?: string | null;

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
  year?: number;

  @IsEnum(DocumentValidityStatus)
  @IsOptional()
  validityStatus?: DocumentValidityStatus;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDocumentBatchItemDto)
  @ArrayMinSize(1)
  documents: CreateDocumentBatchItemDto[];
}
export class UpdateDocumentDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title?: string;

  @IsUUID()
  @IsOptional()
  fileId?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  year?: number | null;

  @IsUUID()
  @IsOptional()
  organizationalUnitId?: string | null;

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

  @IsEnum(DocumentValidityStatus)
  @IsOptional()
  validityStatus?: DocumentValidityStatus;
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

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  year?: number;

  @IsEnum(DocumentStatus)
  @IsOptional()
  status?: DocumentStatus;

  @IsEnum(DocumentValidityStatus)
  @IsOptional()
  validityStatus?: DocumentValidityStatus;
}
