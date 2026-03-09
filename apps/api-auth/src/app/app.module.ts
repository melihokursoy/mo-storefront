import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from '@nestjs/apollo';
import { JwtModule } from '@nestjs/jwt';
import {
  createComplexityPlugin,
  SUBGRAPH_COMPLEXITY_CONFIG,
} from '@org/graphql-complexity';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';
import { AuthPayload, LogoutPayload } from './auth.entity';
import { PrismaService } from './prisma.service';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: {
        federation: 2,
      },
      buildSchemaOptions: {
        orphanedTypes: [AuthPayload, LogoutPayload],
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
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'test-secret-key-change-in-production',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService, AuthResolver, AuthService],
})
export class AppModule {}
