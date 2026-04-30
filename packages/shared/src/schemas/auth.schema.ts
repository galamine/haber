import { z } from 'zod';
import { passwordSchema, UserDtoSchema } from './user.schema';

export const RegisterDtoSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: passwordSchema,
});

export const LoginDtoSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const LogoutDtoSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const RefreshTokensDtoSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const ForgotPasswordDtoSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const ResetPasswordDtoSchema = z.object({
  password: passwordSchema,
});

export const TokenQuerySchema = z.object({
  token: z.string().min(1, 'Token is required'),
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

export type RegisterDto = z.infer<typeof RegisterDtoSchema>;
export type LoginDto = z.infer<typeof LoginDtoSchema>;
export type LogoutDto = z.infer<typeof LogoutDtoSchema>;
export type RefreshTokensDto = z.infer<typeof RefreshTokensDtoSchema>;
export type ForgotPasswordDto = z.infer<typeof ForgotPasswordDtoSchema>;
export type ResetPasswordDto = z.infer<typeof ResetPasswordDtoSchema>;
export type TokenPayloadDto = z.infer<typeof TokenPayloadDtoSchema>;
export type AuthTokensDto = z.infer<typeof AuthTokensDtoSchema>;
export type AuthResponseDto = z.infer<typeof AuthResponseDtoSchema>;
