import { ForbiddenException, HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { JwtService } from '@nestjs/jwt';

import { lastValueFrom } from 'rxjs';

import { UsersService } from 'src/modules/users/services';
import { AccessTokenPayload } from '../interfaces';
import { EnvironmentVariables } from 'src/config';

@Injectable()
export class IdentityService {
  constructor(
    private http: HttpService,
    private jwtService: JwtService,
    private userService: UsersService,
    private configService: ConfigService<EnvironmentVariables>,
  ) {}

  async tryAccessToken(accessToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(accessToken);
      return await this.loadUserByExternalKey(payload.externalKey);
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      return null;
    }
  }

  async tryRefreshToken(refreshToken: string) {
    const url = `${this.configService.getOrThrow<string>('IDENTITY_HUB_URL')}/auth/token`;
    const request = this.http.post(url, {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.configService.getOrThrow<string>('CLIENT_KEY'),
    });
    // const result = await lastValueFrom<AccessTokenPayload>(request);
    // return result.data;
  }

  private async loadUserByExternalKey(externalKey: string) {
    const user = await this.userService.findUserByExternalKey(externalKey);
    if (!user) throw new ForbiddenException('Not user fount.');
    return user;
  }
}
