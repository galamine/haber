import { useAuthStore } from '@/stores';

export function useAuth() {
  const { accessToken, refreshToken, setTokens, clearTokens } = useAuthStore();
  return { accessToken, refreshToken, setTokens, clearTokens };
}
