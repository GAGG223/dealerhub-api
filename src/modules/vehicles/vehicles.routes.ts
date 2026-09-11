import { Router } from 'express';
import { asyncHandler } from '../../shared/utils/http';
import { authenticate, authorize, tenantScope, validate } from '../../shared/middlewares';
import * as controller from './vehicles.controller';
import {
  createImageSchema,
  createVehicleSchema,
  idParamSchema,
  imageParamsSchema,
  listVehiclesQuerySchema,
  replaceVehicleSchema,
  updateStatusSchema,
  updateVehicleSchema,
} from './vehicles.schema';

/**
 * Rotas de veículos (itens 10-14).
 * - Leitura: qualquer role do tenant (ADMIN, MANAGER, SELLER).
 * - Gestão (create/update/delete/status): ADMIN, MANAGER.
 * - Reserva/liberação: ADMIN, MANAGER, SELLER.
 */
const router = Router();

router.use(authenticate, tenantScope);

// Leitura
router.get('/', validate({ query: listVehiclesQuerySchema }), asyncHandler(controller.list));
router.get('/:id', validate({ params: idParamSchema }), asyncHandler(controller.getById));
router.get(
  '/:id/images',
  validate({ params: idParamSchema }),
  asyncHandler(controller.listImages),
);

// Reserva / liberação (inclui SELLER)
router.post(
  '/:id/reserve',
  authorize('ADMIN', 'MANAGER', 'SELLER'),
  validate({ params: idParamSchema }),
  asyncHandler(controller.reserve),
);
router.post(
  '/:id/release',
  authorize('ADMIN', 'MANAGER', 'SELLER'),
  validate({ params: idParamSchema }),
  asyncHandler(controller.release),
);

// Gestão (ADMIN, MANAGER)
router.post(
  '/',
  authorize('ADMIN', 'MANAGER'),
  validate({ body: createVehicleSchema }),
  asyncHandler(controller.create),
);
router.put(
  '/:id',
  authorize('ADMIN', 'MANAGER'),
  validate({ params: idParamSchema, body: replaceVehicleSchema }),
  asyncHandler(controller.update),
);
router.patch(
  '/:id/status',
  authorize('ADMIN', 'MANAGER'),
  validate({ params: idParamSchema, body: updateStatusSchema }),
  asyncHandler(controller.changeStatus),
);
router.patch(
  '/:id',
  authorize('ADMIN', 'MANAGER'),
  validate({ params: idParamSchema, body: updateVehicleSchema }),
  asyncHandler(controller.update),
);
router.delete(
  '/:id',
  authorize('ADMIN', 'MANAGER'),
  validate({ params: idParamSchema }),
  asyncHandler(controller.remove),
);

// Imagens (ADMIN, MANAGER)
router.post(
  '/:id/images',
  authorize('ADMIN', 'MANAGER'),
  validate({ params: idParamSchema, body: createImageSchema }),
  asyncHandler(controller.addImage),
);
router.delete(
  '/:id/images/:imageId',
  authorize('ADMIN', 'MANAGER'),
  validate({ params: imageParamsSchema }),
  asyncHandler(controller.deleteImage),
);

export default router;
