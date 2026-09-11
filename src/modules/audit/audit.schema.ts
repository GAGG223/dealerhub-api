import { z } from 'zod';

export const listAuditQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  entity: z.string().optional(),
  action: z.string().optional(),
  userId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type ListAuditQuery = z.infer<typeof listAuditQuerySchema>;
