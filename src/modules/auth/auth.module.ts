import { HttpModule } from '@nestjs/axios';
import { APP_GUARD } from '@nestjs/core';
import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module';
import { OAuthGuard } from './guards/auth.guard';

import {
  AuthCookieService,
  AuthRedirectService,
  IdentityService,
  JwksService,
  OAuthService,
  PkceService,
  TokenVerifierService,
} from './services';
import { OAuthController } from './controllers';
import { AuthController } from './controllers/auth.controller';
@Module({
  controllers: [OAuthController, AuthController],
  providers: [
    OAuthService,
    IdentityService,
    AuthCookieService,
    AuthRedirectService,
    PkceService,
    {
      provide: APP_GUARD,
      useClass: OAuthGuard,
    },
    JwksService,
    TokenVerifierService,
  ],
  imports: [HttpModule, UsersModule],
})
export class AuthModule {}
