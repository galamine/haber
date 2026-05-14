import { serve } from '@hono/node-server';
import { trpcServer } from '@hono/trpc-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { createContext } from './context';
import { env } from './env';
import { type AppRouter, appRouter } from './router';

export type { AppRouter };

const app = new Hono();

app.use('*', logger());
app.use(
  '/api/trpc/*',
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  })
);

app.use(
  '/api/trpc/*',
  trpcServer({
    router: appRouter,
    createContext,
  })
);

app.get('/health', (c) => c.json({ status: 'ok' }));

app.notFound((c) => c.json({ error: 'Not Found' }, 404));

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: err.message }, 500);
});

console.log(`Server starting on port ${env.PORT}`);

serve({
  fetch: app.fetch,
  port: env.PORT,
});
