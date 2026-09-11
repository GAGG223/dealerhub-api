import type { Request, Response } from 'express';
import { prisma } from '../../shared/database/prisma';

/**
 * Health check (item 37): verifica se a API responde e se o banco está acessível.
 * Retorna 200 quando tudo ok, 503 quando o banco está indisponível.
 */
export async function health(_req: Request, res: Response): Promise<Response> {
  let database: 'connected' | 'disconnected' = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = 'connected';
  } catch {
    database = 'disconnected';
  }

  const status = database === 'connected' ? 'ok' : 'degraded';
  return res.status(database === 'connected' ? 200 : 503).json({
    status,
    database,
    timestamp: new Date().toISOString(),
  });
}
