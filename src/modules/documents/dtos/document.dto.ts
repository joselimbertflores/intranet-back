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
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  organizationalUnitId?: number | null;

  @IsInt()
  @Type(() => Number)
  typeId: number;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  subtypeId?: number;

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

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  organizationalUnitId?: number | null;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  typeId?: number;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  subtypeId?: number | null;

  @IsEnum(DocumentStatus)
  @IsOptional()
  status?: DocumentStatus;

  @IsEnum(DocumentValidityStatus)
  @IsOptional()
  validityStatus?: DocumentValidityStatus;
}

export class FilterDocumentsDto extends PaginationParamsDto {
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  organizationalUnitId?: number;

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
  year?: number;

  @IsEnum(DocumentStatus)
  @IsOptional()
  status?: DocumentStatus;

  @IsEnum(DocumentValidityStatus)
  @IsOptional()
  validityStatus?: DocumentValidityStatus;
}
