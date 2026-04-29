import path from 'node:path';
import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

interface IJwt {
  secret: string;
  accessExpirationMinutes: number;
  refreshExpirationDays: number;
  resetPasswordExpirationMinutes: number;
  verifyEmailExpirationMinutes: number;
}

interface IEmail {
  smtp: {
    host?: string;
    port?: number;
    auth: {
      user?: string | undefined;
      pass?: string | undefined;
    };
  };
  from?: string;
}

interface IPostgres {
  url: string;
}

interface Config {
  env: string;
  port: number;
  postgres: IPostgres;
  jwt: IJwt;
  email: IEmail;
}

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('production', 'development', 'test').required(),
    PORT: Joi.number().default(3000),
    DATABASE_URL: Joi.string().required().description('PostgreSQL DB url'),
    JWT_SECRET: Joi.string().required().description('JWT secret key'),
    JWT_ACCESS_EXPIRATION_MINUTES: Joi.number().default(30).description('minutes after which access tokens expire'),
    JWT_REFRESH_EXPIRATION_DAYS: Joi.number().default(30).description('days after which refresh tokens expire'),
    JWT_RESET_PASSWORD_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description('minutes after which reset password token expires'),
    JWT_VERIFY_EMAIL_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description('minutes after which verify email token expires'),
    SMTP_HOST: Joi.string().description('server that will send the emails'),
    SMTP_PORT: Joi.number().description('port to connect to the email server'),
    SMTP_USERNAME: Joi.string().description('username for email server'),
    SMTP_PASSWORD: Joi.string().description('password for email server'),
    EMAIL_FROM: Joi.string().description('the from field in the emails sent by the app'),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const getPostgresUrl = (url: string, env: string): string => {
  if (env === 'test') {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.replace(/\/$/, '');
      urlObj.pathname = `${pathname}_test`;
      return urlObj.toString();
    } catch {
      return `${url}_test`;
    }
  }
  return url;
};

const _config: Config = {
  env: envVars.NODE_ENV as string,
  port: envVars.PORT as number,
  postgres: {
    url: getPostgresUrl(envVars.DATABASE_URL as string, envVars.NODE_ENV as string),
  },
  jwt: {
    secret: envVars.JWT_SECRET as string,
    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES as number,
    refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS as number,
    resetPasswordExpirationMinutes: envVars.JWT_RESET_PASSWORD_EXPIRATION_MINUTES as number,
    verifyEmailExpirationMinutes: envVars.JWT_VERIFY_EMAIL_EXPIRATION_MINUTES as number,
  },
  email: {
    smtp: {
      host: envVars.SMTP_HOST as string | undefined,
      port: envVars.SMTP_PORT as number | undefined,
      auth: {
        user: envVars.SMTP_USERNAME as string | undefined,
        pass: envVars.SMTP_PASSWORD as string | undefined,
      },
    },
    from: envVars.EMAIL_FROM as string | undefined,
  },
};

export default _config;
