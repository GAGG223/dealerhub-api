import { prisma } from '../../shared/database/prisma';

/**
 * Dashboard (item 23): agrega métricas do tenant. Vendas/faturamento consideram
 * o mês corrente e apenas vendas COMPLETED. Todas as queries são escopadas por
 * dealershipId.
 */
export async function getDashboard(dealershipId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [
    vehiclesTotal,
    available,
    reserved,
    sold,
    maintenance,
    customers,
    leadsTotal,
    newLeads,
    salesAgg,
  ] = await Promise.all([
    prisma.vehicle.count({ where: { dealershipId } }),
    prisma.vehicle.count({ where: { dealershipId, status: 'AVAILABLE' } }),
    prisma.vehicle.count({ where: { dealershipId, status: 'RESERVED' } }),
    prisma.vehicle.count({ where: { dealershipId, status: 'SOLD' } }),
    prisma.vehicle.count({ where: { dealershipId, status: 'MAINTENANCE' } }),
    prisma.customer.count({ where: { dealershipId } }),
    prisma.lead.count({ where: { dealershipId } }),
    prisma.lead.count({ where: { dealershipId, status: 'NEW' } }),
    prisma.sale.aggregate({
      where: {
        dealershipId,
        status: 'COMPLETED',
        soldAt: { gte: startOfMonth, lt: startOfNextMonth },
      },
      _count: { _all: true },
      _sum: { salePrice: true },
    }),
  ]);

  const count = salesAgg._count._all;
  const revenue = Number(salesAgg._sum.salePrice ?? 0);
  const averageTicket = count > 0 ? Math.round((revenue / count) * 100) / 100 : 0;

  return {
    vehicles: {
      total: vehiclesTotal,
      available,
      reserved,
      sold,
      maintenance,
    },
    customers,
    leads: {
      total: leadsTotal,
      new: newLeads,
    },
    sales: {
      count,
      revenue,
      averageTicket,
    },
  };
}
