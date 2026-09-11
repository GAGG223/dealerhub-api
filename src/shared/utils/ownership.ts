import type { AuthUser } from '../types';

/**
 * Regra de ownership para SELLER (item 7): o vendedor só enxerga/gerencia os
 * próprios registros (clientes, leads, propostas atribuídos a ele).
 * ADMIN e MANAGER enxergam todos os registros do tenant.
 *
 * Retorna um fragmento de filtro { sellerId } quando o usuário é SELLER,
 * ou {} caso contrário — para ser mesclado no where das queries.
 */
export function sellerScopeFilter(user: AuthUser): { sellerId?: string } {
  if (user.role === 'SELLER') {
    return { sellerId: user.id };
  }
  return {};
}

export function isSeller(user: AuthUser): boolean {
  return user.role === 'SELLER';
}
