import { z } from 'zod';

const paymentMethodEnum = z.enum(['CASH', 'FINANCING', 'TRADE_IN', 'PIX', 'OTHER']);
const paymentStatusEnum = z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED']);
const saleStatusEnum = z.enum(['PENDING', 'COMPLETED', 'CANCELLED']);

/**
 * Criação de venda. Por padrão a venda pode ser criada já COMPLETED (fluxo
 * comum de balcão) ou PENDING. A conclusão dispara a regra de negócio crítica
 * (item 20): valida tudo e move o veículo para SOLD dentro de uma transação.
 */
export const createSaleSchema = z.object({
  customerId: z.string().uuid('customerId inválido.'),
  vehicleId: z.string().uuid('vehicleId inválido.'),
  sellerId: z.string().uuid('sellerId inválido.').optional(),
  proposalId: z.string().uuid('proposalId inválido.').optional(),
  salePrice: z.number().positive('O valor da venda deve ser positivo.'),
  paymentMethod: paymentMethodEnum.default('CASH'),
  status: z.enum(['PENDING', 'COMPLETED']).default('COMPLETED'),
  notes: z.string().max(2000).optional(),
});

export const updateSaleStatusSchema = z.object({
  status: saleStatusEnum,
});

export const listSalesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
  status: saleStatusEnum.optional(),
  sellerId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const createPaymentSchema = z.object({
  amount: z.number().positive('O valor do pagamento deve ser positivo.'),
  method: paymentMethodEnum.default('CASH'),
  status: paymentStatusEnum.default('PENDING'),
  paidAt: z.coerce.date().optional(),
});

export const createTradeInSchema = z.object({
  brand: z.string().min(1).max(60),
  model: z.string().min(1).max(80),
  year: z.number().int().min(1900),
  mileage: z.number().int().min(0).default(0),
  estimatedValue: z.number().nonnegative(),
  notes: z.string().max(2000).optional(),
});

export const idParamSchema = z.object({
  id: z.string().uuid('ID inválido.'),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type UpdateSaleStatusInput = z.infer<typeof updateSaleStatusSchema>;
export type ListSalesQuery = z.infer<typeof listSalesQuerySchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type CreateTradeInInput = z.infer<typeof createTradeInSchema>;
