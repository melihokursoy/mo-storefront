/**
 * Apollo Federation Gateway
 * Coordinates requests across Product, Cart, and Order subgraphs
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

// Wait for all subgraphs to be healthy before initializing gateway
async function waitForSubgraphs() {
  const subgraphs = [
    { name: 'product', url: 'http://localhost:3301/graphql' },
    { name: 'cart', url: 'http://localhost:3302/graphql' },
    { name: 'order', url: 'http://localhost:3303/graphql' },
    { name: 'auth', url: 'http://localhost:3304/graphql' },
    { name: 'user', url: 'http://localhost:3305/graphql' },
  ];

  const maxRetries = 60;
  const retryDelayMs = 500;

  for (const subgraph of subgraphs) {
    let isHealthy = false;
    for (let i = 0; i < maxRetries; i++) {
      try {
        const res = await fetch(subgraph.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: '{ __typename }' }),
        });
        const data = (await res.json()) as { data?: { __typename?: string } };
        if (data.data?.__typename === 'Query') {
          isHealthy = true;
          Logger.log(`✓ ${subgraph.name} subgraph is healthy`);
          break;
        }
      } catch (error) {
        // Retry
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }

    if (!isHealthy) {
      throw new Error(`${subgraph.name} subgraph failed to become healthy`);
    }
  }
}

async function bootstrap() {
  // Wait for all subgraphs to be ready before starting gateway
  await waitForSubgraphs();

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
