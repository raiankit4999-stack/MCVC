import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppConfig } from './config';
import { HttpExceptionFilter } from './common/http-exception.filter';

/** Shared HTTP setup for the server and the e2e tests. */
export function configureApp(app: INestApplication, config: AppConfig) {
  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.use(cookieParser());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({ origin: config.corsOrigins, credentials: true });
  const http = app.getHttpAdapter().getInstance();
  http.set('trust proxy', 1);
  http.disable('x-powered-by');
}

export function buildOpenApi(app: INestApplication) {
  const doc = new DocumentBuilder()
    .setTitle('Computer Community Network API')
    .setDescription('Multi-tenant platform for computer retail & IT service businesses. Store-scoped endpoints require X-Store-Id (validated against membership).')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  return SwaggerModule.createDocument(app, doc);
}
