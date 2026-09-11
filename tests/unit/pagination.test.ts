import { describe, it, expect } from 'vitest';
import {
  resolvePagination,
  buildPaginationMeta,
  MAX_LIMIT,
} from '../../src/shared/utils/pagination';

describe('resolvePagination', () => {
  it('usa defaults quando nada é informado', () => {
    const p = resolvePagination(undefined, undefined);
    expect(p.page).toBe(1);
    expect(p.limit).toBe(20);
    expect(p.skip).toBe(0);
  });

  it('calcula skip corretamente', () => {
    const p = resolvePagination(3, 10);
    expect(p.skip).toBe(20);
    expect(p.take).toBe(10);
  });

  it('limita o limite ao máximo permitido', () => {
    const p = resolvePagination(1, 999);
    expect(p.limit).toBe(MAX_LIMIT);
  });

  it('ignora valores inválidos (negativos/zero)', () => {
    const p = resolvePagination(-5, 0);
    expect(p.page).toBe(1);
    expect(p.limit).toBe(20);
  });
});

describe('buildPaginationMeta', () => {
  it('calcula totalPages', () => {
    const meta = buildPaginationMeta(1, 20, 100);
    expect(meta.totalPages).toBe(5);
  });

  it('arredonda totalPages para cima', () => {
    const meta = buildPaginationMeta(1, 20, 101);
    expect(meta.totalPages).toBe(6);
  });

  it('totalPages mínimo é 1 mesmo com total 0', () => {
    const meta = buildPaginationMeta(1, 20, 0);
    expect(meta.totalPages).toBe(1);
  });
});
