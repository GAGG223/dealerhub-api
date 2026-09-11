import type { Request, Response } from 'express';
import { ok } from '../../shared/utils/http';
import * as service from './dealerships.service';
import type { ListDealershipsQuery } from './dealerships.schema';

export async function create(req: Request, res: Response): Promise<Response> {
  const result = await service.createDealership(req.body, req.user?.id);
  return ok(res, result, 201);
}

export async function list(req: Request, res: Response): Promise<Response> {
  const result = await service.listDealerships(req.query as unknown as ListDealershipsQuery);
  return ok(res, result);
}

export async function getById(req: Request, res: Response): Promise<Response> {
  const result = await service.getDealership(req.params.id);
  return ok(res, result);
}

export async function update(req: Request, res: Response): Promise<Response> {
  const result = await service.updateDealership(req.params.id, req.body, req.user?.id);
  return ok(res, result);
}

export async function remove(req: Request, res: Response): Promise<Response> {
  const result = await service.deactivateDealership(req.params.id, req.user?.id);
  return ok(res, result);
}
