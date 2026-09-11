import type { Request, Response } from 'express';
import { ok } from '../../shared/utils/http';
import * as service from './leads.service';
import type { ListLeadsQuery } from './leads.schema';

export async function create(req: Request, res: Response): Promise<Response> {
  const result = await service.createLead(req.user!, req.body);
  return ok(res, result, 201);
}

export async function list(req: Request, res: Response): Promise<Response> {
  const result = await service.listLeads(req.user!, req.query as unknown as ListLeadsQuery);
  return ok(res, result);
}

export async function getById(req: Request, res: Response): Promise<Response> {
  const result = await service.getLead(req.user!, req.params.id);
  return ok(res, result);
}

export async function update(req: Request, res: Response): Promise<Response> {
  const result = await service.updateLead(req.user!, req.params.id, req.body);
  return ok(res, result);
}

export async function updateStatus(req: Request, res: Response): Promise<Response> {
  const result = await service.updateLeadStatus(req.user!, req.params.id, req.body.status);
  return ok(res, result);
}
