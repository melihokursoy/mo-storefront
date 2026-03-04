import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthPayload } from './auth.entity';
import { PrismaService } from './prisma.service';

interface JwtPayload {
  sub: string;
  userId: string;
  email: string;
  role?: string;
}

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  async register(
    email: string,
    password: string,
    name: string
  ): Promise<AuthPayload & { refreshToken: string; expiresIn: number }> {
    // Check if credential already exists
    const existing = await this.prisma.credential.findUnique({
      where: { email },
    });
    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create credential
    const credential = await this.prisma.credential.create({
      data: { email, passwordHash },
    });

    // Create user via HTTP call to api-user
    let userId: string;
    try {
      const userResponse = await fetch('http://localhost:3305/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            mutation CreateUser($name: String!, $email: String!) {
              createUser(name: $name, email: $email) {
                id
              }
            }
          `,
          variables: { name, email },
        }),
      });
      const userResult = (await userResponse.json()) as {
        data?: { createUser?: { id: string } };
        errors?: Array<{ message: string }>;
      };

      if (userResult.errors || !userResult.data?.createUser?.id) {
        // Rollback: delete credential if user creation failed
        await this.prisma.credential.delete({ where: { id: credential.id } });
        throw new BadRequestException('Failed to create user profile');
      }

      userId = userResult.data.createUser.id;
    } catch (error) {
      // Rollback: delete credential if user creation failed
      await this.prisma.credential.delete({ where: { id: credential.id } });
      throw error;
    }

    // Generate tokens
    const accessToken = this.jwtService.sign({
      sub: userId,
      userId,
      email,
    } as JwtPayload);

    const refreshTokenData = {
      token: this.generateRefreshToken(),
      credentialId: credential.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };

    await this.prisma.refreshToken.create({ data: refreshTokenData });

    return {
      accessToken,
      userId,
      email,
      refreshToken: refreshTokenData.token,
      expiresIn: 3600, // 1 hour
    };
  }

  async login(
    email: string,
    password: string
  ): Promise<AuthPayload & { refreshToken: string; expiresIn: number }> {
    // Find credential
    const credential = await this.prisma.credential.findUnique({
      where: { email },
    });
    if (!credential) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, credential.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Fetch user to get userId (from user subgraph)
    let userId: string;
    try {
      const userResponse = await fetch('http://localhost:3305/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query GetUserByEmail($email: String!) {
              users(email: $email) {
                id
              }
            }
          `,
          variables: { email },
        }),
      });
      const userResult = (await userResponse.json()) as {
        data?: { users?: Array<{ id: string }> };
      };

      if (!userResult.data?.users?.[0]?.id) {
        throw new UnauthorizedException('User profile not found');
      }

      userId = userResult.data.users[0].id;
    } catch (error) {
      throw new UnauthorizedException('Failed to fetch user profile');
    }

    // Generate tokens
    const accessToken = this.jwtService.sign({
      sub: userId,
      userId,
      email,
    } as JwtPayload);

    const refreshTokenData = {
      token: this.generateRefreshToken(),
      credentialId: credential.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };

    await this.prisma.refreshToken.create({ data: refreshTokenData });

    return {
      accessToken,
      userId,
      email,
      refreshToken: refreshTokenData.token,
      expiresIn: 3600,
    };
  }

  async refresh(
    refreshToken: string
  ): Promise<AuthPayload & { refreshToken: string; expiresIn: number }> {
    // Find and validate refresh token
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { credential: true },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (tokenRecord.revokedAt) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    const credential = tokenRecord.credential;

    // Fetch user to get userId
    let userId: string;
    try {
      const userResponse = await fetch('http://localhost:3305/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query GetUserByEmail($email: String!) {
              users(email: $email) {
                id
              }
            }
          `,
          variables: { email: credential.email },
        }),
      });
      const userResult = (await userResponse.json()) as {
        data?: { users?: Array<{ id: string }> };
      };

      if (!userResult.data?.users?.[0]?.id) {
        throw new UnauthorizedException('User profile not found');
      }

      userId = userResult.data.users[0].id;
    } catch (error) {
      throw new UnauthorizedException('Failed to fetch user profile');
    }

    // Revoke old token
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() },
    });

    // Generate new tokens
    const accessToken = this.jwtService.sign({
      sub: userId,
      userId,
      email: credential.email,
    } as JwtPayload);

    const newRefreshTokenData = {
      token: this.generateRefreshToken(),
      credentialId: credential.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    await this.prisma.refreshToken.create({ data: newRefreshTokenData });

    return {
      accessToken,
      userId,
      email: credential.email,
      refreshToken: newRefreshTokenData.token,
      expiresIn: 3600,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (tokenRecord) {
      await this.prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { revokedAt: new Date() },
      });
    }
  }

  private generateRefreshToken(): string {
    return require('crypto').randomBytes(32).toString('hex');
  }
}
