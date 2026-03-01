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
import { ProductResolver } from './product.resolver';
import { ProductService } from './product.service';
import { ProductDataLoader } from './product.dataloader';
import { Product } from './product.entity';
import { JwtStrategy } from './auth/jwt.strategy';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: {
        federation: 2,
      },
      buildSchemaOptions: {
        orphanedTypes: [Product],
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
    ProductResolver,
    ProductService,
    ProductDataLoader,
    JwtStrategy,
  ],
})
export class AppModule {}
