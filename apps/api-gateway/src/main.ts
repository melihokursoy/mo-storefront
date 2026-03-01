/**
 * Apollo Federation Gateway
 * Coordinates requests across Product, Cart, and Order subgraphs
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for storefront
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3100'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const globalPrefix = 'graphql';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.PORT || 3300;
  await app.listen(port);
  Logger.log(
    `🚀 Apollo Gateway running on: http://localhost:${port}/${globalPrefix}`
  );
}

bootstrap();
