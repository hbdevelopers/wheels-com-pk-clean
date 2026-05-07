// backend/src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  // ── Security ──────────────────────────────────────────────
  app.use(helmet());
  app.use(compression());

  app.enableCors({
    origin: [
      process.env.ADMIN_URL || 'http://localhost:3002',
      process.env.WEB_URL || 'http://localhost:3000',
    ],
    credentials: true,
  });

  // ── Global Pipes ──────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── WebSocket ─────────────────────────────────────────────
  app.useWebSocketAdapter(new IoAdapter(app));

  // ── API Prefix ────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── Swagger Docs ──────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('wheels.com.pk API')
      .setDescription('Pakistan Automotive Marketplace API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    logger.log('Swagger docs: http://localhost:3001/api/docs');
  }

  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`🚗 wheels.com.pk API running on port ${port}`);
}

bootstrap();
