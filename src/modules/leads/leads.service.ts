import type { Prisma } from '@prisma/client';
import { prisma } from '../../shared/database/prisma';
import { AppError } from '../../shared/errors/app-error';
import { paginated, resolvePagination } from '../../shared/utils/pagination';
import { parseSort } from '../../shared/utils/sort';
import { sellerScopeFilter } from '../../shared/utils/ownership';
import type { AuthUser } from '../../shared/types';
import { recordAudit } from '../audit/audit.service';
import type {
  CreateLeadInput,
  ListLeadsQuery,
  UpdateLeadInput,
} from './leads.schema';

/**
 * Leads / CRM (item 17). Escopados ao tenant e, para SELLER, ao próprio dono.
 * Referências (customer/vehicle/seller) são validadas contra o mesmo tenant
 * para impedir cross-tenant via IDs manipulados.
 */

const SORTABLE = ['createdAt', 'status'] as const;

async function assertCustomerInTenant(dealershipId: string, customerId: string) {
  const customer = await prisma.customer.findFirst({ where: { id: customerId, dealershipId } });
  if (!customer) {
    throw new AppError('CUSTOMER_NOT_FOUND');
  }
}

async function assertVehicleInTenant(dealershipId: string, vehicleId: string) {
  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, dealershipId } });
  if (!vehicle) {
    throw new AppError('VEHICLE_NOT_FOUND');
  }
}

async function assertSellerInTenant(dealershipId: string, sellerId: string) {
  const seller = await prisma.user.findFirst({ where: { id: sellerId, dealershipId } });
  if (!seller) {
    throw new AppError('USER_NOT_FOUND', 'Vendedor não encontrado nesta concessionária.');
  }
}

export async function createLead(user: AuthUser, input: CreateLeadInput) {
  const dealershipId = user.dealershipId!;

  await assertCustomerInTenant(dealershipId, input.customerId);
  if (input.vehicleId) await assertVehicleInTenant(dealershipId, input.vehicleId);

  // SELLER só pode atribuir o lead a si mesmo.
  let sellerId = input.sellerId ?? null;
  if (user.role === 'SELLER') {
    sellerId = user.id;
  } else if (sellerId) {
    await assertSellerInTenant(dealershipId, sellerId);
  }

  const lead = await prisma.lead.create({
    data: {
      dealershipId,
      customerId: input.customerId,
      vehicleId: input.vehicleId ?? null,
      sellerId,
      source: input.source,
      status: input.status,
      notes: input.notes ?? null,
    },
  });

  await recordAudit({
    action: 'LEAD_CREATED',
    entity: 'Lead',
    entityId: lead.id,
    dealershipId,
    userId: user.id,
  });

  return lead;
}

export async function listLeads(user: AuthUser, query: ListLeadsQuery) {
  const { page, limit, skip, take } = resolvePagination(query.page, query.limit);

  const where: Prisma.LeadWhereInput = {
    dealershipId: user.dealershipId!,
    ...sellerScopeFilter(user),
  };
  if (query.status) where.status = query.status;
  if (query.source) where.source = query.source;
  // Filtro por sellerId só é respeitado para não-SELLER (SELLER já é filtrado).
  if (query.sellerId && user.role !== 'SELLER') where.sellerId = query.sellerId;

  const orderBy = parseSort(query.sort, SORTABLE, { createdAt: 'desc' });

  const [data, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        customer: { select: { id: true, name: true } },
        vehicle: { select: { id: true, brand: true, model: true } },
      },
    }),
    prisma.lead.count({ where }),
  ]);

  return paginated(data, page, limit, total);
}

export async function getLead(user: AuthUser, id: string) {
  const lead = await prisma.lead.findFirst({
    where: { id, dealershipId: user.dealershipId!, ...sellerScopeFilter(user) },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
      vehicle: { select: { id: true, brand: true, model: true, price: true } },
    },
  });
  if (!lead) {
    throw new AppError('LEAD_NOT_FOUND');
  }
  return lead;
}

export async function updateLead(user: AuthUser, id: string, input: UpdateLeadInput) {
  const dealershipId = user.dealershipId!;
  await getLead(user, id);

  if (input.vehicleId) await assertVehicleInTenant(dealershipId, input.vehicleId);
  if (input.sellerId && user.role !== 'SELLER') {
    await assertSellerInTenant(dealershipId, input.sellerId);
  }

  const lead = await prisma.lead.update({
    where: { id },
    data: {
      vehicleId: input.vehicleId,
      // SELLER não pode reatribuir o lead para outra pessoa.
      sellerId: user.role === 'SELLER' ? undefined : input.sellerId,
      source: input.source,
      notes: input.notes,
    },
  });

  await recordAudit({
    action: 'LEAD_UPDATED',
    entity: 'Lead',
    entityId: id,
    dealershipId,
    userId: user.id,
  });

  return lead;
}

export async function updateLeadStatus(
  user: AuthUser,
  id: string,
  status: CreateLeadInput['status'],
) {
  await getLead(user, id);

  const lead = await prisma.lead.update({ where: { id }, data: { status } });

  await recordAudit({
    action: 'LEAD_UPDATED',
    entity: 'Lead',
    entityId: id,
    dealershipId: user.dealershipId,
    userId: user.id,
    metadata: { status },
  });

  return lead;
}
