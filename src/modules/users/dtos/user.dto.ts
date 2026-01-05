import { PartialType } from '@nestjs/mapped-types';
import { IsNotEmpty, IsString, IsEnum, IsOptional, IsBoolean, ArrayMinSize, IsArray } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @IsNotEmpty()
  @IsOptional()
  login?: string;

  @IsOptional()
  password?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  roleIds: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}
