import type { CookieOptions } from 'express';

export const SESSION_COOKIE_NAME = 'intranet_session';
export const OAUTH_TRANSACTION_COOKIE_NAME = 'intranet_oauth_transaction';
export const OAUTH_TRANSACTION_COOKIE_PATH = '/auth';

export function getAuthCookieOptions(secure: boolean, sameSite: CookieOptions['sameSite'], path = '/'): CookieOptions {
  return {
    httpOnly: true,
    sameSite,
    secure,
    path,
  };
}
