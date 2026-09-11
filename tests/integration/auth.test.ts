import { describe, it, expect, beforeEach, afterAll, inject } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/shared/database/prisma';
import { resetDatabase } from '../helpers/db';
import { createDealership, createUser } from '../helpers/factory';

const app = createApp();
// Flag injetada pelo globalSetup (síncrona) — habilita/desabilita integração.
const dbAvailable = inject('dbAvailable');

afterAll(async () => {
  await prisma.$disconnect();
});

describe.skipIf(!dbAvailable)('Autenticação (integração)', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('login com credenciais corretas retorna tokens', async () => {
    const dealership = await createDealership();
    await createUser(dealership.id, 'ADMIN', 'senha1234').then((u) =>
      prisma.user.update({ where: { id: u.id }, data: { email: 'admin@alpha.com' } }),
    );

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@alpha.com', password: 'senha1234' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tokens.accessToken).toBeDefined();
    expect(res.body.data.tokens.refreshToken).toBeDefined();
    // Não deve vazar o passwordHash
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('login com senha incorreta retorna 401 INVALID_CREDENTIALS', async () => {
    const dealership = await createDealership();
    await prisma.user.update({
      where: { id: (await createUser(dealership.id, 'ADMIN')).id },
      data: { email: 'admin2@alpha.com' },
    });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin2@alpha.com', password: 'errada' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('token inválido em rota protegida retorna 401', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer token.invalido');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('ausência de token em rota protegida retorna 401', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('refresh rotaciona o token e invalida o antigo', async () => {
    const dealership = await createDealership();
    await prisma.user.update({
      where: { id: (await createUser(dealership.id, 'ADMIN')).id },
      data: { email: 'admin3@alpha.com' },
    });
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin3@alpha.com', password: 'senha1234' });
    const oldRefresh = login.body.data.tokens.refreshToken;

    const refreshed = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: oldRefresh });
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.accessToken).toBeDefined();

    // reutilizar o refresh antigo deve falhar (rotação)
    const reuse = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: oldRefresh });
    expect(reuse.status).toBe(401);
  });
});
