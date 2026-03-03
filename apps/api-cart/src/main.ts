/**
 * Cart Subgraph
 * Part of the federated GraphQL API
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3302;
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
    Logger.log(`🚀 Cart Subgraph running on: http://localhost:${port}/graphql`);
  } else {
    throw new Error('Cart Subgraph failed to initialize');
  }
}

bootstrap();
