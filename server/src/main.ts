import 'dotenv/config';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { getQueueToken } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';

import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';

import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';
import { setupSwagger } from './common/swagger/swagger.config.js';
import { setupBullBoard } from './queue/bull-board.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Proxy
  app.set('trust proxy', 1);

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Security headers
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );

  // HTTP Parameter Pollution protection
  app.use(hpp());

  // Cookies
  app.use(cookieParser());

  // Logging
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Socket-Id'],
  });

  // DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global success response
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Global error response
  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger documentation
  if (process.env.NODE_ENV !== 'production') {
    setupSwagger(app);
  }

  // Bull Board Dashboard — শুধু non-production এ, queue job দেখতে
  if (process.env.NODE_ENV !== 'production') {
    const emailQueue = app.get<Queue>(getQueueToken('email-queue'));
    const serverAdapter = setupBullBoard(emailQueue);
    app.use('/admin/queues', serverAdapter.getRouter());
  }

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = Number(process.env.PORT) || 3000;

  await app.listen(port);

  const mode =
    process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'DEVELOPMENT';

  console.log(`🚀 Server running on port ${port} (${mode})`);
  console.log(`🔗 API base: http://localhost:${port}/api/v1`);
  console.log(`📄 API docs: http://localhost:${port}/api/docs`);

  if (process.env.NODE_ENV !== 'production') {
    console.log(`📊 Queue dashboard: http://localhost:${port}/admin/queues`);
  }
}

await bootstrap();
