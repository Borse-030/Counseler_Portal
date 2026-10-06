import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const OTP_BCRYPT_COST = Number(process.env.OTP_BCRYPT_COST || 10);

const getJwtSecret = () => process.env.JWT_SECRET || 'mindease-dev-jwt-secret-change-me';

const base64UrlEncode = (input) => Buffer.from(input).toString('base64url');

const base64UrlDecodeJson = (input) => JSON.parse(Buffer.from(input, 'base64url').toString('utf8'));

const signJwt = (payload, expiresInSeconds) => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds
  };

  const unsigned = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(body))}`;
  const signature = crypto
    .createHmac('sha256', getJwtSecret())
    .update(unsigned)
    .digest('base64url');

  return `${unsigned}.${signature}`;
};

export const issueAuthTokens = (userId) => {
  const accessToken = signJwt({ sub: userId, type: 'access' }, ACCESS_TOKEN_TTL_SECONDS);
  const refreshToken = signJwt({ sub: userId, type: 'refresh' }, REFRESH_TOKEN_TTL_SECONDS);

  return {
    token: accessToken,
    accessToken,
    refreshToken
  };
};

export const verifyJwt = (token, expectedType = 'access') => {
  const [encodedHeader, encodedPayload, signature] = token.split('.');
  if (!encodedHeader || !encodedPayload || !signature) {
    throw new Error('Malformed token');
  }

  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = crypto
    .createHmac('sha256', getJwtSecret())
    .update(unsigned)
    .digest('base64url');

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw new Error('Invalid token signature');
  }

  const payload = base64UrlDecodeJson(encodedPayload);
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }
  if (expectedType && payload.type !== expectedType) {
    throw new Error('Invalid token type');
  }

  return payload;
};

export const getUserIdFromToken = (token) => {
  if (token.includes('.')) {
    return verifyJwt(token, 'access').sub;
  }

  // Backward compatibility for existing local sessions created before JWTs.
  return Buffer.from(token, 'base64').toString('ascii');
};

export const normalizeMobile = (mobile = '') => mobile.replace(/\D/g, '').slice(-10);

export const isValidMobile = (mobile = '') => normalizeMobile(mobile).length === 10;

export const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

export const hashOtp = (otp) => bcrypt.hash(String(otp), OTP_BCRYPT_COST);

export const compareOtp = (otp, encodedHash) => bcrypt.compare(String(otp), encodedHash);
