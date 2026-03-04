import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { User } from './user.entity';
import { PrismaService } from './prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) return null;

    return {
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;

    return {
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async create(
    name: string,
    email: string,
    role: string = 'user'
  ): Promise<User> {
    const user = await this.prisma.user.create({
      data: { name, email, role },
    });

    return {
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async update(
    id: string,
    updates: { name?: string; email?: string }
  ): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id },
      data: updates,
    });

    return {
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async updateRole(
    userId: string,
    newRole: string,
    requestingUserId: string,
    requestingUserRole: string
  ): Promise<User> {
    // Only admins can change roles
    if (requestingUserRole !== 'admin') {
      throw new ForbiddenException('Only admins can change user roles');
    }

    // Admins cannot self-demote
    if (userId === requestingUserId && newRole !== 'admin') {
      throw new BadRequestException('Admins cannot self-demote');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    });

    return {
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
