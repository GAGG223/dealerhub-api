import { describe, it, expect } from 'vitest';
import { parseSort } from '../../src/shared/utils/sort';

const allowed = ['price', 'year', 'createdAt'] as const;
const fallback = { createdAt: 'desc' as const };

describe('parseSort', () => {
  it('retorna fallback quando sort ausente', () => {
    expect(parseSort(undefined, allowed, fallback)).toEqual(fallback);
  });

  it('interpreta campo_asc', () => {
    expect(parseSort('price_asc', allowed, fallback)).toEqual({ price: 'asc' });
  });

  it('interpreta campo_desc', () => {
    expect(parseSort('year_desc', allowed, fallback)).toEqual({ year: 'desc' });
  });

  it('lida com campo que contém underscore (createdAt não, mas valida direção)', () => {
    expect(parseSort('createdAt_asc', allowed, fallback)).toEqual({ createdAt: 'asc' });
  });

  it('retorna fallback para campo não permitido', () => {
    expect(parseSort('hacker_asc', allowed, fallback)).toEqual(fallback);
  });

  it('retorna fallback para direção inválida', () => {
    expect(parseSort('price_up', allowed, fallback)).toEqual(fallback);
  });

  it('retorna fallback para formato sem underscore', () => {
    expect(parseSort('price', allowed, fallback)).toEqual(fallback);
  });
});
