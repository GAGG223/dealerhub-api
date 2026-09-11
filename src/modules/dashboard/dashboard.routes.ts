import { Router } from 'express';
import { asyncHandler, ok } from '../../shared/utils/http';
import { authenticate, authorize, requireTenant, tenantScope } from '../../shared/middlewares';
import { getDashboard } from './dashboard.service';

/**
 * Dashboard (item 23). Disponível para ADMIN, MANAGER e SELLER do tenant.
 * As métricas são sempre do próprio tenant (requireTenant).
 */
const router = Router();

router.get(
  '/',
  authenticate,
  tenantScope,
  authorize('ADMIN', 'MANAGER', 'SELLER'),
  asyncHandler(async (req, res) => {
    const dealershipId = requireTenant(req);
    const data = await getDashboard(dealershipId);
    return ok(res, data);
  }),
);

export default router;
