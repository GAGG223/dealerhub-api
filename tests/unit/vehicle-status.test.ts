import { describe, it, expect } from 'vitest';
import { canTransition, assertTransition } from '../../src/modules/vehicles/vehicle-status';
import { AppError } from '../../src/shared/errors/app-error';

describe('máquina de estados do veículo', () => {
  it('permite AVAILABLE → RESERVED', () => {
    expect(canTransition('AVAILABLE', 'RESERVED')).toBe(true);
  });

  it('permite AVAILABLE → SOLD', () => {
    expect(canTransition('AVAILABLE', 'SOLD')).toBe(true);
  });

  it('permite AVAILABLE ⇄ MAINTENANCE', () => {
    expect(canTransition('AVAILABLE', 'MAINTENANCE')).toBe(true);
    expect(canTransition('MAINTENANCE', 'AVAILABLE')).toBe(true);
  });

  it('permite RESERVED → SOLD e RESERVED → AVAILABLE', () => {
    expect(canTransition('RESERVED', 'SOLD')).toBe(true);
    expect(canTransition('RESERVED', 'AVAILABLE')).toBe(true);
  });

  it('NÃO permite SOLD → nada (estado terminal)', () => {
    expect(canTransition('SOLD', 'AVAILABLE')).toBe(false);
    expect(canTransition('SOLD', 'RESERVED')).toBe(false);
    expect(canTransition('SOLD', 'MAINTENANCE')).toBe(false);
  });

  it('NÃO permite MAINTENANCE → RESERVED', () => {
    expect(canTransition('MAINTENANCE', 'RESERVED')).toBe(false);
  });

  it('é idempotente (mesmo status)', () => {
    expect(canTransition('AVAILABLE', 'AVAILABLE')).toBe(true);
  });

  it('assertTransition lança VEHICLE_ALREADY_SOLD ao sair de SOLD', () => {
    try {
      assertTransition('SOLD', 'AVAILABLE');
      expect.fail('deveria ter lançado');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).code).toBe('VEHICLE_ALREADY_SOLD');
    }
  });

  it('assertTransition lança INVALID_STATUS_TRANSITION para transição inválida', () => {
    try {
      assertTransition('MAINTENANCE', 'SOLD');
      expect.fail('deveria ter lançado');
    } catch (err) {
      expect((err as AppError).code).toBe('INVALID_STATUS_TRANSITION');
    }
  });
});
