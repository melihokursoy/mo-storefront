import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from '@nestjs/apollo';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import {
  createComplexityPlugin,
  SUBGRAPH_COMPLEXITY_CONFIG,
} from '@org/graphql-complexity';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrderResolver } from './order.resolver';
import { OrderService } from './order.service';
import { OrderDataLoader } from './order.dataloader';
import { Order } from './order.entity';
import { User } from './user.entity';
import { PrismaService } from './prisma.service';
import { JwtStrategy } from './auth/jwt.strategy';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: {
        federation: 2,
      },
      buildSchemaOptions: {
        orphanedTypes: [Order, User],
      },
      context: ({ req, res }: { req: any; res: any }) => {
        // Extract JWT token from Authorization header
        const token = req.headers.authorization?.replace('Bearer ', '');
        return { req, res, token };
      },
      plugins: [
        createComplexityPlugin({
          config: SUBGRAPH_COMPLEXITY_CONFIG,
        }),
      ],
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
    PrismaService,
    OrderResolver,
    OrderService,
    OrderDataLoader,
    JwtStrategy,
  ],
})
export class AppModule {}
