import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { UserEntity } from '../domain/user.entity';
import type {
  CreateUserInput,
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
}
