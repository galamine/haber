import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: path.join(__dirname, '../../.env') });

interface IJwt {
  secret: string;
  accessExpirationMinutes: number;
  refreshExpirationDays: number;
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

const envSchema = z.object({
  NODE_ENV: z.enum(['production', 'development', 'test']),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, 'PostgreSQL DB url is required'),
  JWT_SECRET: z.string().min(1, 'JWT secret key is required'),
  JWT_ACCESS_EXPIRATION_MINUTES: z.coerce.number().default(30),
  JWT_REFRESH_EXPIRATION_DAYS: z.coerce.number().default(30),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USERNAME: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(
    `Config validation error: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')}`
  );
}

const envVars = parsed.data;

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
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  postgres: {
    url: getPostgresUrl(envVars.DATABASE_URL, envVars.NODE_ENV),
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
  },
  email: {
    smtp: {
      host: envVars.SMTP_HOST,
      port: envVars.SMTP_PORT,
      auth: {
        user: envVars.SMTP_USERNAME,
        pass: envVars.SMTP_PASSWORD,
      },
    },
    from: envVars.EMAIL_FROM,
  },
};

export default _config;
