import type { Prisma, SaleStatus, LeadStatus } from '@prisma/client';
import { prisma } from '../../shared/database/prisma';
import type { ReportQuery } from './reports.schema';

/**
 * Relatórios (item 24). Todos escopados ao tenant (dealershipId) e com filtros
 * opcionais de período/vendedor/status/marca.
 */

function dateRange(query: ReportQuery): Prisma.DateTimeFilter | undefined {
  if (!query.from && !query.to) return undefined;
  const range: Prisma.DateTimeFilter = {};
  if (query.from) range.gte = query.from;
  if (query.to) range.lte = query.to;
  return range;
}

/** Relatório de vendas: totais, faturamento, ticket médio e agrupamento por status. */
export async function salesReport(dealershipId: string, query: ReportQuery) {
  const where: Prisma.SaleWhereInput = { dealershipId };
  const range = dateRange(query);
  if (range) where.createdAt = range;
  if (query.sellerId) where.sellerId = query.sellerId;
  if (query.status) where.status = query.status as SaleStatus;

  const [agg, byStatus] = await Promise.all([
    prisma.sale.aggregate({
      where: { ...where, status: 'COMPLETED' },
      _count: { _all: true },
      _sum: { salePrice: true },
    }),
    prisma.sale.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
      _sum: { salePrice: true },
    }),
  ]);

  const count = agg._count._all;
  const revenue = Number(agg._sum.salePrice ?? 0);

  return {
    completed: {
      count,
      revenue,
      averageTicket: count > 0 ? Math.round((revenue / count) * 100) / 100 : 0,
    },
    byStatus: byStatus.map((row) => ({
      status: row.status,
      count: row._count._all,
      revenue: Number(row._sum.salePrice ?? 0),
    })),
  };
}

/** Relatório de estoque: distribuição por status e por marca. */
export async function vehiclesReport(dealershipId: string, query: ReportQuery) {
  const baseWhere: Prisma.VehicleWhereInput = { dealershipId };
  if (query.brand) baseWhere.brand = { equals: query.brand, mode: 'insensitive' };

  const [byStatus, byBrand, total, valueAgg] = await Promise.all([
    prisma.vehicle.groupBy({
      by: ['status'],
      where: baseWhere,
      _count: { _all: true },
    }),
    prisma.vehicle.groupBy({
      by: ['brand'],
      where: baseWhere,
      _count: { _all: true },
      orderBy: { _count: { brand: 'desc' } },
      take: 20,
    }),
    prisma.vehicle.count({ where: baseWhere }),
    prisma.vehicle.aggregate({
      where: { ...baseWhere, status: 'AVAILABLE' },
      _sum: { price: true },
    }),
  ]);

  return {
    total,
    inventoryValueAvailable: Number(valueAgg._sum.price ?? 0),
    byStatus: byStatus.map((r) => ({ status: r.status, count: r._count._all })),
    byBrand: byBrand.map((r) => ({ brand: r.brand, count: r._count._all })),
  };
}

/** Relatório de leads: distribuição por status e origem, com taxa de conversão. */
export async function leadsReport(dealershipId: string, query: ReportQuery) {
  const where: Prisma.LeadWhereInput = { dealershipId };
  const range = dateRange(query);
  if (range) where.createdAt = range;
  if (query.sellerId) where.sellerId = query.sellerId;
  if (query.status) where.status = query.status as LeadStatus;

  const [byStatus, bySource, total, converted] = await Promise.all([
    prisma.lead.groupBy({ by: ['status'], where, _count: { _all: true } }),
    prisma.lead.groupBy({ by: ['source'], where, _count: { _all: true } }),
    prisma.lead.count({ where }),
    prisma.lead.count({ where: { ...where, status: 'CONVERTED' } }),
  ]);

  return {
    total,
    converted,
    conversionRate: total > 0 ? Math.round((converted / total) * 10000) / 100 : 0,
    byStatus: byStatus.map((r) => ({ status: r.status, count: r._count._all })),
    bySource: bySource.map((r) => ({ source: r.source, count: r._count._all })),
  };
}

/** Relatório de desempenho por vendedor: vendas concluídas e faturamento. */
export async function sellersReport(dealershipId: string, query: ReportQuery) {
  const where: Prisma.SaleWhereInput = { dealershipId, status: 'COMPLETED' };
  const range = dateRange(query);
  if (range) where.createdAt = range;

  const grouped = await prisma.sale.groupBy({
    by: ['sellerId'],
    where,
    _count: { _all: true },
    _sum: { salePrice: true },
  });

  // Resolve os nomes dos vendedores em uma única query.
  const sellerIds = grouped
    .map((g) => g.sellerId)
    .filter((id): id is string => Boolean(id));
  const sellers = await prisma.user.findMany({
    where: { id: { in: sellerIds }, dealershipId },
    select: { id: true, name: true },
  });
  const nameById = new Map(sellers.map((s) => [s.id, s.name]));

  return grouped
    .map((g) => {
      const count = g._count._all;
      const revenue = Number(g._sum.salePrice ?? 0);
      return {
        sellerId: g.sellerId,
        sellerName: g.sellerId ? (nameById.get(g.sellerId) ?? 'Desconhecido') : 'Sem vendedor',
        salesCount: count,
        revenue,
        averageTicket: count > 0 ? Math.round((revenue / count) * 100) / 100 : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}
