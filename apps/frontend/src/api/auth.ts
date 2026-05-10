import type { AuthTokensDto, LogoutDto, RefreshTokensDto, RequestOtpDto, UserDto, VerifyOtpDto } from '@haber/shared';
import { apiClient } from './client';

export interface VerifyOtpResponse {
  user: UserDto;
  tokens: AuthTokensDto;
}

export const authApi = {
  requestOtp: (data: RequestOtpDto) => apiClient.post<{ message: string }>('/v1/auth/request-otp', data),

  verifyOtp: (data: VerifyOtpDto) => apiClient.post<VerifyOtpResponse>('/v1/auth/verify-otp', data),

  refreshTokens: (data: RefreshTokensDto) => apiClient.post<AuthTokensDto>('/v1/auth/refresh-tokens', data),

  logout: (refreshToken: string) => apiClient.post<void>('/v1/auth/logout', { refreshToken } satisfies LogoutDto),

  logoutAll: () => apiClient.post<void>('/v1/auth/logout-all', {}),
};
