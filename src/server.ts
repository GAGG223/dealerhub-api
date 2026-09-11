import { createApp } from './app';
import { env } from './config/env';
import { logger } from './shared/utils/logger';
import { prisma } from './shared/database/prisma';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 DealerHub API rodando em http://localhost:${env.PORT} (${env.NODE_ENV})`);
  logger.info(`📚 Documentação disponível em http://localhost:${env.PORT}/api/docs`);
});

/** Encerramento gracioso: fecha o servidor HTTP e desconecta o Prisma. */
async function shutdown(signal: string): Promise<void> {
  logger.info(`Recebido ${signal}, encerrando...`);
  server.close(() => logger.info('Servidor HTTP encerrado.'));
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
