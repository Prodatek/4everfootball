import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { UserEntity } from '../domain/user.entity';
import type {
  CreateUserInput,
  UpdateUserInput,
  UserListFilters,
  UserListResult,
  UserRepository,
} from '../domain/user.repository';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UserEntity | null> {
    const record = await this.prisma.user.findUnique({ where: { email } });
    return record ? new UserEntity(record) : null;
  }

  async findById(id: string): Promise<UserEntity | null> {
    const record = await this.prisma.user.findUnique({ where: { id } });
    return record ? new UserEntity(record) : null;
  }

  async findMany(filters: UserListFilters): Promise<UserListResult> {
    const where: Prisma.UserWhereInput = {
      ...(filters.search
        ? {
            OR: [
              {
                displayName: { contains: filters.search, mode: 'insensitive' },
              },
              { email: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { [filters.sortBy]: filters.sortOrder },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items: items.map((item) => new UserEntity(item)), total };
  }

  async create(input: CreateUserInput): Promise<UserEntity> {
    const record = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        displayName: input.displayName,
        roles: input.roles ?? ['USER'],
      },
    });
    return new UserEntity(record);
  }

  async update(id: string, input: UpdateUserInput): Promise<UserEntity> {
    try {
      const record = await this.prisma.user.update({
        where: { id },
        data: input,
      });
      return new UserEntity(record);
    } catch {
      throw new NotFoundException('User not found');
    }
  }
}
