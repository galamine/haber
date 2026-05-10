import { z } from 'zod';
import { UserDtoSchema } from './user.schema';

export const RequestOtpDtoSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const VerifyOtpDtoSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be exactly 6 digits'),
});

export const LogoutDtoSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const RefreshTokensDtoSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const TokenPayloadDtoSchema = z.object({
  token: z.string(),
  expires: z.string().datetime(),
});

export const AuthTokensDtoSchema = z.object({
  access: TokenPayloadDtoSchema,
  refresh: TokenPayloadDtoSchema,
});

export const AuthResponseDtoSchema = z.object({
  user: UserDtoSchema,
  tokens: AuthTokensDtoSchema,
});

export type RequestOtpDto = z.infer<typeof RequestOtpDtoSchema>;
export type VerifyOtpDto = z.infer<typeof VerifyOtpDtoSchema>;
export type LogoutDto = z.infer<typeof LogoutDtoSchema>;
export type RefreshTokensDto = z.infer<typeof RefreshTokensDtoSchema>;
export type TokenPayloadDto = z.infer<typeof TokenPayloadDtoSchema>;
export type AuthTokensDto = z.infer<typeof AuthTokensDtoSchema>;
export type AuthResponseDto = z.infer<typeof AuthResponseDtoSchema>;
