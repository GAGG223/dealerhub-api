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
import { swaggerCustomCss, swaggerCustomJs } from './config/swagger-theme';
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
  // A CSP padrão do helmet bloqueia o tema customizado do Swagger (fonte do
  // Google Fonts e script inline do header). Desabilitamos a CSP apenas na
  // rota de documentação; o restante da API mantém o helmet completo.
  app.use('/api/docs', helmet({ contentSecurityPolicy: false }));
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

  // Documentação Swagger/OpenAPI (item 33) — tema claro customizado DealerHub.
  // customJsStr é suportado em runtime pelo swagger-ui-express 5, mas ainda não
  // consta nos @types 4.x; por isso o cast controlado das opções.
  // O favicon é um SVG inline totalmente URL-encoded (sem aspas duplas ou < >
  // crus) para não quebrar o atributo href="" da tag <link> gerada pela lib.
  const faviconSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
    '<rect width="32" height="32" rx="8" fill="#0ea472"/>' +
    '<text x="16" y="22" font-size="18" font-family="sans-serif" font-weight="800" text-anchor="middle" fill="#ffffff">D</text>' +
    '</svg>';
  const faviconDataUri = 'data:image/svg+xml,' + encodeURIComponent(faviconSvg);

  const swaggerOpts = {
    customCss: swaggerCustomCss,
    customJsStr: swaggerCustomJs,
    customSiteTitle: 'DealerHub API · Documentação',
    customfavIcon: faviconDataUri,
    swaggerOptions: {
      docExpansion: 'none',
      defaultModelsExpandDepth: -1,
      persistAuthorization: true,
      tryItOutEnabled: true,
    },
  } as swaggerUi.SwaggerUiOptions;

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument, swaggerOpts));
  app.get('/api/docs.json', (_req, res) => res.json(openApiDocument));

  // Rotas versionadas
  app.use('/api/v1', apiRoutes);

  // 404 e error handler (sempre por último)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
