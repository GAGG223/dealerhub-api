import type { Request, Response } from 'express';
import { ok } from '../../shared/utils/http';
import { requireTenant } from '../../shared/middlewares';
import * as service from './reports.service';
import type { ReportQuery } from './reports.schema';

function ctx(req: Request): { dealershipId: string; query: ReportQuery } {
  return { dealershipId: requireTenant(req), query: req.query as unknown as ReportQuery };
}

export async function sales(req: Request, res: Response): Promise<Response> {
  const { dealershipId, query } = ctx(req);
  return ok(res, await service.salesReport(dealershipId, query));
}

export async function vehicles(req: Request, res: Response): Promise<Response> {
  const { dealershipId, query } = ctx(req);
  return ok(res, await service.vehiclesReport(dealershipId, query));
}

export async function leads(req: Request, res: Response): Promise<Response> {
  const { dealershipId, query } = ctx(req);
  return ok(res, await service.leadsReport(dealershipId, query));
}

export async function sellers(req: Request, res: Response): Promise<Response> {
  const { dealershipId, query } = ctx(req);
  return ok(res, await service.sellersReport(dealershipId, query));
}
