import { Router } from 'express';
import { asyncHandler } from '../../shared/utils/http';
import { authenticate, authorize, tenantScope, validate } from '../../shared/middlewares';
import * as controller from './users.controller';
import {
  createUserSchema,
  idParamSchema,
  listUsersQuerySchema,
  updateUserSchema,
} from './users.schema';

/**
 * Rotas de usuários — gerenciadas pelo ADMIN da concessionária (item 7).
 * Toda operação é escopada ao tenant do ADMIN (tenantScope + requireTenant).
 */
const router = Router();

router.use(authenticate, authorize('ADMIN'), tenantScope);

router.post('/', validate({ body: createUserSchema }), asyncHandler(controller.create));
router.get('/', validate({ query: listUsersQuerySchema }), asyncHandler(controller.list));
router.get('/:id', validate({ params: idParamSchema }), asyncHandler(controller.getById));
router.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateUserSchema }),
  asyncHandler(controller.update),
);
router.delete('/:id', validate({ params: idParamSchema }), asyncHandler(controller.remove));

export default router;
