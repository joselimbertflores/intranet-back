import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { PaginationParamsDto } from 'src/modules/common';
export class DocumentDto {
  @IsInt()
  @Type(() => Number)
  fileId: number;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title?: string;
}

export class CreateDocumentsDto {
  @IsUUID()
  sectionId: string;

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
  sectionId?: number;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  typeId?: number;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  subtypeId?: number;

  // @IsIn(['asc', 'desc'])
  @IsOptional()
  orderDirection?: OrderDirection = 'DESC';

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  fiscalYear?: number;
}
