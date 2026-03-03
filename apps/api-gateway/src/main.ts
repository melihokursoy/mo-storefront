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

  const port = process.env.PORT || 3300;
  await app.listen(port);

  // Verify GraphQL endpoint is ready before signaling readiness
  const maxRetries = 30;
  const retryDelayMs = 100;
  let isReady = false;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`http://localhost:${port}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ __typename }' }),
      });
      const data = (await res.json()) as { data?: { __typename?: string } };
      if (data.data?.__typename === 'Query') {
        isReady = true;
        break;
      }
    } catch (error) {
      // Retry
    }
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  }

  if (isReady) {
    Logger.log(
      `🚀 Apollo Gateway running on: http://localhost:${port}/graphql`
    );
  } else {
    throw new Error('Apollo Gateway failed to initialize');
  }
}

bootstrap();
