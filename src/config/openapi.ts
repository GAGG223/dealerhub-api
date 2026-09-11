import { env } from './env';

/**
 * Documento OpenAPI 3.0 do DealerHub (item 33).
 * Mantido curado à mão para clareza. Cobre autenticação Bearer, principais
 * endpoints, formatos de request/response e o envelope de erro padrão.
 */

const bearerAuth = [{ bearerAuth: [] }];

const errorResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'VEHICLE_NOT_FOUND' },
        message: { type: 'string', example: 'Veículo não encontrado.' },
        details: { type: 'array', items: { type: 'object' } },
      },
    },
  },
};

const pagination = {
  type: 'object',
  properties: {
    page: { type: 'integer', example: 1 },
    limit: { type: 'integer', example: 20 },
    total: { type: 'integer', example: 100 },
    totalPages: { type: 'integer', example: 5 },
  },
};

function crudPaths(
  tag: string,
  path: string,
  name: string,
  opts: { statusRoute?: boolean } = {},
): Record<string, unknown> {
  const paths: Record<string, unknown> = {
    [`/${path}`]: {
      get: {
        tags: [tag],
        summary: `Listar ${name}`,
        security: bearerAuth,
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'Lista paginada' },
          401: { description: 'Não autenticado', content: jsonError() },
        },
      },
      post: {
        tags: [tag],
        summary: `Criar ${name}`,
        security: bearerAuth,
        responses: {
          201: { description: 'Criado' },
          422: { description: 'Erro de validação', content: jsonError() },
        },
      },
    },
    [`/${path}/{id}`]: {
      get: {
        tags: [tag],
        summary: `Buscar ${name} por ID`,
        security: bearerAuth,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'OK' },
          404: { description: 'Não encontrado', content: jsonError() },
        },
      },
      patch: {
        tags: [tag],
        summary: `Atualizar ${name}`,
        security: bearerAuth,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Atualizado' } },
      },
      delete: {
        tags: [tag],
        summary: `Remover ${name}`,
        security: bearerAuth,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Removido' } },
      },
    },
  };

  if (opts.statusRoute) {
    paths[`/${path}/{id}/status`] = {
      patch: {
        tags: [tag],
        summary: `Alterar status de ${name}`,
        security: bearerAuth,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Status alterado' } },
      },
    };
  }

  return paths;
}

function jsonError() {
  return { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } };
}

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'DealerHub API',
    version: '1.0.0',
    description:
      'Plataforma SaaS multi-tenant para gestão de concessionárias de veículos. ' +
      'Cada concessionária é um tenant isolado. Autenticação via JWT (Bearer).',
    license: { name: 'MIT' },
  },
  servers: [{ url: `http://localhost:${env.PORT}/api/v1`, description: 'Local' }],
  tags: [
    { name: 'Auth', description: 'Autenticação e sessão' },
    { name: 'Dealerships', description: 'Concessionárias (SUPER_ADMIN)' },
    { name: 'Users', description: 'Usuários da concessionária (ADMIN)' },
    { name: 'Vehicles', description: 'Veículos, estoque, reservas e imagens' },
    { name: 'Customers', description: 'Clientes' },
    { name: 'Leads', description: 'CRM / oportunidades' },
    { name: 'Proposals', description: 'Propostas de negociação' },
    { name: 'Sales', description: 'Vendas, pagamentos e trade-in' },
    { name: 'Dashboard', description: 'Métricas agregadas' },
    { name: 'Reports', description: 'Relatórios gerenciais' },
    { name: 'Audit', description: 'Logs de auditoria (somente leitura)' },
    { name: 'Health', description: 'Status da API' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: errorResponse,
      Pagination: pagination,
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'admin@alpha.com' },
          password: { type: 'string', example: 'senha1234' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              user: { type: 'object' },
              tokens: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string' },
                  refreshToken: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check da API e do banco',
        responses: {
          200: { description: 'API e banco OK' },
          503: { description: 'Banco indisponível' },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Registrar usuário (SELLER) numa concessionária',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password', 'dealershipId'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  dealershipId: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Usuário criado' } },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login (retorna access + refresh token)',
        requestBody: {
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } },
          },
        },
        responses: {
          200: {
            description: 'Autenticado',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } },
            },
          },
          401: { description: 'Credenciais inválidas', content: jsonError() },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Rotacionar tokens a partir do refresh token',
        responses: { 200: { description: 'Novos tokens' } },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout (revoga o refresh token)',
        responses: { 200: { description: 'Logout efetuado' } },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Dados do usuário autenticado',
        security: bearerAuth,
        responses: {
          200: { description: 'OK' },
          401: { description: 'Não autenticado', content: jsonError() },
        },
      },
    },
    ...crudPaths('Dealerships', 'dealerships', 'concessionária'),
    ...crudPaths('Users', 'users', 'usuário'),
    ...crudPaths('Vehicles', 'vehicles', 'veículo', { statusRoute: true }),
    '/vehicles/{id}/reserve': {
      post: {
        tags: ['Vehicles'],
        summary: 'Reservar veículo (AVAILABLE → RESERVED)',
        security: bearerAuth,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Reservado' },
          409: { description: 'Já reservado/vendido', content: jsonError() },
        },
      },
    },
    '/vehicles/{id}/release': {
      post: {
        tags: ['Vehicles'],
        summary: 'Liberar reserva (RESERVED → AVAILABLE)',
        security: bearerAuth,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Liberado' } },
      },
    },
    ...crudPaths('Customers', 'customers', 'cliente'),
    ...crudPaths('Leads', 'leads', 'lead', { statusRoute: true }),
    ...crudPaths('Proposals', 'proposals', 'proposta'),
    '/sales': {
      get: { tags: ['Sales'], summary: 'Listar vendas', security: bearerAuth, responses: { 200: { description: 'OK' } } },
      post: {
        tags: ['Sales'],
        summary: 'Criar venda (transação: valida e move veículo para SOLD)',
        security: bearerAuth,
        responses: {
          201: { description: 'Venda criada' },
          409: { description: 'Veículo já vendido', content: jsonError() },
        },
      },
    },
    '/sales/{id}': {
      get: { tags: ['Sales'], summary: 'Buscar venda', security: bearerAuth, parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
    },
    '/sales/{id}/status': {
      patch: { tags: ['Sales'], summary: 'Alterar status da venda (concluir/cancelar)', security: bearerAuth, parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
    },
    '/sales/{id}/payments': {
      get: { tags: ['Sales'], summary: 'Listar pagamentos da venda', security: bearerAuth, parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
      post: { tags: ['Sales'], summary: 'Registrar pagamento', security: bearerAuth, parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 201: { description: 'Criado' } } },
    },
    '/sales/{id}/trade-in': {
      post: { tags: ['Sales'], summary: 'Registrar veículo de troca', security: bearerAuth, parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 201: { description: 'Criado' } } },
    },
    '/dashboard': {
      get: { tags: ['Dashboard'], summary: 'Métricas da concessionária', security: bearerAuth, responses: { 200: { description: 'OK' } } },
    },
    '/reports/sales': { get: { tags: ['Reports'], summary: 'Relatório de vendas', security: bearerAuth, responses: { 200: { description: 'OK' } } } },
    '/reports/vehicles': { get: { tags: ['Reports'], summary: 'Relatório de estoque', security: bearerAuth, responses: { 200: { description: 'OK' } } } },
    '/reports/leads': { get: { tags: ['Reports'], summary: 'Relatório de leads', security: bearerAuth, responses: { 200: { description: 'OK' } } } },
    '/reports/sellers': { get: { tags: ['Reports'], summary: 'Relatório por vendedor', security: bearerAuth, responses: { 200: { description: 'OK' } } } },
    '/audit-logs': {
      get: { tags: ['Audit'], summary: 'Listar logs de auditoria (ADMIN)', security: bearerAuth, responses: { 200: { description: 'OK' } } },
    },
  },
};
