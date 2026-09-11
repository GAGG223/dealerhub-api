import type { NextFunction, Request, Response } from 'express';

/**
 * Envolve um handler assíncrono para que erros lançados sejam encaminhados
 * ao middleware global de erros via next(err), evitando try/catch repetido.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}

/** Envelope de sucesso consistente com o de erro (item 27). */
export function ok<T>(res: Response, data: T, status = 200): Response {
  return res.status(status).json({ success: true, data });
}
