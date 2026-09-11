import { ERROR_CODES, type ErrorCode } from './error-codes';

/**
 * Erro de aplicação previsível (erro de negócio/validação/autorização).
 * Diferente de erros inesperados, o AppError carrega um código semântico e
 * um status HTTP, permitindo respostas consistentes no error handler global.
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(code: ErrorCode, message?: string, details?: unknown) {
    const entry = ERROR_CODES[code];
    super(message ?? entry.message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = entry.status;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}
