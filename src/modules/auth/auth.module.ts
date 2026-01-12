import { HttpModule } from '@nestjs/axios';
import { APP_GUARD } from '@nestjs/core';
import { Module } from '@nestjs/common';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { AuthGuard } from './guards/auth/auth.guard';

import { IdentityService, JwksService, TokenVerifierService } from './services';
@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    IdentityService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    JwksService,
    TokenVerifierService,
  ],
  imports: [HttpModule, UsersModule],
})
export class AuthModule {}
