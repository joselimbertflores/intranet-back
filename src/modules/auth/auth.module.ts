import { HttpModule } from '@nestjs/axios';
import { APP_GUARD } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersModule } from '../users/users.module';
import { OAuthGuard } from './guards/auth.guard';

import {
  AuthCookieService,
  AuthRedirectService,
  AuthSessionService,
  IdentityService,
  JwksService,
  OAuthTransactionService,
  OAuthService,
  PkceService,
  TokenVerifierService,
} from './services';
import { OAuthController } from './controllers';
import { AuthController } from './controllers/auth.controller';
import { AuthSession, OAuthTransaction } from './entities';

@Module({
  controllers: [OAuthController, AuthController],
  providers: [
    OAuthService,
    IdentityService,
    AuthCookieService,
    AuthRedirectService,
    AuthSessionService,
    OAuthTransactionService,
    PkceService,
    {
      provide: APP_GUARD,
      useClass: OAuthGuard,
    },
    JwksService,
    TokenVerifierService,
  ],
  imports: [HttpModule, TypeOrmModule.forFeature([AuthSession, OAuthTransaction]), UsersModule],
})
export class AuthModule {}
