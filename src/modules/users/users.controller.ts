import type { Request, Response } from 'express';
import { ok } from '../../shared/utils/http';
import { requireTenant } from '../../shared/middlewares';
import * as service from './users.service';
import type { ListUsersQuery } from './users.schema';

export async function create(req: Request, res: Response): Promise<Response> {
  const dealershipId = requireTenant(req);
  const result = await service.createUser(dealershipId, req.body, req.user!.id);
  return ok(res, result, 201);
}

export async function list(req: Request, res: Response): Promise<Response> {
  const dealershipId = requireTenant(req);
  const result = await service.listUsers(dealershipId, req.query as unknown as ListUsersQuery);
  return ok(res, result);
}

export async function getById(req: Request, res: Response): Promise<Response> {
  const dealershipId = requireTenant(req);
  const result = await service.getUser(dealershipId, req.params.id);
  return ok(res, result);
}

export async function update(req: Request, res: Response): Promise<Response> {
  const dealershipId = requireTenant(req);
  const result = await service.updateUser(dealershipId, req.params.id, req.body, req.user!.id);
  return ok(res, result);
}

export async function remove(req: Request, res: Response): Promise<Response> {
  const dealershipId = requireTenant(req);
  const result = await service.deactivateUser(dealershipId, req.params.id, req.user!.id);
  return ok(res, result);
}
