import moment from 'moment';
import config from '../../src/config/config';
import { TokenType } from '../../src/config/tokens';
import { tokenService } from '../../src/services/token.service';
import { admin, userOne } from './user.fixture';

const accessTokenExpires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');

const userOneAccessToken = tokenService.generateToken(
  userOne.id,
  userOne.role,
  userOne.tenantId,
  accessTokenExpires,
  TokenType.ACCESS
);

const adminAccessToken = tokenService.generateToken(
  admin.id,
  admin.role,
  admin.tenantId,
  accessTokenExpires,
  TokenType.ACCESS
);

export { adminAccessToken, userOneAccessToken };
