import { Router } from 'express';
import { asyncHandler } from '../../shared/utils/http';
import { authenticate, authorize, validate } from '../../shared/middlewares';
import * as controller from './dealerships.controller';
import {
  createDealershipSchema,
  idParamSchema,
  listDealershipsQuerySchema,
  updateDealershipSchema,
} from './dealerships.schema';

/**
 * Rotas de concessionárias — exclusivas do SUPER_ADMIN (item 9).
 * authenticate garante login; authorize('SUPER_ADMIN') garante o role.
 */
const router = Router();

router.use(authenticate, authorize('SUPER_ADMIN'));

router.post('/', validate({ body: createDealershipSchema }), asyncHandler(controller.create));

router.get('/', validate({ query: listDealershipsQuerySchema }), asyncHandler(controller.list));

router.get('/:id', validate({ params: idParamSchema }), asyncHandler(controller.getById));

router.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateDealershipSchema }),
  asyncHandler(controller.update),
);

router.delete('/:id', validate({ params: idParamSchema }), asyncHandler(controller.remove));

export default router;
