import { ArrayMinSize, IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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

export class UpdateUserDto {
  @IsString({ each: true })
  @IsArray()
  @ArrayMinSize(1)
  roleIds: string[];
}

export class SearchIdentityCandidatesDto {
  @IsOptional()
  @IsString()
  term = '';
}

export class ImportUserFromIdentityDto {
  @IsNotEmpty()
  @IsString()
  externalKey: string;

  @IsOptional()
  @IsString({ each: true })
  @IsArray()
  @ArrayMinSize(1)
  roleIds?: string[];
}
