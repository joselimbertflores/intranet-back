import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
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
  @IsInt()
  @Min(1)
  typeId: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsUUID()
  fileId: string;
}

export class UpdateCommunicationDto extends PartialType(CreateCommunicationDto) {}

export class SetCommunicationStatusDto {
  @IsBoolean()
  isActive: boolean;
}

export class GetPortalCommunicationsDto extends PaginationParamsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  typeId?: number;
}
