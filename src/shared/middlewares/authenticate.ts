import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error';
import { verifyAccessToken } from '../utils/jwt';

/**
 * Middleware authenticate(): valida o Bearer token e popula req.user.
 * Rotas protegidas devem usá-lo antes de authorize()/tenantScope().
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    throw new AppError('UNAUTHORIZED', 'Token de acesso ausente.');
  }

  const token = header.slice('Bearer '.length).trim();
  const payload = verifyAccessToken(token);

  req.user = {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
    dealershipId: payload.dealershipId,
  };

  next();
}
