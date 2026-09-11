import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { AppError } from '../errors/app-error';

/**
 * Middleware authorize(): RBAC baseado em role (item 7).
 * Exige que req.user (definido por authenticate) tenha um dos roles permitidos.
 *
 * Regras de ownership mais finas (ex.: SELLER só acessa os próprios registros)
 * são responsabilidade dos services, não deste middleware.
 */
export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('UNAUTHORIZED');
    }
    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError('FORBIDDEN', 'Você não tem permissão para acessar este recurso.');
    }
    next();
  };
}
