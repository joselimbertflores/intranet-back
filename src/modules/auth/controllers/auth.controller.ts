import { Controller, Get } from '@nestjs/common';

import { User } from 'src/modules/users/entities';
import { IdentityService } from '../services';
import { GetAuthUser } from '../decorators';

@Controller('auth')
export class AuthController {
  constructor(private indetityService: IdentityService) {}

  @Get('status')
  checkAuthStatus(@GetAuthUser() user: User) {
    return { user };
  }
}
