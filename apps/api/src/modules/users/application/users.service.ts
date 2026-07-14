import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type { Role } from '@4ef/shared';
import {
  paginate,
  type PaginatedResult,
} from '../../../common/dto/paginated-result';
import { USER_REPOSITORY } from '../domain/user.repository';
import type {
  CreateUserInput,
  UserRepository,
} from '../domain/user.repository';
import type { QueryUsersDto } from './dto/query-users.dto';
import type { UpdateUserRolesDto } from './dto/update-user-roles.dto';

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

  async listForAdmin(query: QueryUsersDto): Promise<PaginatedResult<unknown>> {
    const { items, total } = await this.userRepository.findMany({
      page: query.page,
      limit: query.limit,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return paginate(
      items.map((item) => item.toAdminSummary()),
      total,
      query.page,
      query.limit,
    );
  }

  async updateRoles(
    targetUserId: string,
    dto: UpdateUserRolesDto,
    actingUser: { id: string; roles: Role[] },
  ) {
    if (targetUserId === actingUser.id) {
      throw new ForbiddenException(
        'You cannot change your own roles or account status',
      );
    }

    const target = await this.userRepository.findById(targetUserId);

    if (!target) {
      throw new NotFoundException('User not found');
    }

    const actingIsSuperAdmin = actingUser.roles.includes('SUPER_ADMIN');
    const changesSuperAdminMembership =
      dto.roles !== undefined &&
      dto.roles.includes('SUPER_ADMIN') !==
        target.roles.includes('SUPER_ADMIN');

    if (changesSuperAdminMembership && !actingIsSuperAdmin) {
      throw new ForbiddenException(
        'Only a super admin can grant or revoke the super admin role',
      );
    }

    const updated = await this.userRepository.update(targetUserId, dto);
    return updated.toAdminSummary();
  }
}
