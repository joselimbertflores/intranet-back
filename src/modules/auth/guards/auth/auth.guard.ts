import { Injectable, CanActivate, HttpException, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

import type { Request, Response } from 'express';

import { AccessTokenPayload, TokenRequestResponse } from '../../interfaces';
import { IdentityService } from '../../services';
import { IS_PUBLIC_KEY } from '../../decorators';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private identityService: IdentityService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const accessToken = request.cookies['intranet_access'] as string | undefined;
    const refreshToken = request.cookies['intranet_refresh'] as string | undefined;

    const user = await this.authenticate(accessToken, refreshToken, response);
    request['user'] = user;
    return true;
  }

  private async authenticate(accessToken: string | undefined, refreshToken: string | undefined, res: Response) {
    if (accessToken) {
      const user = await this.tryAccess(accessToken);
      if (user) return user;
    }
    if (refreshToken) {
      const user = await this.tryRefresh(refreshToken, res);
      return user;
    }
    console.log('UNATOIRZ');
    throw new UnauthorizedException('Authentication required. Please login.');
  }

  private async tryAccess(accessToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(accessToken);
      return this.identityService.loadUser(payload.externalKey);
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      return null;
    }
  }

  private async tryRefresh(refreshToken: string, response: Response) {
    try {
      const result = await this.identityService.refreshTokens(refreshToken);
      this.setCookies(response, result);
      const payload = this.jwtService.decode<AccessTokenPayload>(result.accessToken);
      return await this.identityService.loadUser(payload.externalKey);
    } catch (error: unknown) {
      this.clearCookies(response);
      throw new UnauthorizedException('Token expired or invalid. Please login again.');
    }
  }

  private setCookies(res: Response, tokens: TokenRequestResponse) {
    res.cookie('intranet_access', tokens.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('intranet_refresh', tokens.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private clearCookies(res: Response) {
    res.clearCookie('intranet_access');
    res.clearCookie('intranet_refresh');
  }
}
