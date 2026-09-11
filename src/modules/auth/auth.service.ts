import { randomUUID } from 'node:crypto';
import type { User } from '@prisma/client';
import { prisma } from '../../shared/database/prisma';
import { AppError } from '../../shared/errors/app-error';
import { comparePassword, hashPassword, hashToken } from '../../shared/utils/hash';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../shared/utils/jwt';
import { env } from '../../config/env';
import { recordAudit } from '../audit/audit.service';
import type { LoginInput, RegisterInput } from './auth.schema';

/** Representação pública de um usuário (sem passwordHash). */
export interface SafeUser {
  id: string;
  dealershipId: string | null;
  name: string;
  email: string;
  role: User['role'];
  phone: string | null;
  position: string | null;
  active: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: SafeUser;
  tokens: AuthTokens;
}

export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    dealershipId: user.dealershipId,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    position: user.position,
    active: user.active,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/** Calcula a data de expiração do refresh token com base na config (ex.: "7d"). */
function refreshExpiryDate(): Date {
  const raw = env.JWT_REFRESH_EXPIRES_IN;
  const match = /^(\d+)([smhd])$/.exec(raw);
  const now = Date.now();
  if (!match) {
    return new Date(now + 7 * 24 * 60 * 60 * 1000);
  }
  const value = Number(match[1]);
  const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2]] ?? 86_400_000;
  return new Date(now + value * unitMs);
}

async function issueTokens(user: User): Promise<AuthTokens> {
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    dealershipId: user.dealershipId,
  });

  const jti = randomUUID();
  const refreshToken = signRefreshToken({ sub: user.id, jti });

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshExpiryDate(),
    },
  });

  return { accessToken, refreshToken };
}

export async function login(input: LoginInput, ipAddress?: string): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user || !user.active) {
    throw new AppError('INVALID_CREDENTIALS');
  }

  const valid = await comparePassword(input.password, user.passwordHash);
  if (!valid) {
    throw new AppError('INVALID_CREDENTIALS');
  }

  const tokens = await issueTokens(user);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await recordAudit({
    action: 'USER_UPDATED',
    entity: 'User',
    entityId: user.id,
    dealershipId: user.dealershipId,
    userId: user.id,
    metadata: { event: 'login' },
    ipAddress,
  });

  return { user: toSafeUser(user), tokens };
}

/** Registro público: cria um usuário SELLER numa concessionária ativa existente. */
export async function register(input: RegisterInput, ipAddress?: string): Promise<AuthResult> {
  const dealership = await prisma.dealership.findUnique({ where: { id: input.dealershipId } });
  if (!dealership) {
    throw new AppError('DEALERSHIP_NOT_FOUND');
  }
  if (!dealership.active) {
    throw new AppError('DEALERSHIP_INACTIVE');
  }

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError('DUPLICATE_EMAIL');
  }

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      role: 'SELLER',
      dealershipId: input.dealershipId,
    },
  });

  await recordAudit({
    action: 'USER_CREATED',
    entity: 'User',
    entityId: user.id,
    dealershipId: user.dealershipId,
    userId: user.id,
    ipAddress,
  });

  const tokens = await issueTokens(user);
  return { user: toSafeUser(user), tokens };
}

/**
 * Rotação de refresh token: valida o token recebido, revoga o antigo e emite
 * um novo par. Se o token não existir, estiver revogado ou expirado, rejeita.
 */
export async function refresh(refreshToken: string): Promise<AuthTokens> {
  const payload = verifyRefreshToken(refreshToken);
  const tokenHash = hashToken(refreshToken);

  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new AppError('INVALID_TOKEN', 'Refresh token inválido ou expirado.');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.active) {
    throw new AppError('INVALID_TOKEN');
  }

  // Revoga o token usado (rotação) e emite um novo par.
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  return issueTokens(user);
}

/** Logout: revoga o refresh token informado (invalida a sessão no servidor). */
export async function logout(refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getMe(userId: string): Promise<SafeUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('USER_NOT_FOUND');
  }
  return toSafeUser(user);
}
