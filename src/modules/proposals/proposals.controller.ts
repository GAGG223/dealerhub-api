import type { Request, Response } from 'express';
import { ok } from '../../shared/utils/http';
import * as service from './proposals.service';
import type { ListProposalsQuery } from './proposals.schema';

export async function create(req: Request, res: Response): Promise<Response> {
  const result = await service.createProposal(req.user!, req.body);
  return ok(res, result, 201);
}

export async function list(req: Request, res: Response): Promise<Response> {
  const result = await service.listProposals(
    req.user!,
    req.query as unknown as ListProposalsQuery,
  );
  return ok(res, result);
}

export async function getById(req: Request, res: Response): Promise<Response> {
  const result = await service.getProposal(req.user!, req.params.id);
  return ok(res, result);
}

export async function update(req: Request, res: Response): Promise<Response> {
  const result = await service.updateProposal(req.user!, req.params.id, req.body);
  return ok(res, result);
}

export async function remove(req: Request, res: Response): Promise<Response> {
  const result = await service.deleteProposal(req.user!, req.params.id);
  return ok(res, result);
}
