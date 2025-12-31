import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { JwtService } from '@nestjs/jwt';

import { Repository } from 'typeorm';
import { AxiosError } from 'axios';

import { lastValueFrom } from 'rxjs';

import { LoginDto } from './dtos';
import { User } from '../users/entities';
import { EnvironmentVariables } from 'src/config';
import { RefreshTokenResult, DirectLoginResult, RefreshTokenPayload, TokenRequestResponse } from './interfaces';

@Injectable()
export class AuthService {
  constructor(
    private readonly http: HttpService,
    @InjectRepository(User) private userRepository: Repository<User>,
    private configService: ConfigService<EnvironmentVariables>,
    private jwtService: JwtService,
  ) {}

  async exchangeAuthorizationCode(code: string) {
    try {
      const request = this.http.post<TokenRequestResponse>(`${this.configService.get('IDENTITY_HUB_URL')}/auth/token`, {
        code,
        client_id: this.configService.getOrThrow<string>('CLIENT_KEY'),
        redirect_uri: this.configService.getOrThrow<string>('OAUTH_REDIRECT_URI'),
      });
      const response = await lastValueFrom(request);

      return { tokens: response.data, url: this.configService.getOrThrow<string>('LOGIN_SUCCESS_REDIRECT') };
    } catch (error) {
      throw new UnauthorizedException('Invalid authorization code');
    }
  }

  async refreshTokens(refreshToken: string) {
    const authRefreshUrl = `${this.configService.get('IDENTITY_HUB_URL')}/auth/refresh`;
    const request = this.http.post<RefreshTokenResult>(authRefreshUrl, { refreshToken }, { timeout: 5000 });
    const result = await lastValueFrom(request);
    return result.data;
  }

  async login({ login, password }: LoginDto) {
    try {
      const authUrl = `${this.configService.get('IDENTITY_HUB_URL')}/auth/direct-login`;

      const result = await lastValueFrom(
        this.http.post<DirectLoginResult>(authUrl, { login, password, clientKey: 'intranet' }),
      );
      const { accessToken, refreshToken } = result.data;
      console.log(result.data);
      return { accessToken, refreshToken, ok: true, message: 'Logged in successfully' };
    } catch (error: unknown) {
      if (error instanceof AxiosError && error.response?.status === 401) {
        const message = (error.response.data['message'] as string) ?? 'Invalid credentials';
        throw new UnauthorizedException(message);
      }
      throw new InternalServerErrorException('Login can"t be completed at the moment');
    }
  }

  buildAuthorizeUrl(): string {
    const idpUrl = this.configService.getOrThrow<string>('IDENTITY_HUB_URL');
    const clientId = this.configService.getOrThrow<string>('CLIENT_KEY');
    const redirectUri = this.configService.getOrThrow<string>('OAUTH_REDIRECT_URI');

    const authorizeUrl = new URL(`${idpUrl}/oauth/authorize`);
    authorizeUrl.searchParams.set('client_id', clientId);
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('response_type', 'code');
    // authorizeUrl.searchParams.set('state', redirectUri);
    return authorizeUrl.toString();
  }

  async refreshToken(refreshToken: string) {
    try {
      const result = await lastValueFrom(
        this.http.post<RefreshTokenResult>(`${this.configService.getOrThrow<string>('IDENTITY_HUB_URL')}/auth/token`, {
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: this.configService.getOrThrow<string>('CLIENT_KEY'),
        }),
      );
      return result.data;
    } catch (error) {
      throw new UnauthorizedException();
    }
  }
}
