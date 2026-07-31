import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt, { type JwtPayload } from 'jsonwebtoken';

import { JwksService } from './jwks.service';
import { AccessTokenPayload } from '../interfaces';
import { EnvironmentVariables } from 'src/config';

export enum AccessTokenFailureReason {
  EXPIRED = 'expired',
  INVALID_HEADER = 'invalid_header',
  INVALID_TOKEN = 'invalid_token',
  NOT_ACTIVE = 'not_active',
  VERIFICATION_FAILED = 'verification_failed',
}

export class AccessTokenVerificationError extends UnauthorizedException {
  constructor(
    public readonly reason: AccessTokenFailureReason,
    public readonly canAttemptRefresh: boolean,
    message: string,
  ) {
    super(message);
  }
}

@Injectable()
export class TokenVerifierService {
  constructor(
    private readonly jwksService: JwksService,
    private readonly configService: ConfigService<EnvironmentVariables>,
  ) {}

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    try {
      const decoded = jwt.decode(token, { complete: true });

      if (!decoded?.header?.kid) {
        throw new AccessTokenVerificationError(
          AccessTokenFailureReason.INVALID_HEADER,
          false,
          'Invalid access token header',
        );
      }

      const publicKey = await this.jwksService.getPublicKey(decoded.header.kid);

      const verifiedPayload = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        issuer: this.configService.getOrThrow<string>('OAUTH_ISSUER'),
        audience: this.configService.getOrThrow<string>('OAUTH_CLIENT_ID'),
      });

      return this.validateIdentityClaims(verifiedPayload);
    } catch (error) {
      if (error instanceof AccessTokenVerificationError) {
        throw error;
      }

      if (error instanceof jwt.TokenExpiredError) {
        throw new AccessTokenVerificationError(AccessTokenFailureReason.EXPIRED, true, 'Access token expired');
      }

      if (error instanceof jwt.NotBeforeError) {
        throw new AccessTokenVerificationError(
          AccessTokenFailureReason.NOT_ACTIVE,
          false,
          'Access token is not active',
        );
      }

      if (error instanceof jwt.JsonWebTokenError) {
        throw new AccessTokenVerificationError(AccessTokenFailureReason.INVALID_TOKEN, false, 'Invalid access token');
      }

      throw new AccessTokenVerificationError(
        AccessTokenFailureReason.VERIFICATION_FAILED,
        false,
        'Access token verification failed',
      );
    }
  }

  private validateIdentityClaims(payload: string | JwtPayload): AccessTokenPayload {
    if (
      typeof payload === 'string' ||
      typeof payload.externalKey !== 'string' ||
      payload.externalKey.trim().length === 0 ||
      typeof payload.name !== 'string' ||
      payload.name.trim().length === 0
    ) {
      throw new AccessTokenVerificationError(
        AccessTokenFailureReason.INVALID_TOKEN,
        false,
        'Access token is missing required identity claims',
      );
    }

    return {
      ...payload,
      externalKey: payload.externalKey.trim(),
      name: payload.name.trim(),
    } as AccessTokenPayload;
  }
}
