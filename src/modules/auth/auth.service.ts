import {
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
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
import { AccessTokenPayload, RefreshTokenResult, TokenRequestResponse } from './interfaces';
import { UsersService } from '../users/services';
import { TokenVerifierService } from './services';

@Injectable()
export class AuthService {
  constructor(
    private readonly http: HttpService,
    private configService: ConfigService<EnvironmentVariables>,
    private userService: UsersService,
    private tokenVerifierService: TokenVerifierService,
  ) {}

  async exchangeAuthorizationCode(code: string) {
    try {
      const { data } = await this.buildExchangeTokenRequest(code);
      const decoded: AccessTokenPayload = await this.tokenVerifierService.verifyAccessToken(data.accessToken);
      await this.userService.syncUserFromIdentity(decoded);
      return { result: data, url: this.configService.getOrThrow<string>('LOGIN_SUCCESS_REDIRECT') };
    } catch (error) {
      console.log(error);
      if (error instanceof AxiosError && error.response?.status === 401) {
        throw new UnauthorizedException(error.response.data);
      }
      throw new InternalServerErrorException("Code exchange can't be completed at the moment");
    }
  }

  async login({ login, password }: LoginDto) {
    // try {
    //   const authUrl = `${this.configService.get('IDENTITY_HUB_URL')}/auth/direct-login`;
    //   const result = await lastValueFrom(
    //     this.http.post<DirectLoginResult>(authUrl, { login, password, clientKey: 'intranet' }),
    //   );
    //   const { accessToken, refreshToken } = result.data;
    //   console.log(result.data);
    //   return { accessToken, refreshToken, ok: true, message: 'Logged in successfully' };
    // } catch (error: unknown) {
    //   if (error instanceof AxiosError && error.response?.status === 401) {
    //     const message = (error.response.data['message'] as string) ?? 'Invalid credentials';
    //     throw new UnauthorizedException(message);
    //   }
    //   throw new InternalServerErrorException('Login can"t be completed at the moment');
    // }
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

  private async buildExchangeTokenRequest(code: string) {
    const url = `${this.configService.get('IDENTITY_HUB_URL')}/oauth/token`;
    const client_id = this.configService.getOrThrow<string>('CLIENT_KEY');
    const client_secret = this.configService.getOrThrow<string>('CLIENT_SECRET');
    const redirect_uri = this.configService.getOrThrow<string>('OAUTH_REDIRECT_URI');
    const request = this.http.post<TokenRequestResponse>(url, {
      grant_type: 'authorization_code',
      client_secret,
      redirect_uri,
      client_id,
      code,
      // code_verifier: 'abc',
    });
    return await lastValueFrom(request);
  }
}
