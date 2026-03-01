/**
 * Order Subgraph
 * Part of the federated GraphQL API
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'graphql';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.PORT || 3303;
  await app.listen(port);
  Logger.log(
    `🚀 Order Subgraph running on: http://localhost:${port}/${globalPrefix}`
  );
}

bootstrap();
