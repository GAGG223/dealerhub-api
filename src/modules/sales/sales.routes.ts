import { Router } from 'express';
import { asyncHandler } from '../../shared/utils/http';
import { authenticate, authorize, tenantScope, validate } from '../../shared/middlewares';
import * as controller from './sales.controller';
import {
  createPaymentSchema,
  createSaleSchema,
  createTradeInSchema,
  idParamSchema,
  listSalesQuerySchema,
  updateSaleStatusSchema,
} from './sales.schema';

/**
 * Rotas de vendas (itens 19-22). ADMIN, MANAGER e SELLER podem concluir vendas
 * (item 48.8). SELLER limitado às próprias vendas (ownership no service).
 */
const router = Router();

router.use(authenticate, tenantScope, authorize('ADMIN', 'MANAGER', 'SELLER'));

router.get('/', validate({ query: listSalesQuerySchema }), asyncHandler(controller.list));
router.get('/:id', validate({ params: idParamSchema }), asyncHandler(controller.getById));
router.post('/', validate({ body: createSaleSchema }), asyncHandler(controller.create));
router.patch(
  '/:id/status',
  validate({ params: idParamSchema, body: updateSaleStatusSchema }),
  asyncHandler(controller.updateStatus),
);

// Pagamentos
router.get(
  '/:id/payments',
  validate({ params: idParamSchema }),
  asyncHandler(controller.listPayments),
);
router.post(
  '/:id/payments',
  validate({ params: idParamSchema, body: createPaymentSchema }),
  asyncHandler(controller.addPayment),
);

// Trade-in
router.post(
  '/:id/trade-in',
  validate({ params: idParamSchema, body: createTradeInSchema }),
  asyncHandler(controller.addTradeIn),
);

export default router;
