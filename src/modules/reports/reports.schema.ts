import { z } from 'zod';

/** Filtros comuns aos relatórios (item 24). Todos opcionais. */
export const reportQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  sellerId: z.string().uuid().optional(),
  status: z.string().optional(),
  brand: z.string().optional(),
});

export type ReportQuery = z.infer<typeof reportQuerySchema>;
