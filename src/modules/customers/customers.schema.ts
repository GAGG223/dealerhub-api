import { z } from 'zod';

const cpfSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ''))
  .refine((v) => v.length === 11, 'CPF deve conter 11 dígitos.');

export const createCustomerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email('E-mail inválido.').optional(),
  phone: z.string().max(20).optional(),
  cpf: cpfSchema.optional(),
  city: z.string().max(100).optional(),
  state: z.string().length(2, 'UF deve ter 2 letras.').optional(),
  notes: z.string().max(2000).optional(),
});

export const replaceCustomerSchema = createCustomerSchema;
export const updateCustomerSchema = createCustomerSchema.partial();

export const listCustomersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
  search: z.string().optional(),
});

export const idParamSchema = z.object({
  id: z.string().uuid('ID inválido.'),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;
