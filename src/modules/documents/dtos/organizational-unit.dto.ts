import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateOrganizationalUnitDto {
  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateOrganizationalUnitDto extends PartialType(
  OmitType(CreateOrganizationalUnitDto, ['parentId'] as const),
) {}
