import {
  Injectable,
  CanActivate,
  HttpException,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import type { Request, Response } from 'express';

import { UsersService } from 'src/modules/users/services';
import { EnvironmentVariables } from 'src/config';

import { AccessTokenPayload } from '../../interfaces';
import { AuthService } from '../../auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private authService: AuthService,
    private userService: UsersService,
    private configServce: ConfigService<EnvironmentVariables>,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();

    const accessToken = request.cookies?.['intranet_access'] as string | undefined;
    console.log(accessToken);
    if (!accessToken) {
      throw new UnauthorizedException();
    }

    let payload: AccessTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(accessToken);
    } catch {
      console.log('xpirado');
      // token expirado, inválido, manipulado → 401 limpio
      throw new UnauthorizedException();
    }

    const user = await this.loadUser(payload.externalKey);
    request['user'] = user;
    return true;
  }

  // async canActivate(context: ExecutionContext) {
  //   const request: Request = context.switchToHttp().getRequest();
  //   const response: Response = context.switchToHttp().getResponse();

  //   const accessToken = request.cookies?.['intranet_access'] as string | undefined;
  //   const refreshToken = request.cookies?.['intranet_refresh'] as string | undefined;

  //   const user = await this.authenticateUser(accessToken, refreshToken, response);
  //   request['user'] = user;
  //   console.log(user);
  //   return true;
  // }

  // private async authenticateUser(accessToken: string | undefined, refreshToken: string | undefined, res: Response) {
  //   console.log("EXCEN CUAR");
  //   if (accessToken) {
  //     console.log(accessToken);
  //     const user = await this.tryAccessToken(accessToken);
  //     if (user) return user;
  //   }
  //   console.log("fisn");
  //   if (refreshToken) {
  //     console.log('CHECK REFERSH TOKEN');
  //     const result = await this.tryRefreshToken(refreshToken, res);
  //     console.log('RESULT REFRESH', result);
  //     return result;
  //   }
  //   throw new UnauthorizedException('Authentication required. Please login.');
  // }

  // private async tryAccessToken(accessToken: string) {
  //   try {
  //     const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(accessToken);
  //     console.log(payload);
  //     // this.checkClientKey(payload.clientKey);
  //     return this.loadUser(payload.externalKey);
  //   } catch (error: unknown) {
  //     if (error instanceof HttpException) throw error;
  //     return null;
  //   }
  // }

  // private async tryRefreshToken(refreshToken: string, response: Response) {
  //   try {
  //     const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken);
  //     this.checkClientKey(payload.clientKey);
  //     const result = await this.authService.refreshTokens(refreshToken);

  //     response.cookie('intranet_access', result.accessToken, {
  //       httpOnly: true,
  //       sameSite: 'lax',
  //       secure: false,
  //       maxAge: 15 * 60 * 1000,
  //     });

  //     response.cookie('intranet_refresh', result.refreshToken, {
  //       httpOnly: true,
  //       sameSite: 'lax',
  //       secure: false,
  //       maxAge: 7 * 24 * 60 * 60 * 1000,
  //     });
  //     return await this.loadUser(result.externalKey);
  //   } catch (error: unknown) {
  //     response.clearCookie('intranet_access');
  //     response.clearCookie('intranet_refresh');
  //     throw new UnauthorizedException('Token expired or invalid. Please login again.');
  //   }
  // }

  private async loadUser(externalKey: string) {
    const user = await this.userService.findUserByExternalKey(externalKey);
    if (!user) throw new ForbiddenException('Local user not found.');
    return user;
  }

  // private checkClientKey(clientKey: string) {
  //   const expectedClientKey = this.configServce.get('CLIENT_KEY') as string;
  //   if (clientKey !== expectedClientKey) {
  //     throw new ForbiddenException('Invalid client key');
  //   }
  // }
}
