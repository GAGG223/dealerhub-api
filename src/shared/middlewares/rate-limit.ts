import rateLimit from 'express-rate-limit';
import { env } from '../../config/env';

/** Rate limiter global aplicado a toda a API (item 28). */
export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Muitas requisições. Tente novamente mais tarde.' },
  },
});

/** Rate limiter mais restritivo para endpoints de autenticação (anti brute-force). */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Muitas tentativas. Tente novamente mais tarde.' },
  },
});
