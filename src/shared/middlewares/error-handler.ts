import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error';
import { ERROR_CODES } from '../errors/error-codes';
import { isProduction } from '../../config/env';
import { logger } from '../utils/logger';

/**
 * Middleware global de tratamento de erros (item 27).
 * Normaliza qualquer erro para o formato:
 *   { success: false, error: { code, message, details? } }
 * Nunca vaza stack trace em produção.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  // Erros de aplicação previsíveis
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  // Erros de validação Zod que escaparam do middleware validate
  if (err instanceof ZodError) {
    res.status(ERROR_CODES.VALIDATION_ERROR.status).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: ERROR_CODES.VALIDATION_ERROR.message,
        details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      },
    });
    return;
  }

  // Erros conhecidos do Prisma
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002 = violação de unique constraint
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[] | undefined)?.join(', ') ?? '';
      const isEmail = target.includes('email');
      res.status(isEmail ? 409 : 409).json({
        success: false,
        error: {
          code: isEmail ? 'DUPLICATE_EMAIL' : 'VALIDATION_ERROR',
          message: isEmail
            ? ERROR_CODES.DUPLICATE_EMAIL.message
            : `Registro duplicado${target ? ` (${target})` : ''}.`,
        },
      });
      return;
    }
    // P2025 = registro não encontrado
    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: ERROR_CODES.NOT_FOUND.message },
      });
      return;
    }
  }

  // Erro inesperado: logar detalhe internamente, responder genérico
  logger.error({ err, path: req.path, method: req.method }, 'Erro não tratado');

  res.status(ERROR_CODES.INTERNAL_ERROR.status).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: ERROR_CODES.INTERNAL_ERROR.message,
      ...(isProduction ? {} : { debug: err instanceof Error ? err.message : String(err) }),
    },
  });
}

/** Handler 404 para rotas não mapeadas. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
    },
  });
}
