import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class DirectoryPaginationDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  readonly limit?: number = 10;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  readonly offset?: number = 0;

  @IsOptional()
  @IsString()
  readonly term?: string;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  readonly isActive?: boolean;
}

export class CreateDirectorySectionDto {
  @IsString()
  @MaxLength(160)
  name: string;

  @ValidateIf((o: CreateDirectorySectionDto) => o.parentId !== null && o.parentId !== undefined)
  @IsUUID()
  @IsOptional()
  parentId?: string | null;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateDirectorySectionDto extends PartialType(CreateDirectorySectionDto) {}

export class GetDirectorySectionsDto extends DirectoryPaginationDto {
  @ValidateIf((o: GetDirectorySectionsDto) => o.parentId !== null && o.parentId !== undefined)
  @IsUUID()
  @IsOptional()
  parentId?: string | null;
}

export class CreateDirectoryContactDto {
  @IsUUID()
  sectionId: string;

  @IsString()
  @MaxLength(140)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  internalPhone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  externalPhone?: string | null;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateDirectoryContactDto extends PartialType(CreateDirectoryContactDto) {}

export class GetDirectoryContactsDto extends DirectoryPaginationDto {
  @IsUUID()
  @IsOptional()
  sectionId?: string;
}
