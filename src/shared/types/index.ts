import type { Role } from '@prisma/client';

/**
 * Payload do usuário autenticado (derivado do JWT), anexado a req.user.
 * dealershipId é null apenas para SUPER_ADMIN (dono da plataforma).
 */
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  dealershipId: string | null;
}

/** Metadados de paginação retornados nas listagens. */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Envelope padrão de resposta paginada. */
export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

/** Parâmetros de paginação já normalizados. */
export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

// Augmentation do Express: adiciona req.user e req.tenantId tipados.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      tenantId?: string | null;
    }
  }
}
