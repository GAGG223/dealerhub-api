import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(1, 'Senha é obrigatória.'),
});

/**
 * Registro público: cria um novo usuário. Por padrão o registro cria um
 * usuário SELLER dentro de uma concessionária existente (o dealershipId é
 * obrigatório). A criação de ADMIN/concessionária é feita pelo SUPER_ADMIN
 * no fluxo de dealerships. Não permitimos escolher role no registro público.
 */
export const registerSchema = z.object({
  name: z.string().min(2, 'Nome muito curto.').max(120),
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.'),
  dealershipId: z.string().uuid('dealershipId inválido.'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken é obrigatório.'),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken é obrigatório.'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
