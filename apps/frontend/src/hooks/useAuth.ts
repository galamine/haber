import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';

export function useRequestOtp() {
  return useMutation({
    mutationFn: authApi.requestOtp,
  });
}

export function useVerifyOtp() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.verifyOtp,
    onSuccess: (data) => {
      setAuth(data.user, data.tokens.access.token, data.tokens.refresh.token);
      queryClient.invalidateQueries();
    },
  });
}

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      const refreshToken = useAuthStore.getState().refreshToken ?? '';
      return authApi.logout(refreshToken);
    },
    onSettled: () => {
      clearAuth();
      queryClient.clear();
    },
  });
}

export function useLogoutAll() {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.logoutAll,
    onSettled: () => {
      clearAuth();
      queryClient.clear();
    },
  });
}
