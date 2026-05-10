import type { Response } from 'express';
import httpStatus from 'http-status';
import { authService, otpService, tokenService, userService } from '../services';
import type { AuthRequest } from '../types';
import { ApiError } from '../utils/ApiError';
import { catchAsync } from '../utils/catchAsync';

const requestOtp = catchAsync(async (req: AuthRequest, res: Response) => {
  const result = await otpService.requestOtp(req.body.email);
  res.send(result);
});

const verifyOtp = catchAsync(async (req: AuthRequest, res: Response) => {
  const { user, tokens } = await authService.authenticateWithOtp(req.body.email, req.body.otp);
  const userDto = await userService.getUserById(user.id);
  res.send({ user: userDto, tokens });
});

const refreshTokens = catchAsync(async (req: AuthRequest, res: Response) => {
  const tokens = await tokenService.refreshAuthTokens(req.body.refreshToken);
  res.send({ ...tokens });
});

const logout = catchAsync(async (req: AuthRequest, res: Response) => {
  await authService.logout(req.body.refreshToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const logoutAll = catchAsync(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }
  await authService.logoutAll((req.user as { id: string }).id);
  res.status(httpStatus.NO_CONTENT).send();
});

const authController = { requestOtp, verifyOtp, refreshTokens, logout, logoutAll };
export default authController;
