import type { AuditAction, Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../../shared/database/prisma';
import { logger } from '../../shared/utils/logger';

export interface AuditInput {
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  dealershipId?: string | null;
  userId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
}

type PrismaLike = PrismaClient | Prisma.TransactionClient;

/**
 * Registra uma ação de auditoria (item 25).
 * Pode receber um client transacional (tx) para participar de transações
 * críticas (ex.: conclusão de venda) — assim o audit é revertido junto se a
 * transação falhar. Fora de transação, uma falha ao auditar não deve derrubar
 * a operação principal, então logamos o erro sem propagá-lo.
 */
export async function recordAudit(input: AuditInput, client: PrismaLike = prisma): Promise<void> {
  try {
    await client.auditLog.create({
      data: {
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        dealershipId: input.dealershipId ?? null,
        userId: input.userId ?? null,
        metadata: input.metadata,
        ipAddress: input.ipAddress ?? null,
      },
    });
  } catch (err) {
    if (client === prisma) {
      logger.error({ err, action: input.action }, 'Falha ao registrar auditoria');
      return;
    }
    // Dentro de transação, propagamos para garantir atomicidade.
    throw err;
  }
}

import type { AuditAction as AuditActionEnum } from '@prisma/client';
import { paginated, resolvePagination } from '../../shared/utils/pagination';
import type { ListAuditQuery } from './audit.schema';

/**
 * Lista logs de auditoria do tenant (item 25). Somente leitura — usuários não
 * podem alterar registros de auditoria (não há endpoints de update/delete).
 */
export async function listAuditLogs(dealershipId: string, query: ListAuditQuery) {
  const { page, limit, skip, take } = resolvePagination(query.page, query.limit);

  const where: Prisma.AuditLogWhereInput = { dealershipId };
  if (query.entity) where.entity = query.entity;
  if (query.action) where.action = query.action as AuditActionEnum;
  if (query.userId) where.userId = query.userId;
  if (query.from || query.to) {
    where.createdAt = {};
    if (query.from) where.createdAt.gte = query.from;
    if (query.to) where.createdAt.lte = query.to;
  }

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return paginated(data, page, limit, total);
}
