import type { Role } from '@4ef/shared';
import type { UserEntity } from './user.entity';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  displayName: string;
  roles?: Role[];
}

export interface UpdateUserInput {
  roles?: Role[];
  isActive?: boolean;
}

export type UserSortField = 'displayName' | 'email' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

export interface UserListFilters {
  page: number;
  limit: number;
  search?: string;
  sortBy: UserSortField;
  sortOrder: SortOrder;
}

export interface UserListResult {
  items: UserEntity[];
  total: number;
}

export interface UserRepository {
  findByEmail(email: string): Promise<UserEntity | null>;
  findById(id: string): Promise<UserEntity | null>;
  findMany(filters: UserListFilters): Promise<UserListResult>;
  create(input: CreateUserInput): Promise<UserEntity>;
  update(id: string, input: UpdateUserInput): Promise<UserEntity>;
}
