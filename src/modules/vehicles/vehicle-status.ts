import type { VehicleStatus } from '@prisma/client';
import { AppError } from '../../shared/errors/app-error';

/**
 * Máquina de estados do estoque de veículos (itens 13 e 48).
 *
 *   AVAILABLE  ⇄ RESERVED
 *   AVAILABLE  ⇄ MAINTENANCE
 *   RESERVED   → SOLD
 *   AVAILABLE  → SOLD
 *
 * Regra dura: um veículo SOLD é terminal — não pode voltar a nenhum estado.
 */
const ALLOWED_TRANSITIONS: Record<VehicleStatus, VehicleStatus[]> = {
  AVAILABLE: ['RESERVED', 'SOLD', 'MAINTENANCE'],
  RESERVED: ['AVAILABLE', 'SOLD'],
  MAINTENANCE: ['AVAILABLE'],
  SOLD: [],
};

export function canTransition(from: VehicleStatus, to: VehicleStatus): boolean {
  if (from === to) {
    return true; // idempotente: manter o mesmo status é permitido
  }
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: VehicleStatus, to: VehicleStatus): void {
  if (!canTransition(from, to)) {
    if (from === 'SOLD') {
      throw new AppError('VEHICLE_ALREADY_SOLD', 'Veículo vendido não pode mudar de status.');
    }
    throw new AppError(
      'INVALID_STATUS_TRANSITION',
      `Transição de status inválida: ${from} → ${to}.`,
    );
  }
}
