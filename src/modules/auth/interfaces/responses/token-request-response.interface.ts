export interface TokenRequestResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: string;
}

export class AccessTokenPayload {
  sub: string;
  externalKey: string;
  name: string;
  userType: string;
  clientId: string;
  scope?: string;
}
