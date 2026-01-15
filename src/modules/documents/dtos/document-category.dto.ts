import { PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';

export class DocumentSubTypeDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (value as string).trim().toUpperCase())
  name: string;
}
export class CreateDocumentCategoryDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Transform(({ value }) => (value as string).trim().toUpperCase())
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentSubTypeDto)
  subTypes: DocumentSubTypeDto[];
}

export class UpdateDocumentCategoryDto extends PartialType(CreateDocumentCategoryDto) {}
