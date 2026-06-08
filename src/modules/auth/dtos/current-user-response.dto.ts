export class CurrentUserDto {
  id: string;
  externalKey: string;
  fullName: string;
  isActive: boolean;
  permissions: string[];
}

export class CurrentUserResponseDto {
  user: CurrentUserDto;
}
