import jwt, { type SignOptions } from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from '../../config/env';
import { AppError } from '../errors/app-error';

/** Claims que carregamos no access token. */
export interface AccessTokenPayload {
  sub: string; // userId
  email: string;
  role: Role;
  dealershipId: string | null;
}

/** Claims do refresh token (mínimo necessário). */
export interface RefreshTokenPayload {
  sub: string; // userId
  jti: string; // id único do token (para rastreio/revogação)
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as SignOptions);
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
  } catch (err) {
    throw mapJwtError(err);
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
  } catch (err) {
    throw mapJwtError(err);
  }
}

function mapJwtError(err: unknown): AppError {
  if (err instanceof jwt.TokenExpiredError) {
    return new AppError('TOKEN_EXPIRED');
  }
  return new AppError('INVALID_TOKEN');
}
