import { z } from 'zod';

/**
 * ADMIN só pode criar usuários com role ADMIN, MANAGER ou SELLER dentro da
 * própria concessionária. SUPER_ADMIN não é criável por aqui (é da plataforma).
 */
export const createUserSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.'),
  role: z.enum(['ADMIN', 'MANAGER', 'SELLER']),
  phone: z.string().max(20).optional(),
  position: z.string().max(80).optional(),
});

export const updateUserSchema = z
  .object({
    name: z.string().min(2).max(120),
    role: z.enum(['ADMIN', 'MANAGER', 'SELLER']),
    phone: z.string().max(20).nullable(),
    position: z.string().max(80).nullable(),
    active: z.boolean(),
    password: z.string().min(8),
  })
  .partial();

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'SELLER']).optional(),
  search: z.string().optional(),
  active: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export const idParamSchema = z.object({
  id: z.string().uuid('ID inválido.'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
