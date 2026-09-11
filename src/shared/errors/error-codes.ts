/**
 * Catálogo central de códigos de erro da API.
 * Cada código mapeia para um status HTTP e uma mensagem padrão.
 * Mantê-los centralizados garante respostas de erro consistentes (item 27).
 */
export const ERROR_CODES = {
  // Genéricos
  VALIDATION_ERROR: { status: 422, message: 'Erro de validação dos dados enviados.' },
  UNAUTHORIZED: { status: 401, message: 'Não autenticado.' },
  FORBIDDEN: { status: 403, message: 'Acesso negado.' },
  NOT_FOUND: { status: 404, message: 'Recurso não encontrado.' },
  INTERNAL_ERROR: { status: 500, message: 'Erro interno do servidor.' },
  RATE_LIMITED: { status: 429, message: 'Muitas requisições. Tente novamente mais tarde.' },

  // Autenticação
  INVALID_CREDENTIALS: { status: 401, message: 'Credenciais inválidas.' },
  INVALID_TOKEN: { status: 401, message: 'Token inválido.' },
  TOKEN_EXPIRED: { status: 401, message: 'Token expirado.' },
  DUPLICATE_EMAIL: { status: 409, message: 'E-mail já cadastrado.' },

  // Concessionárias
  DEALERSHIP_NOT_FOUND: { status: 404, message: 'Concessionária não encontrada.' },
  DEALERSHIP_INACTIVE: { status: 403, message: 'Concessionária inativa.' },

  // Usuários
  USER_NOT_FOUND: { status: 404, message: 'Usuário não encontrado.' },

  // Veículos
  VEHICLE_NOT_FOUND: { status: 404, message: 'Veículo não encontrado.' },
  VEHICLE_ALREADY_SOLD: { status: 409, message: 'Veículo já foi vendido.' },
  VEHICLE_ALREADY_RESERVED: { status: 409, message: 'Veículo já está reservado.' },
  INVALID_STATUS_TRANSITION: { status: 409, message: 'Transição de status inválida.' },

  // Clientes
  CUSTOMER_NOT_FOUND: { status: 404, message: 'Cliente não encontrado.' },

  // Leads
  LEAD_NOT_FOUND: { status: 404, message: 'Lead não encontrado.' },

  // Propostas
  PROPOSAL_NOT_FOUND: { status: 404, message: 'Proposta não encontrada.' },

  // Vendas
  SALE_NOT_FOUND: { status: 404, message: 'Venda não encontrada.' },
  SALE_ALREADY_COMPLETED: { status: 409, message: 'Venda já foi concluída.' },
  SALE_ALREADY_CANCELLED: { status: 409, message: 'Venda já foi cancelada.' },

  // Pagamentos
  PAYMENT_NOT_FOUND: { status: 404, message: 'Pagamento não encontrado.' },
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;
