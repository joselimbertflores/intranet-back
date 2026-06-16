import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsIn,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { PaginationParamsDto } from 'src/modules/common';
import { DocumentStatus } from '../entities';

export class CreateDocumentBatchItemDto {
  @IsUUID()
  fileId: string;

  @IsString()
  @IsNotEmpty()
  title: string;
}

export class CreateDocumentBatchDto {
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
  year?: number;

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
  fiscalYear?: number;

  @IsEnum(DocumentStatus)
  @IsOptional()
  status?: DocumentStatus;
}

export class DocumentCatalogItemResponseDto {
  id: string | number;
  name: string;
  slug: string;
  isActive: boolean;
}

export class DocumentFileResponseDto {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
}

export class DocumentAdminResponseDto {
  id: string;
  title: string;
  fiscalYear: number | null;
  status: DocumentStatus;
  documentType: DocumentCatalogItemResponseDto;
  documentSubtype: DocumentCatalogItemResponseDto | null;
  organizationalUnit: DocumentCatalogItemResponseDto;
  file: DocumentFileResponseDto;
  createdAt: Date;
  updatedAt: Date;
}
