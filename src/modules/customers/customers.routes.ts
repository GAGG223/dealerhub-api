import { Router } from 'express';
import { asyncHandler } from '../../shared/utils/http';
import { authenticate, authorize, tenantScope, validate } from '../../shared/middlewares';
import * as controller from './customers.controller';
import {
  createCustomerSchema,
  idParamSchema,
  listCustomersQuerySchema,
  replaceCustomerSchema,
  updateCustomerSchema,
} from './customers.schema';

/**
 * Rotas de clientes (item 15).
 * ADMIN, MANAGER e SELLER podem operar; SELLER limitado aos próprios (ownership
 * garantido no service). Exclusão restrita a ADMIN e MANAGER.
 */
const router = Router();

router.use(authenticate, tenantScope, authorize('ADMIN', 'MANAGER', 'SELLER'));

router.get('/', validate({ query: listCustomersQuerySchema }), asyncHandler(controller.list));
router.get('/:id', validate({ params: idParamSchema }), asyncHandler(controller.getById));
router.post('/', validate({ body: createCustomerSchema }), asyncHandler(controller.create));
router.put(
  '/:id',
  validate({ params: idParamSchema, body: replaceCustomerSchema }),
  asyncHandler(controller.update),
);
router.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateCustomerSchema }),
  asyncHandler(controller.update),
);
router.delete(
  '/:id',
  authorize('ADMIN', 'MANAGER'),
  validate({ params: idParamSchema }),
  asyncHandler(controller.remove),
);

export default router;
