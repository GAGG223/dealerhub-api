import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';

const SALT_ROUNDS = 10;

/** Gera o hash de uma senha em texto puro. Nunca armazenamos a senha crua. */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/** Compara uma senha em texto puro com um hash bcrypt. */
export function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Hash determinístico (SHA-256) do refresh token para armazenamento no banco.
 * O refresh token em si já é um JWT assinado; guardamos apenas o hash para
 * permitir revogação/rotação sem persistir o token cru, e o determinismo
 * permite lookup direto por índice unique (mais eficiente que bcrypt aqui).
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
