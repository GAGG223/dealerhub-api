import { z } from 'zod';

const leadStatusEnum = z.enum(['NEW', 'CONTACTED', 'NEGOTIATING', 'CONVERTED', 'LOST']);
const leadSourceEnum = z.enum([
  'WEBSITE',
  'WHATSAPP',
  'INSTAGRAM',
  'FACEBOOK',
  'PHONE',
  'STORE',
  'OTHER',
]);

export const createLeadSchema = z.object({
  customerId: z.string().uuid('customerId inválido.'),
  vehicleId: z.string().uuid('vehicleId inválido.').optional(),
  sellerId: z.string().uuid('sellerId inválido.').optional(),
  source: leadSourceEnum.default('OTHER'),
  status: leadStatusEnum.default('NEW'),
  notes: z.string().max(2000).optional(),
});

export const updateLeadSchema = z
  .object({
    vehicleId: z.string().uuid().nullable(),
    sellerId: z.string().uuid().nullable(),
    source: leadSourceEnum,
    notes: z.string().max(2000).nullable(),
  })
  .partial();

export const updateLeadStatusSchema = z.object({
  status: leadStatusEnum,
});

export const listLeadsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
  status: leadStatusEnum.optional(),
  source: leadSourceEnum.optional(),
  sellerId: z.string().uuid().optional(),
});

export const idParamSchema = z.object({
  id: z.string().uuid('ID inválido.'),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>;
export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;
