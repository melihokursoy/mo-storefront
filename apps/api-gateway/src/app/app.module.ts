import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloGatewayDriver, ApolloGatewayDriverConfig } from '@nestjs/apollo';
import {
  createComplexityPlugin,
  GATEWAY_COMPLEXITY_CONFIG,
} from '@org/graphql-complexity';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloGatewayDriverConfig>({
      driver: ApolloGatewayDriver,
      gateway: {
        supergraphSdl: new (require('@apollo/gateway').IntrospectAndCompose)({
          subgraphs: [
            { name: 'product', url: 'http://localhost:3301/graphql' },
            { name: 'cart', url: 'http://localhost:3302/graphql' },
            { name: 'order', url: 'http://localhost:3303/graphql' },
          ],
          pollIntervalInMs: 10000,
          subgraphHealthCheck: true,
        }),
      },
      server: {
        context: ({ req }: { req: any }) => ({
          req,
          // Extract JWT token from Authorization header
          token: req.headers.authorization?.replace('Bearer ', ''),
          userId: (req as any).user?.userId,
        }),
        plugins: [
          createComplexityPlugin({
            config: GATEWAY_COMPLEXITY_CONFIG,
          }),
        ],
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
