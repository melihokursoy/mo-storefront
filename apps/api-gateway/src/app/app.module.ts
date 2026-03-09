import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloGatewayDriver, ApolloGatewayDriverConfig } from '@nestjs/apollo';
import {
  createComplexityPlugin,
  GATEWAY_COMPLEXITY_CONFIG,
} from '@org/graphql-complexity';
import { AppController } from './app.controller';
import { AppService } from './app.service';

const {
  IntrospectAndCompose,
  RemoteGraphQLDataSource,
} = require('@apollo/gateway');

class AuthenticatedDataSource extends RemoteGraphQLDataSource {
  constructor(config: any) {
    super(config);
  }

  async willSendRequest({ request, context }: any) {
    // Forward Authorization header to subgraphs
    if (context.req?.headers?.authorization) {
      request.http.headers.set(
        'authorization',
        context.req.headers.authorization
      );
    }

    // Forward cookies to subgraphs (for refresh tokens)
    if (context.req?.headers?.cookie) {
      request.http.headers.set('cookie', context.req.headers.cookie);
    }
  }
}

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloGatewayDriverConfig>({
      driver: ApolloGatewayDriver,
      gateway: {
        supergraphSdl: new IntrospectAndCompose({
          subgraphs: [
            { name: 'product', url: 'http://localhost:3301/graphql' },
            { name: 'cart', url: 'http://localhost:3302/graphql' },
            { name: 'order', url: 'http://localhost:3303/graphql' },
            { name: 'auth', url: 'http://localhost:3304/graphql' },
            { name: 'user', url: 'http://localhost:3305/graphql' },
          ],
          pollIntervalInMs: 10000,
          subgraphHealthCheck: true,
        }),
        buildService: (definition: any) =>
          new AuthenticatedDataSource({ url: definition.url }) as any,
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
