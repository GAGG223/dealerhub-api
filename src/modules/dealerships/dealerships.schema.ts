import { z } from 'zod';

/** CNPJ: aceitamos apenas dígitos (14) ou formato mascarado; normalizamos p/ dígitos. */
const documentSchema = z
  .string()
  .min(11, 'Documento inválido.')
  .transform((v) => v.replace(/\D/g, ''))
  .refine((v) => v.length === 14, 'CNPJ deve conter 14 dígitos.');

export const createDealershipSchema = z.object({
  name: z.string().min(2).max(150),
  legalName: z.string().min(2).max(200),
  document: documentSchema,
  email: z.string().email('E-mail inválido.'),
  phone: z.string().min(8).max(20),
  address: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().length(2, 'UF deve ter 2 letras.').optional(),
  zipCode: z.string().max(10).optional(),
  // Primeiro usuário administrador (opcional): criado junto com a concessionária.
  admin: z
    .object({
      name: z.string().min(2).max(120),
      email: z.string().email('E-mail do admin inválido.'),
      password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.'),
    })
    .optional(),
});

export const updateDealershipSchema = z
  .object({
    name: z.string().min(2).max(150),
    legalName: z.string().min(2).max(200),
    email: z.string().email(),
    phone: z.string().min(8).max(20),
    address: z.string().max(200).nullable(),
    city: z.string().max(100).nullable(),
    state: z.string().length(2).nullable(),
    zipCode: z.string().max(10).nullable(),
    active: z.boolean(),
  })
  .partial();

export const listDealershipsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  active: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export const idParamSchema = z.object({
  id: z.string().uuid('ID inválido.'),
});

export type CreateDealershipInput = z.infer<typeof createDealershipSchema>;
export type UpdateDealershipInput = z.infer<typeof updateDealershipSchema>;
export type ListDealershipsQuery = z.infer<typeof listDealershipsQuerySchema>;
