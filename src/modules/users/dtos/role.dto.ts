import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class PermissionResponseDto {
  id: number;
  resource: string;
  action: string;
}

export class RoleResponseDto {
  id: string;
  name: string;
  description: string | null;
  isAutoAssigned: boolean;
  permissions: PermissionResponseDto[];

  constructor(role: {
    id: string;
    name: string;
    description: string | null;
    isAutoAssigned: boolean;
    permissions?: Array<{ id: number; resource: string; action: string }>;
  }) {
    this.id = role.id;
    this.name = role.name;
    this.description = role.description;
    this.isAutoAssigned = role.isAutoAssigned;
    this.permissions = (role.permissions ?? []).map(({ id, resource, action }) => ({
      id,
      resource,
      action,
    }));
  }
}

export class RoleOptionResponseDto {
  id: string;
  name: string;
  description: string | null;
  isAutoAssigned: boolean;
}

export class RolesPageResponseDto {
  roles: RoleResponseDto[];
  total: number;
}

export class CreateRoleDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isAutoAssigned?: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  permissionIds: number[];
}

export class UpdateRoleDto extends PartialType(CreateRoleDto) {}

export class RoleIdParamDto {
  @IsUUID('4')
  id: string;
}
