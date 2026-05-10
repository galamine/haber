import { ExtractJwt, Strategy as JwtStrategy } from 'passport-jwt';
import config from './config';
import prisma from './prisma';
import { tokenTypes } from './tokens';

const jwtOptions = {
  secretOrKey: config.jwt.secret,
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
};

const jwtVerify = async (
  payload: { sub: string; type: string },
  done: (error: Error | null, user?: false | null | any) => void
) => {
  try {
    if (payload.type !== tokenTypes.ACCESS) {
      throw new Error('Invalid token type');
    }
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tenantId: true,
        clinic: { select: { status: true, deletedAt: true } },
      },
    });
    if (!user) {
      return done(null, false);
    }
    if (user.clinic && (user.clinic.status === 'suspended' || user.clinic.deletedAt !== null)) {
      return done(new Error('CLINIC_SUSPENDED'), false);
    }
    done(null, user);
  } catch (error) {
    done(error as Error, false);
  }
};

const jwtStrategy = new JwtStrategy(jwtOptions, jwtVerify);

export { jwtStrategy };
