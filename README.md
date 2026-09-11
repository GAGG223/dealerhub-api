# DealerHub API

> Gestão inteligente para concessionárias.

Plataforma SaaS multi-tenant para gestão de concessionárias de veículos. Uma única API atende diversas concessionárias independentes, com isolamento total de dados entre elas.

---

## Descrição

O **DealerHub** é o back-end de uma plataforma de gestão para concessionárias. Ele não foi feito para uma loja específica: é um SaaS onde cada concessionária é um **tenant** isolado, com seus próprios veículos, clientes, vendedores, leads, propostas e vendas.

## Problema que o projeto resolve

Concessionárias precisam controlar estoque, relacionamento com clientes (CRM), negociações e vendas — com regras de negócio reais (um veículo vendido não pode ser vendido de novo, uma reserva não pode ocorrer duas vezes, uma venda precisa ser atômica). Fazer isso de forma segura e multi-tenant, sem que uma concessionária enxergue dados de outra, é o núcleo do problema que a DealerHub API resolve.

## Funcionalidades

- Autenticação com JWT (access + refresh token com rotação)
- RBAC com 4 papéis (SUPER_ADMIN, ADMIN, MANAGER, SELLER)
- Multi-tenancy com isolamento garantido no back-end
- CRUD de veículos com filtros avançados, paginação e ordenação
- Controle de estoque com máquina de estados e reserva sem race condition
- Imagens de veículos (arquitetura preparada para S3)
- Clientes, Leads (CRM), Propostas
- Vendas com transação atômica, pagamentos e trade-in
- Dashboard e relatórios gerenciais
- Auditoria imutável de ações importantes
- Documentação OpenAPI/Swagger
- Testes (unitários e de integração)
- Docker + Docker Compose

## Arquitetura

Arquitetura **modular por domínio** (modular monolith), com camadas internas em cada módulo:

```
Request → Route → Middlewares → Controller → Service → Repository → Prisma → PostgreSQL
```

- **Routes**: definem endpoints, middlewares (auth, tenant, validação) e RBAC.
- **Controllers**: adaptam HTTP ↔ serviço. Sem regra de negócio.
- **Services**: regras de negócio, transações, isolamento de tenant e ownership.
- **Repositories**: usados onde a query é complexa (ex.: filtros de veículos).
- **Schemas (Zod)**: validação de body/params/query.
- **Shared**: middlewares, erros, utils, tipos e cliente Prisma reutilizados.

```
src/
├── config/          # env (Zod), openapi
├── shared/          # database, errors, middlewares, utils, types
├── modules/         # auth, dealerships, users, vehicles, customers,
│                    # leads, proposals, sales, dashboard, reports, audit, health
├── app.ts           # monta o Express
├── routes.ts        # agregador de rotas /api/v1
└── server.ts        # bootstrap
```

**Por que modular por domínio?** Com 12+ entidades, agrupar por feature mantém coesão alta e acoplamento baixo, facilita navegação e deixa cada módulo pronto para uma eventual extração em microsserviço. Evitamos overengineering: o Repository só existe onde agrega valor.

## Tecnologias

- **Node.js + TypeScript**
- **Express** (REST)
- **PostgreSQL + Prisma ORM**
- **JWT** (jsonwebtoken) + **bcryptjs**
- **Zod** (validação)
- **Helmet, CORS, express-rate-limit** (segurança)
- **Pino** (logging estruturado)
- **Swagger UI** (documentação)
- **Vitest + Supertest** (testes)
- **Docker + Docker Compose**

## Multi-tenancy

Estratégia: **shared database + shared schema**, com `dealershipId` em toda entidade pertencente a uma concessionária. O isolamento é garantido pelo **back-end**, nunca pelo cliente:

1. O login emite um JWT com `{ userId, dealershipId, role }`.
2. `authenticate` popula `req.user`; `tenantScope` deriva `req.tenantId` **do token** — nunca do body/query/URL.
3. Todos os services aplicam o `dealershipId` em **todo** `where`, inclusive nos `findById`.
4. Buscar um recurso de outro tenant retorna **404** (não vaza existência), mesmo com o ID correto na URL.
5. Apenas o SUPER_ADMIN opera cross-tenant, e somente no módulo de concessionárias.

Isso é coberto por testes de integração dedicados.

## Autenticação

- **Access token** (JWT curto, ~15min) para autorizar requisições.
- **Refresh token** (JWT longo, ~7d) persistido como hash (SHA-256) para permitir logout e **rotação**: ao usar um refresh token, ele é revogado e um novo par é emitido.
- Senhas nunca são armazenadas em texto puro (bcrypt).

```
POST /api/v1/auth/register   # cria um SELLER numa concessionária
POST /api/v1/auth/login      # retorna { user, tokens }
POST /api/v1/auth/refresh    # rotaciona os tokens
POST /api/v1/auth/logout     # revoga o refresh token
GET  /api/v1/auth/me         # dados do usuário autenticado
```

## Roles

| Role | Descrição |
|---|---|
| **SUPER_ADMIN** | Administra a plataforma: cria/edita/desativa concessionárias. Sem tenant fixo. |
| **ADMIN** | Administra a própria concessionária: usuários, veículos, clientes, leads, estoque; vê vendas e relatórios. |
| **MANAGER** | Gerente: gerencia veículos e leads, vê clientes/estoque/vendas, dashboard. |
| **SELLER** | Vendedor: vê veículos disponíveis, cadastra clientes/leads, cria propostas/vendas e enxerga apenas os próprios registros (ownership). |

Autorização por middleware: `authorize('ADMIN', 'MANAGER')`. Ownership do SELLER (só os próprios registros) é aplicado nos services.

## Banco de dados

Entidades principais:

- **Dealership** — o tenant (concessionária).
- **User** — usuário/login (SUPER_ADMIN tem `dealershipId` nulo).
- **RefreshToken** — sessões para refresh/rotação.
- **Customer** — clientes da concessionária.
- **Vehicle** / **VehicleImage** — estoque e imagens.
- **Lead** — CRM (oportunidades).
- **Proposal** — negociação pré-venda.
- **Sale** — venda concluída.
- **Payment** / **TradeIn** — pagamentos e veículo de troca de uma venda.
- **AuditLog** — trilha de auditoria imutável.

Índices compostos com `dealershipId` (ex.: `(dealershipId, status)`, `(dealershipId, brand)`, `(dealershipId, createdAt)`) otimizam consultas multi-tenant.

## Como executar

### Opção A — Docker (recomendado)

Sobe API + PostgreSQL, roda as migrations e inicia a API:

```bash
docker compose up -d
```

A API fica em `http://localhost:3333`. Para popular com dados de exemplo:

```bash
docker compose exec api npm run seed
```

### Opção B — Local

Requer Node 20+ e um PostgreSQL acessível.

```bash
npm install
cp .env.example .env          # ajuste DATABASE_URL e os segredos
npm run prisma:migrate        # cria o schema
npm run seed                  # popula dados fictícios (opcional)
npm run dev                   # inicia em modo desenvolvimento
```

## Prisma

```bash
npm run prisma:generate   # gera o Prisma Client
npm run prisma:migrate    # cria/aplica migrations em desenvolvimento
npm run prisma:deploy     # aplica migrations em produção
npm run seed              # popula o banco com dados fictícios
npm run prisma:studio     # abre o Prisma Studio
```

## Testes

```bash
npm test          # roda toda a suíte (unit + integração)
npm run test:watch
```

Os testes de integração precisam de um PostgreSQL acessível (use `docker compose up -d db`). Sem banco, as suites de integração são puladas automaticamente e apenas os testes unitários rodam. Cobrem autenticação, autorização (RBAC), isolamento multi-tenant, estoque/reserva, vendas com transação, clientes e leads.

## Swagger

Documentação interativa em:

```
http://localhost:3333/api/docs
```

O JSON OpenAPI está em `/api/docs.json`. Use o botão **Authorize** para informar o Bearer token obtido no login.

## Variáveis de ambiente

Veja `.env.example`. Principais:

| Variável | Descrição |
|---|---|
| `NODE_ENV` | `development` \| `test` \| `production` |
| `PORT` | Porta HTTP (padrão 3333) |
| `DATABASE_URL` | String de conexão do PostgreSQL |
| `JWT_SECRET` | Segredo do access token |
| `JWT_REFRESH_SECRET` | Segredo do refresh token |
| `JWT_ACCESS_EXPIRES_IN` | Expiração do access token (ex.: `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Expiração do refresh token (ex.: `7d`) |
| `CORS_ORIGIN` | Origem(ns) permitida(s) |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | Rate limiting |
| `LOG_LEVEL` | Nível de log do pino |

O `.env` nunca é versionado. Segredos ficam fora do código.

## API Endpoints (principais)

Todos sob o prefixo `/api/v1`.

```
Auth        POST /auth/register | /auth/login | /auth/refresh | /auth/logout   GET /auth/me
Dealerships GET|POST /dealerships   GET|PATCH|DELETE /dealerships/:id           (SUPER_ADMIN)
Users       GET|POST /users         GET|PATCH|DELETE /users/:id                 (ADMIN)
Vehicles    GET|POST /vehicles      GET|PUT|PATCH|DELETE /vehicles/:id
            PATCH /vehicles/:id/status   POST /vehicles/:id/reserve | /release
            GET|POST /vehicles/:id/images   DELETE /vehicles/:id/images/:imageId
Customers   GET|POST /customers     GET|PUT|PATCH|DELETE /customers/:id
Leads       GET|POST /leads         GET|PUT /leads/:id   PATCH /leads/:id/status
Proposals   GET|POST /proposals     GET|PUT|PATCH|DELETE /proposals/:id
Sales       GET|POST /sales         GET /sales/:id   PATCH /sales/:id/status
            GET|POST /sales/:id/payments   POST /sales/:id/trade-in
Dashboard   GET /dashboard
Reports     GET /reports/sales | /reports/vehicles | /reports/leads | /reports/sellers
Audit       GET /audit-logs         (ADMIN, somente leitura)
Health      GET /health
```

### Credenciais do seed

Senha padrão de todos: `senha1234`.

- Plataforma: `superadmin@dealerhub.com`
- Alpha Motors: `admin@alpha.com`, `manager@alpha.com`, `seller1@alpha.com`, `seller2@alpha.com`
- Beta Veículos: `admin@beta.com`, ...
- Prime Auto: `admin@prime.com`, ...

## Formato de resposta

Sucesso:

```json
{ "success": true, "data": { } }
```

Erro (consistente em toda a API):

```json
{ "success": false, "error": { "code": "VEHICLE_NOT_FOUND", "message": "Veículo não encontrado." } }
```

## Melhorias futuras

- Armazenamento de imagens/documentos em **AWS S3** + CloudFront
- **Redis** para cache e rate limiting distribuído
- Filas para processamento assíncrono
- Notificações e envio de e-mail
- Integração com **WhatsApp** e gateways de pagamento
- Analytics avançado
- **IA**: recomendação de veículos, análise de leads, previsão de vendas, busca inteligente, geração de descrições
- Painel administrativo em **React + TypeScript** consumindo esta API

## Licença

MIT. Veja [LICENSE](./LICENSE).
