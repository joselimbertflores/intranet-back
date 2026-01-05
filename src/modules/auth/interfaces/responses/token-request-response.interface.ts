export interface TokenRequestResponse {
  accessToken: string;
  refreshToken: string;
  token_type: string;
  expires_in: string;
  context?: {
    defaultRole: string;
  };
}

export class AccessTokenPayload {
  sub: string;
  name: string;
  externalKey: string;
  clientId: string;
}
