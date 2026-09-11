import { prisma } from '../../src/shared/database/prisma';

/**
 * Verifica se há um banco acessível. Usado para pular (skip) suites de
 * integração de forma controlada quando o Postgres não está disponível
 * (ex.: rodar apenas unitários localmente sem docker).
 */
export async function isDatabaseAvailable(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/**
 * Limpa todas as tabelas respeitando as FKs (ordem de dependência).
 * Executado antes de cada suite de integração para isolamento.
 */
export async function resetDatabase(): Promise<void> {
  // A ordem importa por causa das foreign keys.
  await prisma.auditLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.tradeIn.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.proposal.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.vehicleImage.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.dealership.deleteMany();
}
