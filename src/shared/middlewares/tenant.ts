import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error';

/**
 * Middleware tenantScope(): resolve o tenant (concessionária) do usuário
 * autenticado e o expõe em req.tenantId (item 4 e 5).
 *
 * Princípio central de isolamento multi-tenant:
 * - O dealershipId NUNCA vem do body/query/URL do usuário; é sempre derivado
 *   do token de autenticação.
 * - Usuários de tenant (ADMIN/MANAGER/SELLER) precisam obrigatoriamente ter
 *   um dealershipId. Sem ele, a requisição é barrada.
 * - SUPER_ADMIN não tem tenant fixo (opera cross-tenant apenas no módulo de
 *   dealerships), então tenantId fica null e o acesso a recursos tenant-scoped
 *   deve ser barrado por requireTenant().
 */
export function tenantScope(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    throw new AppError('UNAUTHORIZED');
  }
  req.tenantId = req.user.dealershipId;
  next();
}

/**
 * Garante que a requisição tem um tenant concreto. Use em rotas de recursos
 * pertencentes a uma concessionária (veículos, clientes, vendas, etc.).
 * Retorna o tenantId já garantido como string.
 */
export function requireTenant(req: Request): string {
  if (!req.user) {
    throw new AppError('UNAUTHORIZED');
  }
  if (!req.user.dealershipId) {
    throw new AppError(
      'FORBIDDEN',
      'Este recurso exige um usuário vinculado a uma concessionária.',
    );
  }
  return req.user.dealershipId;
}
