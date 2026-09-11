import { Router } from 'express';
import { asyncHandler, ok } from '../../shared/utils/http';
import { authenticate, authorize, requireTenant, tenantScope, validate } from '../../shared/middlewares';
import { listAuditLogs } from './audit.service';
import { listAuditQuerySchema, type ListAuditQuery } from './audit.schema';

/**
 * Auditoria (item 25). Somente leitura e restrito ao ADMIN do tenant.
 * Não existem rotas de escrita: logs de auditoria são imutáveis pela API.
 */
const router = Router();

router.get(
  '/',
  authenticate,
  tenantScope,
  authorize('ADMIN'),
  validate({ query: listAuditQuerySchema }),
  asyncHandler(async (req, res) => {
    const dealershipId = requireTenant(req);
    const data = await listAuditLogs(dealershipId, req.query as unknown as ListAuditQuery);
    return ok(res, data);
  }),
);

export default router;
