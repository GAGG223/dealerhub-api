import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';
import { AppError } from '../errors/app-error';

interface ValidationSchemas {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

/**
 * Middleware de validação com Zod para body, params e query (item 26).
 * Em caso de falha, lança AppError VALIDATION_ERROR com os detalhes por campo,
 * mantendo o formato de erro consistente.
 *
 * Os valores validados/coeridos substituem os originais em req.*, garantindo
 * que os controllers recebam dados já tipados e normalizados.
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      if (schemas.query) {
        // Object.assign porque req.query é somente-getter no Express 5+/algumas versões.
        Object.assign(req.query, schemas.query.parse(req.query));
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));
        next(new AppError('VALIDATION_ERROR', undefined, details));
        return;
      }
      next(err);
    }
  };
}
