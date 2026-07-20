import { ArrayMinSize, IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString({ each: true })
  @IsArray()
  @ArrayMinSize(1)
  roleIds?: string[];
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
