# ============================================================================
# DealerHub API - Dockerfile multi-stage
# ============================================================================

# ---- Stage 1: build ----
FROM node:20-alpine AS builder

WORKDIR /app

# openssl é necessário para os engines do Prisma no Alpine (musl)
RUN apk add --no-cache openssl

# Instala dependências (inclui devDependencies para compilar)
COPY package.json package-lock.json ./
RUN npm ci

# Copia o schema e gera o Prisma Client
COPY prisma ./prisma
RUN npx prisma generate

# Copia o restante do código e compila TypeScript -> dist
COPY tsconfig.json tsconfig.build.json tsconfig.seed.json ./
COPY src ./src
RUN npm run build
# Compila também o seed (dist/prisma/seed.js) para popular sem depender de tsx
RUN npm run build:seed

# ---- Stage 2: runtime ----
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# openssl é necessário para os engines do Prisma no Alpine (musl)
RUN apk add --no-cache openssl

# Apenas dependências de produção
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copia o Prisma Client já gerado e o schema (para migrate deploy)
# Mantém a posse do usuário node para que o migrate deploy possa escrever engines
COPY --from=builder --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=node:node /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=node:node /app/node_modules/prisma ./node_modules/prisma
COPY prisma ./prisma

# Copia o build
COPY --from=builder /app/dist ./dist

# Garante que todo o node_modules seja gravável pelo usuário não-root
RUN chown -R node:node /app/node_modules

# Usuário não-root (segurança)
USER node

EXPOSE 3333

# migrate deploy garante o schema no boot; depois inicia a API
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
