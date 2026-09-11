import { prisma } from '../../src/shared/database/prisma';
import { hashPassword } from '../../src/shared/utils/hash';
import { signAccessToken } from '../../src/shared/utils/jwt';
import type { Role } from '@prisma/client';

let counter = 0;
function uniq(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

export async function createDealership(name = 'Alpha') {
  return prisma.dealership.create({
    data: {
      name,
      legalName: `${name} LTDA`,
      document: uniq('doc').replace(/\D/g, '').padEnd(14, '0').slice(0, 14),
      email: `${uniq('contato')}@ex.com`,
      phone: '11999999999',
    },
  });
}

export async function createUser(
  dealershipId: string | null,
  role: Role = 'ADMIN',
  password = 'senha1234',
) {
  const user = await prisma.user.create({
    data: {
      dealershipId,
      name: `User ${role}`,
      email: `${uniq('user')}@ex.com`,
      passwordHash: await hashPassword(password),
      role,
    },
  });
  return user;
}

/** Gera um access token válido para um usuário (atalho para testes). */
export function tokenFor(user: {
  id: string;
  email: string;
  role: Role;
  dealershipId: string | null;
}): string {
  return signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    dealershipId: user.dealershipId,
  });
}

export async function createVehicle(dealershipId: string, overrides: Record<string, unknown> = {}) {
  return prisma.vehicle.create({
    data: {
      dealershipId,
      brand: 'Toyota',
      model: 'Corolla',
      year: 2022,
      mileage: 10000,
      price: 120000,
      status: 'AVAILABLE',
      ...overrides,
    },
  });
}

export async function createCustomer(dealershipId: string, sellerId?: string) {
  return prisma.customer.create({
    data: {
      dealershipId,
      sellerId: sellerId ?? null,
      name: `Cliente ${uniq('c')}`,
    },
  });
}

export function bearer(token: string): string {
  return `Bearer ${token}`;
}
