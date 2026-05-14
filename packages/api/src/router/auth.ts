import { OtpStatus, OtpType, UserRole } from '@haber-full/shared';
import argon2 from 'argon2';
import { SignJWT } from 'jose';
import { Resend } from 'resend';
import { z } from 'zod';
import { prisma } from '../db';
import { env } from '../env';
import { publicProcedure, router } from '../trpc';

const resend = new Resend(env.RESEND_API_KEY);

async function generateOtp(email: string, type: OtpType) {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + env.OTP_EXPIRES_IN_MINUTES * 60 * 1000);

  const otp = await prisma.otp.create({
    data: {
      email,
      code,
      type,
      expiresAt,
    },
  });

  await resend.emails.send({
    from: 'Haber Full <noreply@haberfull.com>',
    to: email,
    subject: `Your verification code: ${code}`,
    html: `<p>Your code is: <strong>${code}</strong></p><p>It expires in ${env.OTP_EXPIRES_IN_MINUTES} minutes.</p>`,
  });

  return otp;
}

async function createTokens(userId: string) {
  const secret = new TextEncoder().encode(env.JWT_SECRET);

  const accessToken = await new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .sign(secret);

  const refreshToken = await new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(env.JWT_REFRESH_EXPIRES_IN)
    .sign(secret);

  await prisma.session.create({
    data: {
      userId,
      refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return { accessToken, refreshToken };
}

export const authRouter = router({
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().min(1).optional(),
        password: z.string().min(8),
      })
    )
    .mutation(async ({ input }) => {
      const hashedPassword = await argon2.hash(input.password);
      const user = await prisma.user.create({
        data: {
          email: input.email,
          name: input.name,
          password: hashedPassword,
          role: UserRole.USER,
        },
      });
      return { id: user.id, email: user.email };
    }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const user = await prisma.user.findUnique({ where: { email: input.email } });
      if (!user) {
        throw new Error('Invalid credentials');
      }

      const valid = await argon2.verify(user.password, input.password);
      if (!valid) {
        throw new Error('Invalid credentials');
      }

      const { accessToken, refreshToken } = await createTokens(user.id);
      return { accessToken, refreshToken };
    }),

  requestOtp: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        type: z.nativeEnum(OtpType),
      })
    )
    .mutation(async ({ input }) => {
      await generateOtp(input.email, input.type);
      return { success: true, message: 'OTP sent to email' };
    }),

  verifyOtp: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        code: z.string().length(6),
        type: z.nativeEnum(OtpType),
      })
    )
    .mutation(async ({ input }) => {
      const otp = await prisma.otp.findFirst({
        where: {
          email: input.email,
          code: input.code,
          type: input.type,
          status: OtpStatus.PENDING,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!otp) {
        throw new Error('Invalid or expired OTP');
      }

      await prisma.otp.update({
        where: { id: otp.id },
        data: { status: OtpStatus.VERIFIED, verifiedAt: new Date() },
      });

      if (input.type === OtpType.EMAIL_VERIFICATION) {
        await prisma.user.update({
          where: { email: input.email },
          data: { emailVerified: true },
        });
      }

      return { success: true };
    }),

  refreshToken: publicProcedure
    .input(
      z.object({
        refreshToken: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const session = await prisma.session.findUnique({
        where: { refreshToken: input.refreshToken },
      });

      if (!session || session.revoked || session.expiresAt < new Date()) {
        throw new Error('Invalid refresh token');
      }

      await prisma.session.update({
        where: { id: session.id },
        data: { revoked: true },
      });

      const { accessToken, refreshToken } = await createTokens(session.userId);
      return { accessToken, refreshToken };
    }),

  logout: publicProcedure
    .input(
      z.object({
        refreshToken: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      await prisma.session.update({
        where: { refreshToken: input.refreshToken },
        data: { revoked: true },
      });
      return { success: true };
    }),
});
