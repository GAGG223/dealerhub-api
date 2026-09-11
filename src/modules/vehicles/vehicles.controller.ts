import type { Request, Response } from 'express';
import { ok } from '../../shared/utils/http';
import { requireTenant } from '../../shared/middlewares';
import * as service from './vehicles.service';
import type { ListVehiclesQuery } from './vehicles.schema';

function actor(req: Request) {
  return { userId: req.user!.id, ip: req.ip };
}

export async function create(req: Request, res: Response): Promise<Response> {
  const dealershipId = requireTenant(req);
  const result = await service.createVehicle(dealershipId, req.body, actor(req));
  return ok(res, result, 201);
}

export async function list(req: Request, res: Response): Promise<Response> {
  const dealershipId = requireTenant(req);
  const result = await service.listVehicles(
    dealershipId,
    req.query as unknown as ListVehiclesQuery,
  );
  return ok(res, result);
}

export async function getById(req: Request, res: Response): Promise<Response> {
  const dealershipId = requireTenant(req);
  const result = await service.getVehicle(dealershipId, req.params.id);
  return ok(res, result);
}

export async function update(req: Request, res: Response): Promise<Response> {
  const dealershipId = requireTenant(req);
  const result = await service.updateVehicle(dealershipId, req.params.id, req.body, actor(req));
  return ok(res, result);
}

export async function remove(req: Request, res: Response): Promise<Response> {
  const dealershipId = requireTenant(req);
  const result = await service.deleteVehicle(dealershipId, req.params.id, actor(req));
  return ok(res, result);
}

export async function changeStatus(req: Request, res: Response): Promise<Response> {
  const dealershipId = requireTenant(req);
  const result = await service.changeStatus(
    dealershipId,
    req.params.id,
    req.body.status,
    actor(req),
  );
  return ok(res, result);
}

export async function reserve(req: Request, res: Response): Promise<Response> {
  const dealershipId = requireTenant(req);
  const result = await service.reserveVehicle(dealershipId, req.params.id, actor(req));
  return ok(res, result);
}

export async function release(req: Request, res: Response): Promise<Response> {
  const dealershipId = requireTenant(req);
  const result = await service.releaseVehicle(dealershipId, req.params.id, actor(req));
  return ok(res, result);
}

export async function addImage(req: Request, res: Response): Promise<Response> {
  const dealershipId = requireTenant(req);
  const result = await service.addImage(dealershipId, req.params.id, req.body);
  return ok(res, result, 201);
}

export async function listImages(req: Request, res: Response): Promise<Response> {
  const dealershipId = requireTenant(req);
  const result = await service.listImages(dealershipId, req.params.id);
  return ok(res, result);
}

export async function deleteImage(req: Request, res: Response): Promise<Response> {
  const dealershipId = requireTenant(req);
  const result = await service.deleteImage(dealershipId, req.params.id, req.params.imageId);
  return ok(res, result);
}
