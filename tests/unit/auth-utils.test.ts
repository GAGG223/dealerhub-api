import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword, hashToken } from '../../src/shared/utils/hash';
import {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../src/shared/utils/jwt';
import { AppError } from '../../src/shared/errors/app-error';
import { sellerScopeFilter } from '../../src/shared/utils/ownership';
import type { AuthUser } from '../../src/shared/types';

describe('hash de senha (bcrypt)', () => {
  it('gera hash diferente da senha e valida corretamente', async () => {
    const hash = await hashPassword('segredo123');
    expect(hash).not.toBe('segredo123');
    expect(await comparePassword('segredo123', hash)).toBe(true);
    expect(await comparePassword('errada', hash)).toBe(false);
  });
});

describe('hashToken (SHA-256 determinístico)', () => {
  it('gera o mesmo hash para o mesmo token', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
    expect(hashToken('abc')).not.toBe(hashToken('xyz'));
  });
});

describe('JWT', () => {
  const payload = {
    sub: 'user-1',
    email: 'a@b.com',
    role: 'ADMIN' as const,
    dealershipId: 'dealer-1',
  };

  it('assina e verifica access token', () => {
    const token = signAccessToken(payload);
    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe('user-1');
    expect(decoded.role).toBe('ADMIN');
    expect(decoded.dealershipId).toBe('dealer-1');
  });

  it('assina e verifica refresh token', () => {
    const token = signRefreshToken({ sub: 'user-1', jti: 'jti-1' });
    const decoded = verifyRefreshToken(token);
    expect(decoded.sub).toBe('user-1');
  });

  it('rejeita token inválido com AppError INVALID_TOKEN', () => {
    try {
      verifyAccessToken('token.falso.aqui');
      expect.fail('deveria ter lançado');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).code).toBe('INVALID_TOKEN');
    }
  });
});

describe('ownership (sellerScopeFilter)', () => {
  it('SELLER só enxerga os próprios registros', () => {
    const seller: AuthUser = {
      id: 's1',
      email: 's@x.com',
      role: 'SELLER',
      dealershipId: 'd1',
    };
    expect(sellerScopeFilter(seller)).toEqual({ sellerId: 's1' });
  });

  it('ADMIN/MANAGER não recebem filtro de ownership', () => {
    const admin: AuthUser = { id: 'a1', email: 'a@x.com', role: 'ADMIN', dealershipId: 'd1' };
    expect(sellerScopeFilter(admin)).toEqual({});
  });
});
