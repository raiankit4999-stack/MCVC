import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { buildOpenApi, configureApp } from './bootstrap';
import { loadConfig } from './config';
import { NotificationsService } from './notifications/notifications.service';

async function main() {
  const config = loadConfig();
  const app = await NestFactory.create(AppModule);
  configureApp(app, config);
  SwaggerModule.setup('api/docs', app, buildOpenApi(app));
  app.enableShutdownHooks();
  await app.listen(config.port);

  // In-process outbox delivery for single-node deployments; move to a BullMQ worker when scaling out.
  if (process.env.NOTIFICATIONS_WORKER !== 'off') {
    const notifications = app.get(NotificationsService);
    setInterval(() => notifications.deliverPending().catch(() => undefined), 10_000).unref();
  }
  console.log(`API listening on :${config.port} — docs at /api/docs`);
}

void main();
