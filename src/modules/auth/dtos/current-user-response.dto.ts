export class CurrentUserDto {
  id: string;
  externalKey: string;
  fullName: string;
  permissions: string[];
}

export class CurrentUserResponseDto {
  user: CurrentUserDto;
}
