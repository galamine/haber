import { z } from 'zod';
import { OtpStatus, OtpType, UserRole } from '../enums';

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(255).nullable(),
  role: z.nativeEnum(UserRole).default(UserRole.USER),
  emailVerified: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255).optional(),
  password: z.string().min(8).max(255),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const OtpSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  code: z.string().length(6),
  type: z.nativeEnum(OtpType),
  status: z.nativeEnum(OtpStatus).default(OtpStatus.PENDING),
  expiresAt: z.date(),
  verifiedAt: z.date().nullable(),
  createdAt: z.date(),
});

export type Otp = z.infer<typeof OtpSchema>;

export const RequestOtpSchema = z.object({
  email: z.string().email(),
  type: z.nativeEnum(OtpType),
});

export type RequestOtpInput = z.infer<typeof RequestOtpSchema>;

export const VerifyOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  type: z.nativeEnum(OtpType),
});

export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const AuthResponseSchema = z.object({
  user: UserSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export const RefreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
