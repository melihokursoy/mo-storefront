import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from '@nestjs/apollo';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrderResolver } from './order.resolver';
import { OrderService } from './order.service';
import { OrderDataLoader } from './order.dataloader';
import { Order } from './order.entity';
import { JwtStrategy } from './auth/jwt.strategy';

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
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'test-secret-key-change-in-production',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    OrderResolver,
    OrderService,
    OrderDataLoader,
    JwtStrategy,
  ],
})
export class AppModule {}
