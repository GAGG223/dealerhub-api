import type { Prisma } from '@prisma/client';
import { prisma } from '../../shared/database/prisma';
import { AppError } from '../../shared/errors/app-error';
import { hashPassword } from '../../shared/utils/hash';
import { paginated, resolvePagination } from '../../shared/utils/pagination';
import { recordAudit } from '../audit/audit.service';
import type {
  CreateDealershipInput,
  ListDealershipsQuery,
  UpdateDealershipInput,
} from './dealerships.schema';

/**
 * Módulo de concessionárias (item 9). Todas as operações aqui são exclusivas
 * do SUPER_ADMIN (garantido por authorize no router). Este é o único módulo
 * que opera cross-tenant, pois gerencia os próprios tenants da plataforma.
 */

export async function createDealership(input: CreateDealershipInput, actorUserId?: string) {
  // Se um admin inicial foi informado, garantimos que o e-mail é único antes.
  if (input.admin) {
    const existing = await prisma.user.findUnique({ where: { email: input.admin.email } });
    if (existing) {
      throw new AppError('DUPLICATE_EMAIL', 'E-mail do administrador já está em uso.');
    }
  }

  const adminPasswordHash = input.admin ? await hashPassword(input.admin.password) : null;

  const result = await prisma.$transaction(async (tx) => {
    const dealership = await tx.dealership.create({
      data: {
        name: input.name,
        legalName: input.legalName,
        document: input.document,
        email: input.email,
        phone: input.phone,
        address: input.address ?? null,
        city: input.city ?? null,
        state: input.state ?? null,
        zipCode: input.zipCode ?? null,
      },
    });

    let admin = null;
    if (input.admin && adminPasswordHash) {
      admin = await tx.user.create({
        data: {
          dealershipId: dealership.id,
          name: input.admin.name,
          email: input.admin.email,
          passwordHash: adminPasswordHash,
          role: 'ADMIN',
        },
        select: { id: true, name: true, email: true, role: true },
      });

      await recordAudit(
        {
          action: 'USER_CREATED',
          entity: 'User',
          entityId: admin.id,
          dealershipId: dealership.id,
          userId: actorUserId ?? null,
        },
        tx,
      );
    }

    await recordAudit(
      {
        action: 'DEALERSHIP_CREATED',
        entity: 'Dealership',
        entityId: dealership.id,
        dealershipId: dealership.id,
        userId: actorUserId ?? null,
      },
      tx,
    );

    return { dealership, admin };
  });

  return result;
}

export async function listDealerships(query: ListDealershipsQuery) {
  const { page, limit, skip, take } = resolvePagination(query.page, query.limit);

  const where: Prisma.DealershipWhereInput = {};
  if (typeof query.active === 'boolean') {
    where.active = query.active;
  }
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { legalName: { contains: query.search, mode: 'insensitive' } },
      { document: { contains: query.search.replace(/\D/g, '') } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.dealership.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
    prisma.dealership.count({ where }),
  ]);

  return paginated(data, page, limit, total);
}

export async function getDealership(id: string) {
  const dealership = await prisma.dealership.findUnique({
    where: { id },
    include: {
      _count: {
        select: { users: true, vehicles: true, customers: true, sales: true },
      },
    },
  });
  if (!dealership) {
    throw new AppError('DEALERSHIP_NOT_FOUND');
  }
  return dealership;
}

export async function updateDealership(
  id: string,
  input: UpdateDealershipInput,
  actorUserId?: string,
) {
  const existing = await prisma.dealership.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('DEALERSHIP_NOT_FOUND');
  }

  const dealership = await prisma.dealership.update({
    where: { id },
    data: input,
  });

  await recordAudit({
    action: 'DEALERSHIP_UPDATED',
    entity: 'Dealership',
    entityId: id,
    dealershipId: id,
    userId: actorUserId ?? null,
  });

  return dealership;
}

/** Soft delete: desativa a concessionária (não removemos dados). */
export async function deactivateDealership(id: string, actorUserId?: string) {
  const existing = await prisma.dealership.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('DEALERSHIP_NOT_FOUND');
  }

  const dealership = await prisma.dealership.update({
    where: { id },
    data: { active: false },
  });

  await recordAudit({
    action: 'DEALERSHIP_DEACTIVATED',
    entity: 'Dealership',
    entityId: id,
    dealershipId: id,
    userId: actorUserId ?? null,
  });

  return dealership;
}
