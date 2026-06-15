import { PartialType } from '@nestjs/mapped-types';
import { ArrayMinSize, IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRoleDto {
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
  @IsInt({ each: true })
  permissionIds: number[];
}

export class UpdateRoleDto extends PartialType(CreateRoleDto) {}
