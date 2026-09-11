import type { Prisma } from '@prisma/client';
import { prisma } from '../../shared/database/prisma';
import { AppError } from '../../shared/errors/app-error';
import { paginated, resolvePagination } from '../../shared/utils/pagination';
import { parseSort } from '../../shared/utils/sort';
import { sellerScopeFilter } from '../../shared/utils/ownership';
import type { AuthUser } from '../../shared/types';
import { recordAudit } from '../audit/audit.service';
import type {
  CreateProposalInput,
  ListProposalsQuery,
  UpdateProposalInput,
} from './proposals.schema';

/**
 * Propostas (item 18): negociação antes da venda. Escopadas ao tenant e, para
 * SELLER, ao próprio dono. customer/vehicle validados dentro do tenant.
 */

const SORTABLE = ['createdAt', 'proposedPrice', 'status'] as const;

async function assertCustomerInTenant(dealershipId: string, customerId: string) {
  const customer = await prisma.customer.findFirst({ where: { id: customerId, dealershipId } });
  if (!customer) throw new AppError('CUSTOMER_NOT_FOUND');
}

async function assertVehicleInTenant(dealershipId: string, vehicleId: string) {
  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, dealershipId } });
  if (!vehicle) throw new AppError('VEHICLE_NOT_FOUND');
}

export async function createProposal(user: AuthUser, input: CreateProposalInput) {
  const dealershipId = user.dealershipId!;

  await assertCustomerInTenant(dealershipId, input.customerId);
  await assertVehicleInTenant(dealershipId, input.vehicleId);

  const sellerId = user.role === 'SELLER' ? user.id : (input.sellerId ?? user.id);

  const proposal = await prisma.proposal.create({
    data: {
      dealershipId,
      customerId: input.customerId,
      vehicleId: input.vehicleId,
      sellerId,
      proposedPrice: input.proposedPrice,
      downPayment: input.downPayment ?? null,
      financingAmount: input.financingAmount ?? null,
      installments: input.installments ?? null,
      interestRate: input.interestRate ?? null,
      status: input.status,
      notes: input.notes ?? null,
    },
  });

  await recordAudit({
    action: 'PROPOSAL_CREATED',
    entity: 'Proposal',
    entityId: proposal.id,
    dealershipId,
    userId: user.id,
  });

  return proposal;
}

export async function listProposals(user: AuthUser, query: ListProposalsQuery) {
  const { page, limit, skip, take } = resolvePagination(query.page, query.limit);

  const where: Prisma.ProposalWhereInput = {
    dealershipId: user.dealershipId!,
    ...sellerScopeFilter(user),
  };
  if (query.status) where.status = query.status;
  if (query.customerId) where.customerId = query.customerId;

  const orderBy = parseSort(query.sort, SORTABLE, { createdAt: 'desc' });

  const [data, total] = await Promise.all([
    prisma.proposal.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        customer: { select: { id: true, name: true } },
        vehicle: { select: { id: true, brand: true, model: true } },
      },
    }),
    prisma.proposal.count({ where }),
  ]);

  return paginated(data, page, limit, total);
}

export async function getProposal(user: AuthUser, id: string) {
  const proposal = await prisma.proposal.findFirst({
    where: { id, dealershipId: user.dealershipId!, ...sellerScopeFilter(user) },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      vehicle: { select: { id: true, brand: true, model: true, price: true } },
    },
  });
  if (!proposal) {
    throw new AppError('PROPOSAL_NOT_FOUND');
  }
  return proposal;
}

export async function updateProposal(user: AuthUser, id: string, input: UpdateProposalInput) {
  await getProposal(user, id);

  const proposal = await prisma.proposal.update({
    where: { id },
    data: {
      proposedPrice: input.proposedPrice,
      downPayment: input.downPayment,
      financingAmount: input.financingAmount,
      installments: input.installments,
      interestRate: input.interestRate,
      status: input.status,
      notes: input.notes,
    },
  });

  await recordAudit({
    action: 'PROPOSAL_UPDATED',
    entity: 'Proposal',
    entityId: id,
    dealershipId: user.dealershipId,
    userId: user.id,
  });

  return proposal;
}

export async function deleteProposal(user: AuthUser, id: string) {
  await getProposal(user, id);
  await prisma.proposal.delete({ where: { id } });

  await recordAudit({
    action: 'PROPOSAL_UPDATED',
    entity: 'Proposal',
    entityId: id,
    dealershipId: user.dealershipId,
    userId: user.id,
    metadata: { deleted: true },
  });

  return { id };
}
