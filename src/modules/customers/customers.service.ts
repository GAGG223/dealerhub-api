import type { Prisma } from '@prisma/client';
import { prisma } from '../../shared/database/prisma';
import { AppError } from '../../shared/errors/app-error';
import { paginated, resolvePagination } from '../../shared/utils/pagination';
import { parseSort } from '../../shared/utils/sort';
import { sellerScopeFilter } from '../../shared/utils/ownership';
import type { AuthUser } from '../../shared/types';
import { recordAudit } from '../audit/audit.service';
import type {
  CreateCustomerInput,
  ListCustomersQuery,
  UpdateCustomerInput,
} from './customers.schema';

/**
 * Clientes (item 15). Escopados ao tenant e, para SELLER, também ao próprio
 * vendedor (ownership). Ao criar, um SELLER vira automaticamente o responsável.
 */

const SORTABLE = ['name', 'createdAt'] as const;

export async function createCustomer(user: AuthUser, input: CreateCustomerInput) {
  const dealershipId = user.dealershipId!;
  // Se quem cria é um SELLER, ele é o responsável pelo cliente.
  const sellerId = user.role === 'SELLER' ? user.id : null;

  const customer = await prisma.customer.create({
    data: {
      dealershipId,
      sellerId,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      cpf: input.cpf ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      notes: input.notes ?? null,
    },
  });

  await recordAudit({
    action: 'CUSTOMER_CREATED',
    entity: 'Customer',
    entityId: customer.id,
    dealershipId,
    userId: user.id,
  });

  return customer;
}

export async function listCustomers(user: AuthUser, query: ListCustomersQuery) {
  const { page, limit, skip, take } = resolvePagination(query.page, query.limit);

  const where: Prisma.CustomerWhereInput = {
    dealershipId: user.dealershipId!,
    ...sellerScopeFilter(user),
  };
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
      { cpf: { contains: query.search.replace(/\D/g, '') } },
    ];
  }

  const orderBy = parseSort(query.sort, SORTABLE, { createdAt: 'desc' });

  const [data, total] = await Promise.all([
    prisma.customer.findMany({ where, skip, take, orderBy }),
    prisma.customer.count({ where }),
  ]);

  return paginated(data, page, limit, total);
}

/** Busca escopada a tenant + ownership do SELLER. */
export async function getCustomer(user: AuthUser, id: string) {
  const customer = await prisma.customer.findFirst({
    where: { id, dealershipId: user.dealershipId!, ...sellerScopeFilter(user) },
  });
  if (!customer) {
    throw new AppError('CUSTOMER_NOT_FOUND');
  }
  return customer;
}

export async function updateCustomer(user: AuthUser, id: string, input: UpdateCustomerInput) {
  await getCustomer(user, id);

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      cpf: input.cpf,
      city: input.city,
      state: input.state,
      notes: input.notes,
    },
  });

  await recordAudit({
    action: 'CUSTOMER_UPDATED',
    entity: 'Customer',
    entityId: id,
    dealershipId: user.dealershipId,
    userId: user.id,
  });

  return customer;
}

export async function deleteCustomer(user: AuthUser, id: string) {
  await getCustomer(user, id);
  await prisma.customer.delete({ where: { id } });

  await recordAudit({
    action: 'CUSTOMER_DELETED',
    entity: 'Customer',
    entityId: id,
    dealershipId: user.dealershipId,
    userId: user.id,
  });

  return { id };
}
