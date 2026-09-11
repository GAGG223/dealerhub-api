import type { Prisma } from '@prisma/client';
import { prisma } from '../../shared/database/prisma';
import { AppError } from '../../shared/errors/app-error';
import { hashPassword } from '../../shared/utils/hash';
import { paginated, resolvePagination } from '../../shared/utils/pagination';
import { recordAudit } from '../audit/audit.service';
import { toSafeUser, type SafeUser } from '../auth/auth.service';
import type { CreateUserInput, ListUsersQuery, UpdateUserInput } from './users.schema';

/**
 * Gestão de usuários da concessionária (item 6). Todas as operações são
 * escopadas ao tenant do ADMIN autenticado: nunca acessam usuários de outro
 * tenant, mesmo que um id externo seja informado (retorna USER_NOT_FOUND).
 */

export async function createUser(
  dealershipId: string,
  input: CreateUserInput,
  actorUserId: string,
): Promise<SafeUser> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError('DUPLICATE_EMAIL');
  }

  const user = await prisma.user.create({
    data: {
      dealershipId,
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      role: input.role,
      phone: input.phone ?? null,
      position: input.position ?? null,
    },
  });

  await recordAudit({
    action: 'USER_CREATED',
    entity: 'User',
    entityId: user.id,
    dealershipId,
    userId: actorUserId,
  });

  return toSafeUser(user);
}

export async function listUsers(dealershipId: string, query: ListUsersQuery) {
  const { page, limit, skip, take } = resolvePagination(query.page, query.limit);

  const where: Prisma.UserWhereInput = { dealershipId };
  if (query.role) {
    where.role = query.role;
  }
  if (typeof query.active === 'boolean') {
    where.active = query.active;
  }
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
    prisma.user.count({ where }),
  ]);

  return paginated(users.map(toSafeUser), page, limit, total);
}

/** Busca escopada ao tenant: id de outro tenant retorna not found (isolamento). */
async function findUserInTenant(dealershipId: string, id: string) {
  const user = await prisma.user.findFirst({ where: { id, dealershipId } });
  if (!user) {
    throw new AppError('USER_NOT_FOUND');
  }
  return user;
}

export async function getUser(dealershipId: string, id: string): Promise<SafeUser> {
  const user = await findUserInTenant(dealershipId, id);
  return toSafeUser(user);
}

export async function updateUser(
  dealershipId: string,
  id: string,
  input: UpdateUserInput,
  actorUserId: string,
): Promise<SafeUser> {
  await findUserInTenant(dealershipId, id);

  const data: Prisma.UserUpdateInput = {
    name: input.name,
    role: input.role,
    phone: input.phone,
    position: input.position,
    active: input.active,
  };
  if (input.password) {
    data.passwordHash = await hashPassword(input.password);
  }

  const user = await prisma.user.update({ where: { id }, data });

  await recordAudit({
    action: 'USER_UPDATED',
    entity: 'User',
    entityId: id,
    dealershipId,
    userId: actorUserId,
  });

  return toSafeUser(user);
}

/** Soft delete: desativa o usuário. Impede autoexclusão do próprio ADMIN. */
export async function deactivateUser(
  dealershipId: string,
  id: string,
  actorUserId: string,
): Promise<SafeUser> {
  if (id === actorUserId) {
    throw new AppError('FORBIDDEN', 'Você não pode desativar o próprio usuário.');
  }
  await findUserInTenant(dealershipId, id);

  const user = await prisma.user.update({ where: { id }, data: { active: false } });

  await recordAudit({
    action: 'USER_DELETED',
    entity: 'User',
    entityId: id,
    dealershipId,
    userId: actorUserId,
  });

  return toSafeUser(user);
}
