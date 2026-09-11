import type { Request, Response } from 'express';
import { ok } from '../../shared/utils/http';
import { AppError } from '../../shared/errors/app-error';
import * as authService from './auth.service';

function getIp(req: Request): string | undefined {
  return req.ip ?? req.socket.remoteAddress ?? undefined;
}

export async function register(req: Request, res: Response): Promise<Response> {
  const result = await authService.register(req.body, getIp(req));
  return ok(res, result, 201);
}

export async function login(req: Request, res: Response): Promise<Response> {
  const result = await authService.login(req.body, getIp(req));
  return ok(res, result);
}

export async function refresh(req: Request, res: Response): Promise<Response> {
  const tokens = await authService.refresh(req.body.refreshToken);
  return ok(res, tokens);
}

export async function logout(req: Request, res: Response): Promise<Response> {
  await authService.logout(req.body.refreshToken);
  return ok(res, { message: 'Logout efetuado.' });
}

export async function me(req: Request, res: Response): Promise<Response> {
  if (!req.user) {
    throw new AppError('UNAUTHORIZED');
  }
  const user = await authService.getMe(req.user.id);
  return ok(res, user);
}
