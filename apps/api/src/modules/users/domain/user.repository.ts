import type { Role } from '@4ef/shared';
import type { UserEntity } from './user.entity';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  displayName: string;
  roles?: Role[];
}

export interface UserRepository {
  findByEmail(email: string): Promise<UserEntity | null>;
  findById(id: string): Promise<UserEntity | null>;
  create(input: CreateUserInput): Promise<UserEntity>;
}
