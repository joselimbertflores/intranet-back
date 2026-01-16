import { PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class DocumentSubTypeDto {
  @IsOptional()
  @IsInt()
  id?: number;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (value as string).trim().toUpperCase())
  name: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
export class CreateDocumentTypeDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Transform(({ value }) => (value as string).trim().toUpperCase())
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentSubTypeDto)
  subtypes: DocumentSubTypeDto[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateDocumentTypeDto extends PartialType(CreateDocumentTypeDto) {}
