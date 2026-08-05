import { HttpService } from '@nestjs/axios';
import { BadGatewayException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { isAxiosError } from 'axios';
import { lastValueFrom } from 'rxjs';

import { EnvironmentVariables } from 'src/config';
import { IdentityCandidateResponseDto } from '../dtos';

export interface IdentityHubAssignableUser {
  externalKey: string;
  fullName: string;
  email: string | null;
  login: string;
}

@Injectable()
export class IdentityHubUsersClientService {
  private readonly requestTimeoutMs = 10_000;

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  async searchAssignableUsers(term: string): Promise<IdentityCandidateResponseDto[]> {
    const url = this.buildUrl('/internal/users/assignable');
    url.searchParams.set('term', term);

    try {
      const response = await lastValueFrom(
        this.http.get<IdentityHubAssignableUser[]>(url.toString(), {
          auth: this.getBasicAuth(),
          timeout: this.requestTimeoutMs,
        }),
      );
      return response.data.map((user) => this.toCandidateResponse(user));
    } catch {
      throw new BadGatewayException('Unable to search assignable users in Identity Hub');
    }
  }

  async findAssignableUserByExternalKey(externalKey: string): Promise<IdentityCandidateResponseDto> {
    const url = this.buildUrl(`/internal/users/assignable/${encodeURIComponent(externalKey)}`);

    try {
      const response = await lastValueFrom(
        this.http.get<IdentityHubAssignableUser>(url.toString(), {
          auth: this.getBasicAuth(),
          timeout: this.requestTimeoutMs,
        }),
      );
      return this.toCandidateResponse(response.data);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        throw new NotFoundException(`Assignable Identity Hub user with external key ${externalKey} not found`);
      }

      throw new BadGatewayException('Unable to load assignable user from Identity Hub');
    }
  }

  private buildUrl(path: string): URL {
    const identityHubInternalUrl =
      this.configService.get('IDENTITY_HUB_INTERNAL_URL', { infer: true }) ??
      this.configService.getOrThrow('IDENTITY_HUB_PUBLIC_URL', { infer: true });

    return new URL(path, this.ensureTrailingSlash(identityHubInternalUrl));
  }

  private getBasicAuth() {
    return {
      username: this.configService.getOrThrow('OAUTH_CLIENT_ID', { infer: true }),
      password: this.configService.getOrThrow('OAUTH_CLIENT_SECRET', { infer: true }),
    };
  }

  private ensureTrailingSlash(value: string): string {
    return value.endsWith('/') ? value : `${value}/`;
  }

  private toCandidateResponse(user: IdentityHubAssignableUser): IdentityCandidateResponseDto {
    if (
      typeof user?.externalKey !== 'string' ||
      user.externalKey.length === 0 ||
      typeof user.fullName !== 'string' ||
      user.fullName.length === 0 ||
      (user.email !== null && typeof user.email !== 'string') ||
      typeof user.login !== 'string' ||
      user.login.length === 0
    ) {
      throw new BadGatewayException('Identity Hub returned an invalid assignable user');
    }

    return {
      externalKey: user.externalKey,
      fullName: user.fullName,
      email: user.email,
      login: user.login,
    };
  }
}
