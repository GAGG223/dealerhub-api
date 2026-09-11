import { Router } from 'express';
import { asyncHandler } from '../../shared/utils/http';
import { authenticate, authRateLimiter, validate } from '../../shared/middlewares';
import * as authController from './auth.controller';
import { loginSchema, logoutSchema, refreshSchema, registerSchema } from './auth.schema';

const router = Router();

router.post(
  '/register',
  authRateLimiter,
  validate({ body: registerSchema }),
  asyncHandler(authController.register),
);

router.post(
  '/login',
  authRateLimiter,
  validate({ body: loginSchema }),
  asyncHandler(authController.login),
);

router.post('/refresh', validate({ body: refreshSchema }), asyncHandler(authController.refresh));

router.post('/logout', validate({ body: logoutSchema }), asyncHandler(authController.logout));

router.get('/me', authenticate, asyncHandler(authController.me));

export default router;
