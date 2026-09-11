import { describe, it, expect, beforeEach, afterAll, inject } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/shared/database/prisma';
import { resetDatabase } from '../helpers/db';
import { createDealership, createUser, createCustomer, tokenFor, bearer } from '../helpers/factory';

const app = createApp();
const dbAvailable = inject('dbAvailable');

afterAll(async () => {
  await prisma.$disconnect();
});

describe.skipIf(!dbAvailable)('Clientes (integração)', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('cria cliente com dados válidos', async () => {
    const alpha = await createDealership();
    const admin = await createUser(alpha.id, 'ADMIN');

    const res = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', bearer(tokenFor(admin)))
      .send({ name: 'João Silva', email: 'joao@ex.com', cpf: '123.456.789-09' });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('João Silva');
    // cpf deve ter sido normalizado para dígitos
    expect(res.body.data.cpf).toBe('12345678909');
  });

  it('rejeita cliente com CPF inválido (VALIDATION_ERROR)', async () => {
    const alpha = await createDealership();
    const admin = await createUser(alpha.id, 'ADMIN');

    const res = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', bearer(tokenFor(admin)))
      .send({ name: 'X', cpf: '123' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('SELLER só enxerga os próprios clientes (ownership)', async () => {
    const alpha = await createDealership();
    const seller1 = await createUser(alpha.id, 'SELLER');
    const seller2 = await createUser(alpha.id, 'SELLER');
    await createCustomer(alpha.id, seller1.id);
    await createCustomer(alpha.id, seller2.id);

    const res = await request(app)
      .get('/api/v1/customers')
      .set('Authorization', bearer(tokenFor(seller1)));

    expect(res.status).toBe(200);
    expect(res.body.data.pagination.total).toBe(1);
  });
});

describe.skipIf(!dbAvailable)('Leads (integração)', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('cria lead vinculado a cliente do tenant', async () => {
    const alpha = await createDealership();
    const admin = await createUser(alpha.id, 'ADMIN');
    const customer = await createCustomer(alpha.id);

    const res = await request(app)
      .post('/api/v1/leads')
      .set('Authorization', bearer(tokenFor(admin)))
      .send({ customerId: customer.id, source: 'WHATSAPP' });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('NEW');
    expect(res.body.data.source).toBe('WHATSAPP');
  });

  it('não cria lead com cliente de outro tenant', async () => {
    const alpha = await createDealership('Alpha');
    const beta = await createDealership('Beta');
    const admin = await createUser(alpha.id, 'ADMIN');
    const customerBeta = await createCustomer(beta.id);

    const res = await request(app)
      .post('/api/v1/leads')
      .set('Authorization', bearer(tokenFor(admin)))
      .send({ customerId: customerBeta.id });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('CUSTOMER_NOT_FOUND');
  });

  it('atualiza status do lead', async () => {
    const alpha = await createDealership();
    const admin = await createUser(alpha.id, 'ADMIN');
    const customer = await createCustomer(alpha.id);
    const lead = await prisma.lead.create({
      data: { dealershipId: alpha.id, customerId: customer.id, status: 'NEW', source: 'STORE' },
    });

    const res = await request(app)
      .patch(`/api/v1/leads/${lead.id}/status`)
      .set('Authorization', bearer(tokenFor(admin)))
      .send({ status: 'NEGOTIATING' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('NEGOTIATING');
  });
});
