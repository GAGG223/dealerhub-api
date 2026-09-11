import { Router } from 'express';
import { asyncHandler } from '../../shared/utils/http';
import { authenticate, authorize, tenantScope, validate } from '../../shared/middlewares';
import * as controller from './reports.controller';
import { reportQuerySchema } from './reports.schema';

/**
 * Relatórios (item 24). Restritos a ADMIN e MANAGER (visão gerencial).
 * Sempre escopados ao tenant.
 */
const router = Router();

router.use(authenticate, tenantScope, authorize('ADMIN', 'MANAGER'));

router.get('/sales', validate({ query: reportQuerySchema }), asyncHandler(controller.sales));
router.get('/vehicles', validate({ query: reportQuerySchema }), asyncHandler(controller.vehicles));
router.get('/leads', validate({ query: reportQuerySchema }), asyncHandler(controller.leads));
router.get('/sellers', validate({ query: reportQuerySchema }), asyncHandler(controller.sellers));

export default router;
