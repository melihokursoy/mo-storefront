import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from '@nestjs/apollo';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CartResolver } from './cart.resolver';
import { CartService } from './cart.service';
import { Cart } from './cart.entity';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: {
        federation: 2,
      },
      buildSchemaOptions: {
        orphanedTypes: [Cart],
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService, CartResolver, CartService],
})
export class AppModule {}
