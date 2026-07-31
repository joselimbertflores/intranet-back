import { Transform } from 'class-transformer';
import { ArrayUnique, IsArray, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UserRoleResponseDto {
  id: string;
  name: string;
  description: string | null;
}

export class UserResponseDto {
  id: string;
  fullName: string;
  roles: UserRoleResponseDto[];

  constructor(user: {
    id: string;
    fullName: string;
    roles?: Array<{ id: string; name: string; description: string | null }>;
  }) {
    this.id = user.id;
    this.fullName = user.fullName;
    this.roles = (user.roles ?? []).map(({ id, name, description }) => ({ id, name, description }));
  }
}

export class UsersPageResponseDto {
  users: UserResponseDto[];
  total: number;
}

export class IdentityCandidateResponseDto {
  externalKey: string;
  fullName: string;
  email: string | null;
  login: string | null;
}

export class UpdateUserDto {
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  roleIds: string[];
}

export class SearchIdentityCandidatesDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(255)
  term = '';
}

export class ImportUserFromIdentityDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  externalKey: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  roleIds?: string[];
}

export class UserIdParamDto {
  @IsUUID('4')
  id: string;
}

export class IdentityExternalKeyParamDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  externalKey: string;
}
