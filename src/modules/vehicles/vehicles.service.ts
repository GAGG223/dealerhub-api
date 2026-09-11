import type { VehicleStatus } from '@prisma/client';
import { prisma } from '../../shared/database/prisma';
import { AppError } from '../../shared/errors/app-error';
import { paginated, resolvePagination } from '../../shared/utils/pagination';
import { recordAudit } from '../audit/audit.service';
import * as repo from './vehicles.repository';
import { assertTransition } from './vehicle-status';
import type {
  CreateImageInput,
  CreateVehicleInput,
  ListVehiclesQuery,
  UpdateVehicleInput,
} from './vehicles.schema';

interface Actor {
  userId: string;
  ip?: string;
}

export async function createVehicle(
  dealershipId: string,
  input: CreateVehicleInput,
  actor: Actor,
) {
  const vehicle = await prisma.vehicle.create({
    data: {
      dealershipId,
      brand: input.brand,
      model: input.model,
      version: input.version ?? null,
      year: input.year,
      mileage: input.mileage,
      price: input.price,
      costPrice: input.costPrice ?? null,
      transmission: input.transmission ?? null,
      fuel: input.fuel ?? null,
      bodyType: input.bodyType ?? null,
      engine: input.engine ?? null,
      horsepower: input.horsepower ?? null,
      color: input.color ?? null,
      description: input.description ?? null,
      location: input.location ?? null,
    },
  });

  await recordAudit({
    action: 'VEHICLE_CREATED',
    entity: 'Vehicle',
    entityId: vehicle.id,
    dealershipId,
    userId: actor.userId,
    ipAddress: actor.ip,
  });

  return vehicle;
}

export async function listVehicles(dealershipId: string, query: ListVehiclesQuery) {
  const { page, limit, skip, take } = resolvePagination(query.page, query.limit);
  const where = repo.buildWhere(dealershipId, query);
  const orderBy = repo.buildOrderBy(query.sort);

  const [data, total] = await Promise.all([
    repo.findMany(where, skip, take, orderBy),
    repo.count(where),
  ]);

  return paginated(data, page, limit, total);
}

export async function getVehicle(dealershipId: string, id: string) {
  const vehicle = await repo.findByIdInTenant(dealershipId, id);
  if (!vehicle) {
    throw new AppError('VEHICLE_NOT_FOUND');
  }
  return vehicle;
}

export async function updateVehicle(
  dealershipId: string,
  id: string,
  input: UpdateVehicleInput,
  actor: Actor,
) {
  await getVehicle(dealershipId, id);

  const vehicle = await prisma.vehicle.update({
    where: { id },
    data: {
      ...input,
      version: input.version,
      costPrice: input.costPrice,
    },
  });

  await recordAudit({
    action: 'VEHICLE_UPDATED',
    entity: 'Vehicle',
    entityId: id,
    dealershipId,
    userId: actor.userId,
    ipAddress: actor.ip,
  });

  return vehicle;
}

export async function deleteVehicle(dealershipId: string, id: string, actor: Actor) {
  const vehicle = await getVehicle(dealershipId, id);

  // Regra: não permitir excluir um veículo já vendido (preserva histórico).
  if (vehicle.status === 'SOLD') {
    throw new AppError('VEHICLE_ALREADY_SOLD', 'Veículo vendido não pode ser excluído.');
  }

  await prisma.vehicle.delete({ where: { id } });

  await recordAudit({
    action: 'VEHICLE_DELETED',
    entity: 'Vehicle',
    entityId: id,
    dealershipId,
    userId: actor.userId,
    ipAddress: actor.ip,
  });

  return { id };
}

/** Muda o status respeitando a máquina de estados (item 13). */
export async function changeStatus(
  dealershipId: string,
  id: string,
  status: VehicleStatus,
  actor: Actor,
) {
  const vehicle = await getVehicle(dealershipId, id);
  assertTransition(vehicle.status, status);

  const updated = await prisma.vehicle.update({ where: { id }, data: { status } });

  await recordAudit({
    action: 'VEHICLE_STATUS_CHANGED',
    entity: 'Vehicle',
    entityId: id,
    dealershipId,
    userId: actor.userId,
    metadata: { from: vehicle.status, to: status },
    ipAddress: actor.ip,
  });

  return updated;
}

/**
 * Reserva um veículo com segurança contra race conditions (item 14).
 * Usa updateMany com WHERE status = AVAILABLE: apenas UMA requisição concorrente
 * consegue afetar 1 linha; as demais afetam 0 e recebem VEHICLE_ALREADY_RESERVED.
 * Tudo dentro de uma transação para consistência.
 */
export async function reserveVehicle(dealershipId: string, id: string, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const vehicle = await tx.vehicle.findFirst({ where: { id, dealershipId } });
    if (!vehicle) {
      throw new AppError('VEHICLE_NOT_FOUND');
    }
    if (vehicle.status === 'SOLD') {
      throw new AppError('VEHICLE_ALREADY_SOLD');
    }
    if (vehicle.status === 'RESERVED') {
      throw new AppError('VEHICLE_ALREADY_RESERVED');
    }
    if (vehicle.status !== 'AVAILABLE') {
      throw new AppError('INVALID_STATUS_TRANSITION', 'Somente veículos disponíveis podem ser reservados.');
    }

    const result = await tx.vehicle.updateMany({
      where: { id, dealershipId, status: 'AVAILABLE' },
      data: { status: 'RESERVED' },
    });

    // Se 0 linhas afetadas, outra transação venceu a corrida.
    if (result.count === 0) {
      throw new AppError('VEHICLE_ALREADY_RESERVED');
    }

    await recordAudit(
      {
        action: 'VEHICLE_RESERVED',
        entity: 'Vehicle',
        entityId: id,
        dealershipId,
        userId: actor.userId,
        ipAddress: actor.ip,
      },
      tx,
    );

    return tx.vehicle.findUniqueOrThrow({ where: { id } });
  });
}

/** Libera a reserva: RESERVED → AVAILABLE. */
export async function releaseVehicle(dealershipId: string, id: string, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const vehicle = await tx.vehicle.findFirst({ where: { id, dealershipId } });
    if (!vehicle) {
      throw new AppError('VEHICLE_NOT_FOUND');
    }
    if (vehicle.status !== 'RESERVED') {
      throw new AppError('INVALID_STATUS_TRANSITION', 'Somente veículos reservados podem ser liberados.');
    }

    await tx.vehicle.update({ where: { id }, data: { status: 'AVAILABLE' } });

    await recordAudit(
      {
        action: 'VEHICLE_RELEASED',
        entity: 'Vehicle',
        entityId: id,
        dealershipId,
        userId: actor.userId,
        ipAddress: actor.ip,
      },
      tx,
    );

    return tx.vehicle.findUniqueOrThrow({ where: { id } });
  });
}

// --------------------------- Imagens (item 12) ---------------------------

export async function addImage(
  dealershipId: string,
  vehicleId: string,
  input: CreateImageInput,
) {
  await getVehicle(dealershipId, vehicleId);
  return prisma.vehicleImage.create({
    data: {
      vehicleId,
      url: input.url,
      alt: input.alt ?? null,
      position: input.position,
    },
  });
}

export async function listImages(dealershipId: string, vehicleId: string) {
  await getVehicle(dealershipId, vehicleId);
  return prisma.vehicleImage.findMany({
    where: { vehicleId },
    orderBy: { position: 'asc' },
  });
}

export async function deleteImage(dealershipId: string, vehicleId: string, imageId: string) {
  await getVehicle(dealershipId, vehicleId);
  const image = await prisma.vehicleImage.findFirst({ where: { id: imageId, vehicleId } });
  if (!image) {
    throw new AppError('NOT_FOUND', 'Imagem não encontrada.');
  }
  await prisma.vehicleImage.delete({ where: { id: imageId } });
  return { id: imageId };
}
