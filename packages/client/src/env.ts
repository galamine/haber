import { createEnv } from '@t3-oss/env-core';
import * as z from 'zod';

export const env = createEnv({
  server: {},
  clientPrefix: 'PUBLIC_',
  client: {
    PUBLIC_API_URL: z.string().url().default('http://localhost:3001'),
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
});
