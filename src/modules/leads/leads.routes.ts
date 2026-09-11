import { Router } from 'express';
import { asyncHandler } from '../../shared/utils/http';
import { authenticate, authorize, tenantScope, validate } from '../../shared/middlewares';
import * as controller from './leads.controller';
import {
  createLeadSchema,
  idParamSchema,
  listLeadsQuerySchema,
  updateLeadSchema,
  updateLeadStatusSchema,
} from './leads.schema';

/**
 * Rotas de leads (item 17). ADMIN, MANAGER e SELLER; SELLER limitado aos
 * próprios leads (ownership no service).
 */
const router = Router();

router.use(authenticate, tenantScope, authorize('ADMIN', 'MANAGER', 'SELLER'));

router.get('/', validate({ query: listLeadsQuerySchema }), asyncHandler(controller.list));
router.get('/:id', validate({ params: idParamSchema }), asyncHandler(controller.getById));
router.post('/', validate({ body: createLeadSchema }), asyncHandler(controller.create));
router.patch(
  '/:id/status',
  validate({ params: idParamSchema, body: updateLeadStatusSchema }),
  asyncHandler(controller.updateStatus),
);
router.put(
  '/:id',
  validate({ params: idParamSchema, body: updateLeadSchema }),
  asyncHandler(controller.update),
);
router.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateLeadSchema }),
  asyncHandler(controller.update),
);

export default router;
