import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
export class CreateSectionDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (value as string).trim().toUpperCase())
  name: string;

  @IsInt({ each: true })
  @IsArray()
  @ArrayMinSize(1)
  documentTypesIds: number[];

  @IsOptional()
  @IsBoolean()
  isActive: boolean;
}

export class UpdateSectionDto extends PartialType(CreateSectionDto) {}
