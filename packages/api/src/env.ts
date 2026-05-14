import { createEnv } from '@t3-oss/env-core';
import * as z from 'zod';

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(32),
    JWT_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
    RESEND_API_KEY: z.string().min(1),
    OTP_EXPIRES_IN_MINUTES: z.coerce.number().default(10),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(3001),
    CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  },
  clientPrefix: '',
  client: {},
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
