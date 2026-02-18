import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateDirectoryEntryDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  internalPhone?: string;

  @IsOptional()
  @IsString()
  landlinePhone?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  parentId?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  order?: number;
}

export class UpdateDirectoryEntryDto extends PartialType(CreateDirectoryEntryDto) {}
