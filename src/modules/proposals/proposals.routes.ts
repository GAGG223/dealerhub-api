import { Router } from 'express';
import { asyncHandler } from '../../shared/utils/http';
import { authenticate, authorize, tenantScope, validate } from '../../shared/middlewares';
import * as controller from './proposals.controller';
import {
  createProposalSchema,
  idParamSchema,
  listProposalsQuerySchema,
  updateProposalSchema,
} from './proposals.schema';

/**
 * Rotas de propostas (item 18). ADMIN, MANAGER e SELLER; SELLER limitado às
 * próprias propostas (ownership no service). Exclusão restrita a ADMIN/MANAGER.
 */
const router = Router();

router.use(authenticate, tenantScope, authorize('ADMIN', 'MANAGER', 'SELLER'));

router.get('/', validate({ query: listProposalsQuerySchema }), asyncHandler(controller.list));
router.get('/:id', validate({ params: idParamSchema }), asyncHandler(controller.getById));
router.post('/', validate({ body: createProposalSchema }), asyncHandler(controller.create));
router.put(
  '/:id',
  validate({ params: idParamSchema, body: updateProposalSchema }),
  asyncHandler(controller.update),
);
router.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateProposalSchema }),
  asyncHandler(controller.update),
);
router.delete(
  '/:id',
  authorize('ADMIN', 'MANAGER'),
  validate({ params: idParamSchema }),
  asyncHandler(controller.remove),
);

export default router;
