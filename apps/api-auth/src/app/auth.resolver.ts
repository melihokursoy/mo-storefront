import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import { AuthPayload, LogoutPayload } from './auth.entity';
import { AuthService } from './auth.service';

interface ContextWithRes {
  res?: any;
}

@Resolver()
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Mutation(() => AuthPayload)
  async register(
    @Args('email') email: string,
    @Args('password') password: string,
    @Args('name') name: string,
    @Context() context: ContextWithRes
  ): Promise<AuthPayload> {
    const result = await this.authService.register(email, password, name);

    // Set refresh token in HTTP-only cookie
    if (context.res) {
      context.res.setHeader(
        'Set-Cookie',
        `refreshToken=${
          result.refreshToken
        }; HttpOnly; Path=/; SameSite=Strict; Max-Age=${
          result.expiresIn * 24 * 7
        }`
      );
    }

    return {
      accessToken: result.accessToken,
      userId: result.userId,
      email: result.email,
    };
  }

  @Mutation(() => AuthPayload)
  async login(
    @Args('email') email: string,
    @Args('password') password: string,
    @Context() context: ContextWithRes
  ): Promise<AuthPayload> {
    const result = await this.authService.login(email, password);

    // Set refresh token in HTTP-only cookie
    if (context.res) {
      context.res.setHeader(
        'Set-Cookie',
        `refreshToken=${
          result.refreshToken
        }; HttpOnly; Path=/; SameSite=Strict; Max-Age=${
          result.expiresIn * 24 * 7
        }`
      );
    }

    return {
      accessToken: result.accessToken,
      userId: result.userId,
      email: result.email,
    };
  }

  @Mutation(() => AuthPayload)
  async refreshToken(
    @Args('refreshToken', { nullable: true }) refreshTokenArg?: string,
    @Context() context: any = {}
  ): Promise<AuthPayload> {
    // Get refresh token from cookie or argument
    let refreshToken = refreshTokenArg;
    if (!refreshToken && context.req?.headers?.cookie) {
      const cookieMatch =
        context.req.headers.cookie.match(/refreshToken=([^;]+)/);
      if (cookieMatch) {
        refreshToken = cookieMatch[1];
      }
    }

    if (!refreshToken) {
      throw new Error('Refresh token not found');
    }

    const result = await this.authService.refresh(refreshToken);

    // Set new refresh token in HTTP-only cookie
    if (context.res) {
      context.res.setHeader(
        'Set-Cookie',
        `refreshToken=${
          result.refreshToken
        }; HttpOnly; Path=/; SameSite=Strict; Max-Age=${
          result.expiresIn * 24 * 7
        }`
      );
    }

    return {
      accessToken: result.accessToken,
      userId: result.userId,
      email: result.email,
    };
  }

  @Mutation(() => LogoutPayload)
  async logout(
    @Args('refreshToken', { nullable: true }) refreshTokenArg?: string,
    @Context() context: any = {}
  ): Promise<LogoutPayload> {
    // Get refresh token from cookie or argument
    let refreshToken = refreshTokenArg;
    if (!refreshToken && context.req?.headers?.cookie) {
      const cookieMatch =
        context.req.headers.cookie.match(/refreshToken=([^;]+)/);
      if (cookieMatch) {
        refreshToken = cookieMatch[1];
      }
    }

    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    // Note: We intentionally do NOT clear the cookie here.
    // The cookie will remain so that the revokedAt status can be checked
    // on subsequent refresh attempts. Clients should clear cookies themselves.

    return { success: true };
  }
}
