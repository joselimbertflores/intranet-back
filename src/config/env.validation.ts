import Joi from 'joi';

export type NodeEnvironment = 'development' | 'test' | 'production';
export type AuthCookieSameSite = 'lax' | 'strict' | 'none';

export interface EnvironmentVariables {
  NODE_ENV: NodeEnvironment;
  PORT: number;
  INTRANET_PUBLIC_URL: string;
  INTRANET_UI_URL?: string;
  DATABASE_HOST: string;
  DATABASE_PORT: number;
  DATABASE_NAME: string;
  DATABASE_USER: string;
  DATABASE_PASSWORD: string;
  DATABASE_SYNCHRONIZE: boolean;
  IDENTITY_HUB_PUBLIC_URL: string;
  IDENTITY_HUB_INTERNAL_URL?: string;
  RRHH_INTEGRATION_URL: string;
  RRHH_ACCESS_CODE: string;
  OAUTH_CLIENT_ID: string;
  OAUTH_CLIENT_SECRET: string;
  AUTH_COOKIE_SECURE: boolean;
  AUTH_COOKIE_SAME_SITE: AuthCookieSameSite;
  BOOTSTRAP_ADMIN_EXTERNAL_KEY?: string;
  UPLOAD_PATH: string;
}

const portSchema = Joi.number().integer().min(1).max(65535);
const httpUrlSchema = Joi.string().uri({ scheme: ['http', 'https'], allowRelative: false });

export const environmentValidationSchema: Joi.ObjectSchema<EnvironmentVariables> = Joi.object<EnvironmentVariables>({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').required(),
  PORT: portSchema.required(),
  INTRANET_PUBLIC_URL: httpUrlSchema.required(),
  INTRANET_UI_URL: httpUrlSchema.optional(),
  DATABASE_HOST: Joi.string().trim().min(1).required(),
  DATABASE_PORT: portSchema.required(),
  DATABASE_NAME: Joi.string().trim().min(1).required(),
  DATABASE_USER: Joi.string().trim().min(1).required(),
  DATABASE_PASSWORD: Joi.string().min(1).required(),
  DATABASE_SYNCHRONIZE: Joi.boolean()
    .when('NODE_ENV', { is: 'production', then: Joi.valid(false) })
    .required(),
  IDENTITY_HUB_PUBLIC_URL: httpUrlSchema.required(),
  IDENTITY_HUB_INTERNAL_URL: httpUrlSchema.optional(),
  RRHH_INTEGRATION_URL: httpUrlSchema.required(),
  RRHH_ACCESS_CODE: Joi.string().trim().min(1).required(),
  OAUTH_CLIENT_ID: Joi.string().trim().min(1).required(),
  OAUTH_CLIENT_SECRET: Joi.string().min(1).required(),
  AUTH_COOKIE_SECURE: Joi.boolean().required(),
  AUTH_COOKIE_SAME_SITE: Joi.string()
    .valid('lax', 'strict', 'none')
    .when('AUTH_COOKIE_SECURE', { is: false, then: Joi.invalid('none') })
    .required(),
  BOOTSTRAP_ADMIN_EXTERNAL_KEY: Joi.string().trim().min(1).optional(),
  UPLOAD_PATH: Joi.string().trim().min(1).required(),
});
