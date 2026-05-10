import { LogoutDtoSchema, RefreshTokensDtoSchema, RequestOtpDtoSchema, VerifyOtpDtoSchema } from '@haber/shared';

const requestOtp = { body: RequestOtpDtoSchema };
const verifyOtp = { body: VerifyOtpDtoSchema };
const logout = { body: LogoutDtoSchema };
const refreshTokens = { body: RefreshTokensDtoSchema };

export default { requestOtp, verifyOtp, logout, refreshTokens };
