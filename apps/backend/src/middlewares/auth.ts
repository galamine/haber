import type { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import passport from 'passport';
import { roleRights } from '../config/roles';
import { ApiError } from '../utils/ApiError';

type VerifyCallback = (err: Error | null, user?: null | false | Express.User, info?: unknown) => void;

const verifyCallback =
  (req: Request, resolve: (value?: unknown) => void, reject: (reason?: ApiError) => void, requiredRights: string[]) =>
  async (err: Error | null, user?: null | false | Express.User, info?: unknown) => {
    if (err || info || !user) {
      if (err instanceof Error && err.message === 'CLINIC_SUSPENDED') {
        return reject(new ApiError(httpStatus.FORBIDDEN, 'CLINIC_SUSPENDED'));
      }
      return reject(new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate'));
    }
    req.user = user;

    if (requiredRights.length) {
      const userRole = (user as { role: string }).role;
      const userId = (user as { id: string }).id;
      const userRights = roleRights.get(userRole);
      const hasRequiredRights = requiredRights.every((requiredRight) => (userRights ?? []).includes(requiredRight));
      if (!hasRequiredRights && req.params.userId !== userId) {
        return reject(new ApiError(httpStatus.FORBIDDEN, 'Forbidden'));
      }
    }

    resolve();
  };

const auth =
  (...requiredRights: string[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    return new Promise((resolve, reject) => {
      passport.authenticate(
        'jwt',
        { session: false },
        verifyCallback(req, resolve, reject, requiredRights) as VerifyCallback
      )(req, res, next);
    })
      .then(() => next())
      .catch((err) => next(err as ApiError));
  };

export default auth;
