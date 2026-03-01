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
  Logger.log(`🚀 Cart Subgraph running on: http://localhost:${port}/graphql`);
}

bootstrap();
