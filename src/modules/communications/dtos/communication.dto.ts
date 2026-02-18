import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

import { PaginationParamsDto } from 'src/modules/common';

export class CreateCommunicationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  reference: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  code: string;

  @Type(() => Number)
  @IsNumber()
  typeId: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsUUID()
  fileId: string;
}

export class UpdateCommunicationDto extends PartialType(CreateCommunicationDto) {}

export class CreateTypeCommunicationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;
}

export class GetPublicCommunicationsDto extends PaginationParamsDto {
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  typeId?: number;
}
