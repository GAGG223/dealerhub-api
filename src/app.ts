import express, { type Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { logger } from './shared/utils/logger';
import { globalRateLimiter } from './shared/middlewares';
import { errorHandler, notFoundHandler } from './shared/middlewares/error-handler';
import { openApiDocument } from './config/openapi';
import apiRoutes from './routes';

/**
 * Monta a aplicação Express com toda a stack de segurança e observabilidade:
 * helmet, cors, rate limiting, logging estruturado, rotas versionadas e
 * tratamento global de erros. server.ts apenas dá o listen nesta app.
 */
export function createApp(): Application {
  const app = express();

  app.set('trust proxy', 1);

  // Segurança
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
    }),
  );

  // Parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Logging estruturado de requisições (item 38)
  app.use(
    pinoHttp({
      logger,
      // Não logamos corpos; o logger já faz redaction de headers sensíveis.
      autoLogging: true,
    }),
  );

  // Rate limiting global
  app.use(globalRateLimiter);

  // Documentação Swagger/OpenAPI (item 33)
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
  app.get('/api/docs.json', (_req, res) => res.json(openApiDocument));

  // Rotas versionadas
  app.use('/api/v1', apiRoutes);

  // 404 e error handler (sempre por último)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
