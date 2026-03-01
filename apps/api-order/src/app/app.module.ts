import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from '@nestjs/apollo';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrderResolver } from './order.resolver';
import { OrderService } from './order.service';
import { Order } from './order.entity';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: {
        federation: 2,
      },
      buildSchemaOptions: {
        orphanedTypes: [Order],
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService, OrderResolver, OrderService],
})
export class AppModule {}
