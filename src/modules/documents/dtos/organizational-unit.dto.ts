import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateOrganizationalUnitDto {
  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  parentId?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateOrganizationalUnitDto extends PartialType(
  OmitType(CreateOrganizationalUnitDto, ['parentId'] as const),
) {}
