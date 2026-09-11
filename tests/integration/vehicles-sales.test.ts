import { describe, it, expect, beforeEach, afterAll, inject } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/shared/database/prisma';
import { resetDatabase } from '../helpers/db';
import { createDealership, createUser, createVehicle, createCustomer, tokenFor, bearer } from '../helpers/factory';

const app = createApp();
const dbAvailable = inject('dbAvailable');

afterAll(async () => {
  await prisma.$disconnect();
});

describe.skipIf(!dbAvailable)('Estoque: reserva e liberação (integração)', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('reserva um veículo disponível (AVAILABLE → RESERVED)', async () => {
    const alpha = await createDealership();
    const admin = await createUser(alpha.id, 'ADMIN');
    const vehicle = await createVehicle(alpha.id);

    const res = await request(app)
      .post(`/api/v1/vehicles/${vehicle.id}/reserve`)
      .set('Authorization', bearer(tokenFor(admin)));

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('RESERVED');
  });

  it('não permite reservar um veículo já reservado', async () => {
    const alpha = await createDealership();
    const admin = await createUser(alpha.id, 'ADMIN');
    const vehicle = await createVehicle(alpha.id, { status: 'RESERVED' });

    const res = await request(app)
      .post(`/api/v1/vehicles/${vehicle.id}/reserve`)
      .set('Authorization', bearer(tokenFor(admin)));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('VEHICLE_ALREADY_RESERVED');
  });

  it('não permite transição inválida via PATCH status (SOLD → AVAILABLE)', async () => {
    const alpha = await createDealership();
    const admin = await createUser(alpha.id, 'ADMIN');
    const vehicle = await createVehicle(alpha.id, { status: 'SOLD' });

    const res = await request(app)
      .patch(`/api/v1/vehicles/${vehicle.id}/status`)
      .set('Authorization', bearer(tokenFor(admin)))
      .send({ status: 'AVAILABLE' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('VEHICLE_ALREADY_SOLD');
  });
});

describe.skipIf(!dbAvailable)('Vendas: regra de negócio e transação (integração)', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('venda válida: cria a venda e move o veículo para SOLD', async () => {
    const alpha = await createDealership();
    const admin = await createUser(alpha.id, 'ADMIN');
    const vehicle = await createVehicle(alpha.id);
    const customer = await createCustomer(alpha.id);

    const res = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', bearer(tokenFor(admin)))
      .send({
        customerId: customer.id,
        vehicleId: vehicle.id,
        salePrice: 115000,
        paymentMethod: 'CASH',
        status: 'COMPLETED',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('COMPLETED');

    const updated = await prisma.vehicle.findUnique({ where: { id: vehicle.id } });
    expect(updated?.status).toBe('SOLD');
  });

  it('não vende veículo já vendido', async () => {
    const alpha = await createDealership();
    const admin = await createUser(alpha.id, 'ADMIN');
    const vehicle = await createVehicle(alpha.id, { status: 'SOLD' });
    const customer = await createCustomer(alpha.id);

    const res = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', bearer(tokenFor(admin)))
      .send({ customerId: customer.id, vehicleId: vehicle.id, salePrice: 100000, status: 'COMPLETED' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('VEHICLE_ALREADY_SOLD');
  });

  it('rollback: venda com cliente inexistente não altera o veículo', async () => {
    const alpha = await createDealership();
    const admin = await createUser(alpha.id, 'ADMIN');
    const vehicle = await createVehicle(alpha.id);

    const res = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', bearer(tokenFor(admin)))
      .send({
        customerId: '00000000-0000-0000-0000-000000000000',
        vehicleId: vehicle.id,
        salePrice: 100000,
        status: 'COMPLETED',
      });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('CUSTOMER_NOT_FOUND');

    // O veículo NÃO pode ter sido alterado (transação revertida).
    const unchanged = await prisma.vehicle.findUnique({ where: { id: vehicle.id } });
    expect(unchanged?.status).toBe('AVAILABLE');
  });

  it('cancelar venda concluída devolve o veículo para AVAILABLE', async () => {
    const alpha = await createDealership();
    const admin = await createUser(alpha.id, 'ADMIN');
    const vehicle = await createVehicle(alpha.id);
    const customer = await createCustomer(alpha.id);

    const sale = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', bearer(tokenFor(admin)))
      .send({ customerId: customer.id, vehicleId: vehicle.id, salePrice: 100000, status: 'COMPLETED' });

    const cancel = await request(app)
      .patch(`/api/v1/sales/${sale.body.data.id}/status`)
      .set('Authorization', bearer(tokenFor(admin)))
      .send({ status: 'CANCELLED' });

    expect(cancel.status).toBe(200);
    const updated = await prisma.vehicle.findUnique({ where: { id: vehicle.id } });
    expect(updated?.status).toBe('AVAILABLE');
  });
});
