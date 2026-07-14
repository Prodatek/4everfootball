import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { USER_REPOSITORY } from '../domain/user.repository';
import type {
  CreateUserInput,
  UserRepository,
} from '../domain/user.repository';

const PASSWORD_HASH_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
  ) {}

  async findByEmail(email: string) {
    return this.userRepository.findByEmail(email);
  }

  async findById(id: string) {
    return this.userRepository.findById(id);
  }

  async register(
    input: Omit<CreateUserInput, 'passwordHash'> & { password: string },
  ) {
    const existing = await this.userRepository.findByEmail(input.email);

    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(
      input.password,
      PASSWORD_HASH_ROUNDS,
    );

    return this.userRepository.create({
      email: input.email,
      displayName: input.displayName,
      passwordHash,
      roles: input.roles,
    });
  }

  async getPublicProfile(id: string) {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.toPublic();
  }
}
