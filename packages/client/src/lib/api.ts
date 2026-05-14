import type { AppRouter } from '@haber-full/api';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { env } from '../env';

export const api = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${env.PUBLIC_API_URL}/api/trpc`,
    }),
  ],
});
