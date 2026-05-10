import type { UserDto, UserRole } from '@haber/shared';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: UserDto | null;
  accessToken: string | null;
  refreshToken: string | null;
  role: UserRole | null;
  tenantId: string | null;
  setAuth: (user: UserDto, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<UserDto>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      role: null,
      tenantId: null,
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, role: user.role, tenantId: user.tenantId }),
      clearAuth: () => set({ user: null, accessToken: null, refreshToken: null, role: null, tenantId: null }),
      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),
    }),
    {
      name: 'haber-auth',
    }
  )
);
