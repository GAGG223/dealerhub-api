import { PrismaClient, type Role, type VehicleStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

/**
 * Seed do banco (item 35).
 * Cria um SUPER_ADMIN da plataforma e 3 concessionárias fictícias (Alpha, Beta,
 * Prime), cada uma com usuários (admin/manager/sellers), clientes, veículos,
 * leads, propostas e vendas. Todos os dados são fictícios.
 *
 * Idempotente o suficiente para desenvolvimento: limpa as tabelas antes de popular.
 */

const prisma = new PrismaClient();

const PASSWORD = 'senha1234';

async function hash(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

async function clean(): Promise<void> {
  await prisma.auditLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.tradeIn.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.proposal.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.vehicleImage.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.dealership.deleteMany();
}

interface DealershipSeed {
  name: string;
  document: string;
  city: string;
  state: string;
  brands: string[];
}

const DEALERSHIPS: DealershipSeed[] = [
  { name: 'Alpha Motors', document: '11111111000111', city: 'São Paulo', state: 'SP', brands: ['Toyota', 'Honda', 'Volkswagen'] },
  { name: 'Beta Veículos', document: '22222222000122', city: 'Rio de Janeiro', state: 'RJ', brands: ['Fiat', 'Chevrolet', 'Renault'] },
  { name: 'Prime Auto', document: '33333333000133', city: 'Belo Horizonte', state: 'MG', brands: ['BMW', 'Audi', 'Mercedes-Benz'] },
];

const MODELS: Record<string, string[]> = {
  Toyota: ['Corolla', 'Hilux', 'Yaris'],
  Honda: ['Civic', 'HR-V', 'City'],
  Volkswagen: ['Golf', 'Polo', 'T-Cross'],
  Fiat: ['Argo', 'Toro', 'Pulse'],
  Chevrolet: ['Onix', 'Tracker', 'S10'],
  Renault: ['Kwid', 'Duster', 'Captur'],
  BMW: ['320i', 'X1', 'X3'],
  Audi: ['A3', 'Q3', 'A4'],
  'Mercedes-Benz': ['C180', 'GLA', 'A200'],
};

const FIRST_NAMES = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Felipe', 'Gabriela', 'Hugo'];
const LAST_NAMES = ['Silva', 'Souza', 'Oliveira', 'Santos', 'Pereira', 'Lima'];

async function seedDealership(seed: DealershipSeed, index: number): Promise<void> {
  const slug = seed.name.split(' ')[0].toLowerCase();

  const dealership = await prisma.dealership.create({
    data: {
      name: seed.name,
      legalName: `${seed.name} Comércio de Veículos LTDA`,
      document: seed.document,
      email: `contato@${slug}.com`,
      phone: '1130000000',
      city: seed.city,
      state: seed.state,
      active: true,
    },
  });

  const passwordHash = await hash(PASSWORD);

  const admin = await prisma.user.create({
    data: {
      dealershipId: dealership.id,
      name: `Admin ${seed.name}`,
      email: `admin@${slug}.com`,
      passwordHash,
      role: 'ADMIN' as Role,
      position: 'Administrador',
    },
  });

  await prisma.user.create({
    data: {
      dealershipId: dealership.id,
      name: `Gerente ${seed.name}`,
      email: `manager@${slug}.com`,
      passwordHash,
      role: 'MANAGER' as Role,
      position: 'Gerente de Vendas',
    },
  });

  const sellers = await Promise.all(
    [1, 2].map((n) =>
      prisma.user.create({
        data: {
          dealershipId: dealership.id,
          name: `Vendedor ${n} ${seed.name}`,
          email: `seller${n}@${slug}.com`,
          passwordHash,
          role: 'SELLER' as Role,
          position: 'Vendedor',
        },
      }),
    ),
  );

  // Clientes
  const customers = await Promise.all(
    Array.from({ length: 8 }).map((_, i) =>
      prisma.customer.create({
        data: {
          dealershipId: dealership.id,
          sellerId: pick(sellers, i).id,
          name: `${pick(FIRST_NAMES, i)} ${pick(LAST_NAMES, i)}`,
          email: `cliente${i + 1}@${slug}.com`,
          phone: `11${String(900000000 + i).padStart(9, '0')}`,
          city: seed.city,
          state: seed.state,
        },
      }),
    ),
  );

  // Veículos
  const statuses: VehicleStatus[] = [
    'AVAILABLE',
    'AVAILABLE',
    'AVAILABLE',
    'RESERVED',
    'MAINTENANCE',
    'SOLD',
  ];
  const vehicles = await Promise.all(
    Array.from({ length: 12 }).map((_, i) => {
      const brand = pick(seed.brands, i);
      const model = pick(MODELS[brand] ?? ['Modelo'], i);
      const status = pick(statuses, i);
      return prisma.vehicle.create({
        data: {
          dealershipId: dealership.id,
          brand,
          model,
          version: 'Comfortline',
          year: 2019 + (i % 6),
          mileage: 10000 + i * 5000,
          price: 80000 + i * 12000,
          costPrice: 70000 + i * 10000,
          transmission: i % 2 === 0 ? 'Automático' : 'Manual',
          fuel: i % 3 === 0 ? 'Flex' : 'Gasolina',
          bodyType: i % 2 === 0 ? 'Sedan' : 'SUV',
          color: pick(['Preto', 'Branco', 'Prata', 'Cinza'], i),
          status,
          location: `Pátio ${1 + (i % 3)}`,
          images: {
            create: [
              { url: `https://example.com/${slug}/vehicle-${i + 1}-1.jpg`, position: 0 },
              { url: `https://example.com/${slug}/vehicle-${i + 1}-2.jpg`, position: 1 },
            ],
          },
        },
      });
    }),
  );

  // Leads
  const leadStatuses = ['NEW', 'CONTACTED', 'NEGOTIATING', 'CONVERTED', 'LOST'] as const;
  const leadSources = ['WEBSITE', 'WHATSAPP', 'INSTAGRAM', 'PHONE', 'STORE'] as const;
  await Promise.all(
    Array.from({ length: 10 }).map((_, i) =>
      prisma.lead.create({
        data: {
          dealershipId: dealership.id,
          customerId: pick(customers, i).id,
          vehicleId: pick(vehicles, i).id,
          sellerId: pick(sellers, i).id,
          status: pick([...leadStatuses], i),
          source: pick([...leadSources], i),
          notes: 'Lead gerado pelo seed.',
        },
      }),
    ),
  );

  // Propostas
  await Promise.all(
    Array.from({ length: 5 }).map((_, i) =>
      prisma.proposal.create({
        data: {
          dealershipId: dealership.id,
          customerId: pick(customers, i).id,
          vehicleId: pick(vehicles, i).id,
          sellerId: pick(sellers, i).id,
          proposedPrice: 78000 + i * 10000,
          downPayment: 20000,
          installments: 48,
          interestRate: 1.5,
          status: pick(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'] as const, i),
        },
      }),
    ),
  );

  // Vendas (usando os veículos com status SOLD do seed)
  const soldVehicles = vehicles.filter((v) => v.status === 'SOLD');
  await Promise.all(
    soldVehicles.map((vehicle, i) =>
      prisma.sale.create({
        data: {
          dealershipId: dealership.id,
          customerId: pick(customers, i).id,
          sellerId: pick(sellers, i).id,
          vehicleId: vehicle.id,
          salePrice: Number(vehicle.price),
          paymentMethod: pick(['CASH', 'FINANCING', 'PIX'] as const, i),
          status: 'COMPLETED',
          soldAt: new Date(),
          payments: {
            create: [
              {
                dealershipId: dealership.id,
                amount: Number(vehicle.price),
                method: 'CASH',
                status: 'PAID',
                paidAt: new Date(),
              },
            ],
          },
        },
      }),
    ),
  );

  await prisma.auditLog.create({
    data: {
      dealershipId: dealership.id,
      userId: admin.id,
      action: 'DEALERSHIP_CREATED',
      entity: 'Dealership',
      entityId: dealership.id,
      metadata: { seededAt: new Date().toISOString() },
    },
  });

  // eslint-disable-next-line no-console
  console.log(`  ✓ ${seed.name} (${index + 1}/3) — admin@${slug}.com`);
}

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('🌱 Limpando banco...');
  await clean();

  // SUPER_ADMIN da plataforma (sem dealership)
  await prisma.user.create({
    data: {
      dealershipId: null,
      name: 'Super Admin',
      email: 'superadmin@dealerhub.com',
      passwordHash: await hash(PASSWORD),
      role: 'SUPER_ADMIN',
      position: 'Plataforma',
    },
  });
  // eslint-disable-next-line no-console
  console.log('👑 SUPER_ADMIN: superadmin@dealerhub.com');

  // eslint-disable-next-line no-console
  console.log('🏢 Criando concessionárias...');
  for (let i = 0; i < DEALERSHIPS.length; i += 1) {
    await seedDealership(DEALERSHIPS[i], i);
  }

  // eslint-disable-next-line no-console
  console.log(`\n✅ Seed concluído. Senha padrão de todos os usuários: "${PASSWORD}"`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('❌ Erro no seed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
