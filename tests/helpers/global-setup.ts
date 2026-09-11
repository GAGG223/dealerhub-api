import { PrismaClient } from '@prisma/client';
import type { GlobalSetupContext } from 'vitest/node';

/**
 * globalSetup do Vitest: roda UMA vez antes de toda a suíte.
 * Detecta se há um banco acessível e disponibiliza a flag aos testes via
 * o mecanismo provide/inject do Vitest. Isso evita top-level await nos
 * arquivos de teste (incompatível com o target CommonJS do tsc) mantendo
 * o skip condicional das suites de integração.
 */
export default async function setup({ provide }: GlobalSetupContext): Promise<void> {
  const prisma = new PrismaClient();
  let available = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    available = true;
  } catch {
    available = false;
  } finally {
    await prisma.$disconnect();
  }
  provide('dbAvailable', available);
}

declare module 'vitest' {
  export interface ProvidedContext {
    dbAvailable: boolean;
  }
}
