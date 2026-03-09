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

    // Create user via HTTP call to api-user first
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
        throw new BadRequestException('Failed to create user profile');
      }

      userId = userResult.data.createUser.id;
    } catch (error) {
      throw error;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create credential with userId
    const credential = await this.prisma.credential.create({
      data: { email, passwordHash, userId },
    });

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

    // Get userId from credential
    const userId = credential.userId;

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

    // Get userId from credential
    const userId = credential.userId;

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
