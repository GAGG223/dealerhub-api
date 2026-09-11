import { PrismaClient } from '@prisma/client';
import { isProduction } from '../../config/env';

/**
 * Singleton do PrismaClient.
 * Evita esgotar o pool de conexões durante hot-reload em desenvolvimento
 * reaproveitando a instância no escopo global.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProduction ? ['error'] : ['error', 'warn'],
  });

if (!isProduction) {
  globalForPrisma.prisma = prisma;
}
