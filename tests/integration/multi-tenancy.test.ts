import { describe, it, expect, beforeEach, afterAll, inject } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/shared/database/prisma';
import { resetDatabase } from '../helpers/db';
import { createDealership, createUser, createVehicle, tokenFor, bearer } from '../helpers/factory';

const app = createApp();
const dbAvailable = inject('dbAvailable');

afterAll(async () => {
  await prisma.$disconnect();
});

describe.skipIf(!dbAvailable)('Isolamento multi-tenant (integração)', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('usuário do tenant A não acessa veículo do tenant B (404, não vaza existência)', async () => {
    const alpha = await createDealership('Alpha');
    const beta = await createDealership('Beta');
    const adminAlpha = await createUser(alpha.id, 'ADMIN');
    const vehicleBeta = await createVehicle(beta.id);

    const res = await request(app)
      .get(`/api/v1/vehicles/${vehicleBeta.id}`)
      .set('Authorization', bearer(tokenFor(adminAlpha)));

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('VEHICLE_NOT_FOUND');
  });

  it('listagem de veículos só retorna itens do próprio tenant', async () => {
    const alpha = await createDealership('Alpha');
    const beta = await createDealership('Beta');
    const adminAlpha = await createUser(alpha.id, 'ADMIN');
    await createVehicle(alpha.id, { brand: 'Fiat' });
    await createVehicle(alpha.id, { brand: 'VW' });
    await createVehicle(beta.id, { brand: 'BMW' });

    const res = await request(app)
      .get('/api/v1/vehicles')
      .set('Authorization', bearer(tokenFor(adminAlpha)));

    expect(res.status).toBe(200);
    expect(res.body.data.pagination.total).toBe(2);
    const brands = res.body.data.data.map((v: { brand: string }) => v.brand);
    expect(brands).not.toContain('BMW');
  });

  it('não é possível atualizar veículo de outro tenant via ID manipulado', async () => {
    const alpha = await createDealership('Alpha');
    const beta = await createDealership('Beta');
    const adminAlpha = await createUser(alpha.id, 'ADMIN');
    const vehicleBeta = await createVehicle(beta.id);

    const res = await request(app)
      .patch(`/api/v1/vehicles/${vehicleBeta.id}`)
      .set('Authorization', bearer(tokenFor(adminAlpha)))
      .send({ price: 1 });

    expect(res.status).toBe(404);
  });
});

describe.skipIf(!dbAvailable)('Autorização RBAC (integração)', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('SELLER não acessa recurso administrativo (gestão de usuários) → 403', async () => {
    const alpha = await createDealership('Alpha');
    const seller = await createUser(alpha.id, 'SELLER');

    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', bearer(tokenFor(seller)));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('ADMIN acessa gestão de usuários → 200', async () => {
    const alpha = await createDealership('Alpha');
    const admin = await createUser(alpha.id, 'ADMIN');

    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', bearer(tokenFor(admin)));

    expect(res.status).toBe(200);
  });

  it('não-SUPER_ADMIN não gerencia concessionárias → 403', async () => {
    const alpha = await createDealership('Alpha');
    const admin = await createUser(alpha.id, 'ADMIN');

    const res = await request(app)
      .get('/api/v1/dealerships')
      .set('Authorization', bearer(tokenFor(admin)));

    expect(res.status).toBe(403);
  });
});
