# ============================================================================
# DealerHub API - Dockerfile multi-stage
# ============================================================================

# ---- Stage 1: build ----
FROM node:20-alpine AS builder

WORKDIR /app

# Instala dependências (inclui devDependencies para compilar)
COPY package.json package-lock.json ./
RUN npm ci

# Copia o schema e gera o Prisma Client
COPY prisma ./prisma
RUN npx prisma generate

# Copia o restante do código e compila TypeScript -> dist
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Stage 2: runtime ----
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Apenas dependências de produção
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copia o Prisma Client já gerado e o schema (para migrate deploy)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma

# Copia o build
COPY --from=builder /app/dist ./dist

# Usuário não-root (segurança)
USER node

EXPOSE 3333

# migrate deploy garante o schema no boot; depois inicia a API
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
