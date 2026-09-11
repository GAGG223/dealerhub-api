import type { Prisma, SaleStatus } from '@prisma/client';
import { prisma } from '../../shared/database/prisma';
import { AppError } from '../../shared/errors/app-error';
import { paginated, resolvePagination } from '../../shared/utils/pagination';
import { parseSort } from '../../shared/utils/sort';
import { sellerScopeFilter } from '../../shared/utils/ownership';
import type { AuthUser } from '../../shared/types';
import { recordAudit } from '../audit/audit.service';
import type {
  CreatePaymentInput,
  CreateSaleInput,
  CreateTradeInInput,
  ListSalesQuery,
} from './sales.schema';

const SORTABLE = ['createdAt', 'soldAt', 'salePrice', 'status'] as const;

/**
 * Cria uma venda. Se status = COMPLETED, aplica a REGRA DE VENDA (item 20)
 * inteiramente dentro de uma transação:
 *   1. veículo pertence ao tenant
 *   2. veículo está AVAILABLE ou RESERVED
 *   3. cliente existe no tenant
 *   4. vendedor tem permissão (garantido no router; aqui validamos o vínculo)
 *   5. cria a venda
 *   6. altera o veículo para SOLD
 *   7. registra auditoria
 * Qualquer falha => rollback total (nenhuma alteração persistida).
 */
export async function createSale(user: AuthUser, input: CreateSaleInput) {
  const dealershipId = user.dealershipId!;
  const shouldComplete = input.status === 'COMPLETED';

  // SELLER só registra venda em seu próprio nome.
  let sellerId = input.sellerId ?? user.id;
  if (user.role === 'SELLER') {
    sellerId = user.id;
  }

  return prisma.$transaction(async (tx) => {
    // (3) cliente existe no tenant
    const customer = await tx.customer.findFirst({
      where: { id: input.customerId, dealershipId },
    });
    if (!customer) {
      throw new AppError('CUSTOMER_NOT_FOUND');
    }

    // (4) vendedor pertence ao tenant
    const seller = await tx.user.findFirst({ where: { id: sellerId, dealershipId } });
    if (!seller) {
      throw new AppError('USER_NOT_FOUND', 'Vendedor não encontrado nesta concessionária.');
    }

    // (1) veículo pertence ao tenant
    const vehicle = await tx.vehicle.findFirst({
      where: { id: input.vehicleId, dealershipId },
    });
    if (!vehicle) {
      throw new AppError('VEHICLE_NOT_FOUND');
    }

    // proposta (opcional) precisa pertencer ao tenant
    if (input.proposalId) {
      const proposal = await tx.proposal.findFirst({
        where: { id: input.proposalId, dealershipId },
      });
      if (!proposal) {
        throw new AppError('PROPOSAL_NOT_FOUND');
      }
    }

    if (shouldComplete) {
      // (2) veículo deve estar AVAILABLE ou RESERVED
      if (vehicle.status === 'SOLD') {
        throw new AppError('VEHICLE_ALREADY_SOLD');
      }
      if (vehicle.status === 'MAINTENANCE') {
        throw new AppError(
          'INVALID_STATUS_TRANSITION',
          'Veículo em manutenção não pode ser vendido.',
        );
      }

      // (6) move o veículo para SOLD de forma condicional (anti-race)
      const moved = await tx.vehicle.updateMany({
        where: { id: vehicle.id, dealershipId, status: { in: ['AVAILABLE', 'RESERVED'] } },
        data: { status: 'SOLD' },
      });
      if (moved.count === 0) {
        throw new AppError('VEHICLE_ALREADY_SOLD');
      }
    }

    // (5) cria a venda
    const sale = await tx.sale.create({
      data: {
        dealershipId,
        customerId: input.customerId,
        sellerId,
        vehicleId: input.vehicleId,
        proposalId: input.proposalId ?? null,
        salePrice: input.salePrice,
        paymentMethod: input.paymentMethod,
        status: input.status,
        soldAt: shouldComplete ? new Date() : null,
      },
    });

    // (7) auditoria (dentro da transação: reverte junto se algo falhar)
    await recordAudit(
      {
        action: shouldComplete ? 'SALE_COMPLETED' : 'SALE_CREATED',
        entity: 'Sale',
        entityId: sale.id,
        dealershipId,
        userId: user.id,
        metadata: { vehicleId: input.vehicleId, salePrice: input.salePrice },
      },
      tx,
    );

    return sale;
  });
}

export async function listSales(user: AuthUser, query: ListSalesQuery) {
  const { page, limit, skip, take } = resolvePagination(query.page, query.limit);

  const where: Prisma.SaleWhereInput = {
    dealershipId: user.dealershipId!,
    ...sellerScopeFilter(user),
  };
  if (query.status) where.status = query.status;
  if (query.sellerId && user.role !== 'SELLER') where.sellerId = query.sellerId;
  if (query.from || query.to) {
    where.createdAt = {};
    if (query.from) where.createdAt.gte = query.from;
    if (query.to) where.createdAt.lte = query.to;
  }

  const orderBy = parseSort(query.sort, SORTABLE, { createdAt: 'desc' });

  const [data, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        customer: { select: { id: true, name: true } },
        vehicle: { select: { id: true, brand: true, model: true } },
        seller: { select: { id: true, name: true } },
      },
    }),
    prisma.sale.count({ where }),
  ]);

  return paginated(data, page, limit, total);
}

export async function getSale(user: AuthUser, id: string) {
  const sale = await prisma.sale.findFirst({
    where: { id, dealershipId: user.dealershipId!, ...sellerScopeFilter(user) },
    include: {
      customer: true,
      vehicle: true,
      seller: { select: { id: true, name: true, email: true } },
      payments: true,
      tradeIn: true,
    },
  });
  if (!sale) {
    throw new AppError('SALE_NOT_FOUND');
  }
  return sale;
}

/**
 * Altera o status da venda. Concluir (COMPLETED) e cancelar (CANCELLED)
 * atualizam o estoque em transação (item 20 + 48.9).
 */
export async function changeSaleStatus(user: AuthUser, id: string, status: SaleStatus) {
  const dealershipId = user.dealershipId!;

  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({ where: { id, dealershipId } });
    if (!sale) {
      throw new AppError('SALE_NOT_FOUND');
    }

    if (sale.status === 'COMPLETED' && status === 'COMPLETED') {
      throw new AppError('SALE_ALREADY_COMPLETED');
    }
    if (sale.status === 'CANCELLED') {
      throw new AppError('SALE_ALREADY_CANCELLED', 'Venda cancelada não pode mudar de status.');
    }

    if (status === 'COMPLETED') {
      const moved = await tx.vehicle.updateMany({
        where: {
          id: sale.vehicleId,
          dealershipId,
          status: { in: ['AVAILABLE', 'RESERVED'] },
        },
        data: { status: 'SOLD' },
      });
      if (moved.count === 0) {
        throw new AppError('VEHICLE_ALREADY_SOLD');
      }
    }

    if (status === 'CANCELLED') {
      // Ao cancelar uma venda concluída, o veículo volta a ficar disponível.
      if (sale.status === 'COMPLETED') {
        await tx.vehicle.update({
          where: { id: sale.vehicleId },
          data: { status: 'AVAILABLE' },
        });
      }
    }

    const updated = await tx.sale.update({
      where: { id },
      data: {
        status,
        soldAt: status === 'COMPLETED' ? new Date() : sale.soldAt,
      },
    });

    await recordAudit(
      {
        action:
          status === 'COMPLETED'
            ? 'SALE_COMPLETED'
            : status === 'CANCELLED'
              ? 'SALE_CANCELLED'
              : 'SALE_CREATED',
        entity: 'Sale',
        entityId: id,
        dealershipId,
        userId: user.id,
        metadata: { from: sale.status, to: status },
      },
      tx,
    );

    return updated;
  });
}

// --------------------------- Pagamentos (item 21) ---------------------------

export async function addPayment(user: AuthUser, saleId: string, input: CreatePaymentInput) {
  const dealershipId = user.dealershipId!;
  const sale = await prisma.sale.findFirst({ where: { id: saleId, dealershipId } });
  if (!sale) {
    throw new AppError('SALE_NOT_FOUND');
  }

  const payment = await prisma.payment.create({
    data: {
      dealershipId,
      saleId,
      amount: input.amount,
      method: input.method,
      status: input.status,
      paidAt: input.paidAt ?? (input.status === 'PAID' ? new Date() : null),
    },
  });

  await recordAudit({
    action: 'PAYMENT_CREATED',
    entity: 'Payment',
    entityId: payment.id,
    dealershipId,
    userId: user.id,
    metadata: { saleId, amount: input.amount },
  });

  return payment;
}

export async function listPayments(user: AuthUser, saleId: string) {
  const dealershipId = user.dealershipId!;
  const sale = await prisma.sale.findFirst({ where: { id: saleId, dealershipId } });
  if (!sale) {
    throw new AppError('SALE_NOT_FOUND');
  }
  return prisma.payment.findMany({ where: { saleId }, orderBy: { createdAt: 'asc' } });
}

// --------------------------- Trade-in (item 22) ---------------------------

export async function addTradeIn(user: AuthUser, saleId: string, input: CreateTradeInInput) {
  const dealershipId = user.dealershipId!;
  const sale = await prisma.sale.findFirst({
    where: { id: saleId, dealershipId },
    include: { tradeIn: true },
  });
  if (!sale) {
    throw new AppError('SALE_NOT_FOUND');
  }
  if (sale.tradeIn) {
    throw new AppError('VALIDATION_ERROR', 'Esta venda já possui um veículo de troca.');
  }

  return prisma.tradeIn.create({
    data: {
      dealershipId,
      saleId,
      brand: input.brand,
      model: input.model,
      year: input.year,
      mileage: input.mileage,
      estimatedValue: input.estimatedValue,
      notes: input.notes ?? null,
    },
  });
}
