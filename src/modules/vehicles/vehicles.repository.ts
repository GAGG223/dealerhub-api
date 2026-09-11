import type { Prisma } from '@prisma/client';
import { prisma } from '../../shared/database/prisma';
import { parseSort } from '../../shared/utils/sort';
import type { ListVehiclesQuery } from './vehicles.schema';

/**
 * Repositório de veículos. Concentra a construção de queries complexas
 * (filtros + ordenação + paginação), sempre escopadas por dealershipId.
 * A abstração se justifica aqui pela riqueza dos filtros (item 11).
 */

const SORTABLE_FIELDS = ['price', 'year', 'mileage', 'createdAt', 'brand'] as const;

export function buildWhere(dealershipId: string, query: ListVehiclesQuery): Prisma.VehicleWhereInput {
  const where: Prisma.VehicleWhereInput = { dealershipId };

  if (query.brand) where.brand = { equals: query.brand, mode: 'insensitive' };
  if (query.model) where.model = { contains: query.model, mode: 'insensitive' };
  if (query.transmission) where.transmission = { equals: query.transmission, mode: 'insensitive' };
  if (query.fuel) where.fuel = { equals: query.fuel, mode: 'insensitive' };
  if (query.bodyType) where.bodyType = { equals: query.bodyType, mode: 'insensitive' };
  if (query.status) where.status = query.status;

  if (query.minPrice != null || query.maxPrice != null) {
    where.price = {};
    if (query.minPrice != null) where.price.gte = query.minPrice;
    if (query.maxPrice != null) where.price.lte = query.maxPrice;
  }
  if (query.minYear != null || query.maxYear != null) {
    where.year = {};
    if (query.minYear != null) where.year.gte = query.minYear;
    if (query.maxYear != null) where.year.lte = query.maxYear;
  }
  if (query.minMileage != null || query.maxMileage != null) {
    where.mileage = {};
    if (query.minMileage != null) where.mileage.gte = query.minMileage;
    if (query.maxMileage != null) where.mileage.lte = query.maxMileage;
  }

  if (query.search) {
    where.OR = [
      { brand: { contains: query.search, mode: 'insensitive' } },
      { model: { contains: query.search, mode: 'insensitive' } },
      { version: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  return where;
}

export function buildOrderBy(sort?: string): Prisma.VehicleOrderByWithRelationInput {
  return parseSort(sort, SORTABLE_FIELDS, { createdAt: 'desc' });
}

export async function findMany(where: Prisma.VehicleWhereInput, skip: number, take: number, orderBy: Prisma.VehicleOrderByWithRelationInput) {
  return prisma.vehicle.findMany({
    where,
    skip,
    take,
    orderBy,
    include: { images: { orderBy: { position: 'asc' } } },
  });
}

export function count(where: Prisma.VehicleWhereInput) {
  return prisma.vehicle.count({ where });
}

/** Busca escopada ao tenant — retorna null se o veículo for de outro tenant. */
export function findByIdInTenant(dealershipId: string, id: string) {
  return prisma.vehicle.findFirst({
    where: { id, dealershipId },
    include: { images: { orderBy: { position: 'asc' } } },
  });
}
