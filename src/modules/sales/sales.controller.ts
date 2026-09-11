import type { Request, Response } from 'express';
import { ok } from '../../shared/utils/http';
import * as service from './sales.service';
import type { ListSalesQuery } from './sales.schema';

export async function create(req: Request, res: Response): Promise<Response> {
  const result = await service.createSale(req.user!, req.body);
  return ok(res, result, 201);
}

export async function list(req: Request, res: Response): Promise<Response> {
  const result = await service.listSales(req.user!, req.query as unknown as ListSalesQuery);
  return ok(res, result);
}

export async function getById(req: Request, res: Response): Promise<Response> {
  const result = await service.getSale(req.user!, req.params.id);
  return ok(res, result);
}

export async function updateStatus(req: Request, res: Response): Promise<Response> {
  const result = await service.changeSaleStatus(req.user!, req.params.id, req.body.status);
  return ok(res, result);
}

export async function addPayment(req: Request, res: Response): Promise<Response> {
  const result = await service.addPayment(req.user!, req.params.id, req.body);
  return ok(res, result, 201);
}

export async function listPayments(req: Request, res: Response): Promise<Response> {
  const result = await service.listPayments(req.user!, req.params.id);
  return ok(res, result);
}

export async function addTradeIn(req: Request, res: Response): Promise<Response> {
  const result = await service.addTradeIn(req.user!, req.params.id, req.body);
  return ok(res, result, 201);
}
