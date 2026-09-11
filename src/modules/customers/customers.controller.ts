import type { Request, Response } from 'express';
import { ok } from '../../shared/utils/http';
import * as service from './customers.service';
import type { ListCustomersQuery } from './customers.schema';

export async function create(req: Request, res: Response): Promise<Response> {
  const result = await service.createCustomer(req.user!, req.body);
  return ok(res, result, 201);
}

export async function list(req: Request, res: Response): Promise<Response> {
  const result = await service.listCustomers(
    req.user!,
    req.query as unknown as ListCustomersQuery,
  );
  return ok(res, result);
}

export async function getById(req: Request, res: Response): Promise<Response> {
  const result = await service.getCustomer(req.user!, req.params.id);
  return ok(res, result);
}

export async function update(req: Request, res: Response): Promise<Response> {
  const result = await service.updateCustomer(req.user!, req.params.id, req.body);
  return ok(res, result);
}

export async function remove(req: Request, res: Response): Promise<Response> {
  const result = await service.deleteCustomer(req.user!, req.params.id);
  return ok(res, result);
}
