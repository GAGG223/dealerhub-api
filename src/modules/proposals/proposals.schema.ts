import { z } from 'zod';

const proposalStatusEnum = z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED']);

export const createProposalSchema = z.object({
  customerId: z.string().uuid('customerId inválido.'),
  vehicleId: z.string().uuid('vehicleId inválido.'),
  sellerId: z.string().uuid('sellerId inválido.').optional(),
  proposedPrice: z.number().positive('O preço proposto deve ser positivo.'),
  downPayment: z.number().nonnegative().optional(),
  financingAmount: z.number().nonnegative().optional(),
  installments: z.number().int().positive().optional(),
  interestRate: z.number().nonnegative().max(100).optional(),
  status: proposalStatusEnum.default('DRAFT'),
  notes: z.string().max(2000).optional(),
});

export const updateProposalSchema = z
  .object({
    proposedPrice: z.number().positive(),
    downPayment: z.number().nonnegative().nullable(),
    financingAmount: z.number().nonnegative().nullable(),
    installments: z.number().int().positive().nullable(),
    interestRate: z.number().nonnegative().max(100).nullable(),
    status: proposalStatusEnum,
    notes: z.string().max(2000).nullable(),
  })
  .partial();

export const listProposalsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
  status: proposalStatusEnum.optional(),
  customerId: z.string().uuid().optional(),
});

export const idParamSchema = z.object({
  id: z.string().uuid('ID inválido.'),
});

export type CreateProposalInput = z.infer<typeof createProposalSchema>;
export type UpdateProposalInput = z.infer<typeof updateProposalSchema>;
export type ListProposalsQuery = z.infer<typeof listProposalsQuerySchema>;
