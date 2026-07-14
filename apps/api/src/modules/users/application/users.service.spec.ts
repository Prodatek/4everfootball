import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { USER_REPOSITORY } from '../domain/user.repository';
import type { UserRepository } from '../domain/user.repository';

function fakeUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'target-user',
    roles: ['USER'],
    toAdminSummary: () => ({
      id: 'target-user',
      roles: ['USER'],
      ...overrides,
    }),
    ...overrides,
  };
}

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<UserRepository>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: USER_REPOSITORY,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
    repository = moduleRef.get(USER_REPOSITORY);
  });

  describe('updateRoles', () => {
    it('rejects a user changing their own roles', async () => {
      await expect(
        service.updateRoles('user-1', { roles: ['ADMIN'] } as never, {
          id: 'user-1',
          roles: ['ADMIN'],
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for a target user that does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.updateRoles('missing-user', { roles: ['SCOUT'] } as never, {
          id: 'admin-1',
          roles: ['ADMIN'],
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a non-super-admin granting the super admin role', async () => {
      repository.findById.mockResolvedValue(
        fakeUser({ roles: ['USER'] }) as never,
      );

      await expect(
        service.updateRoles(
          'target-user',
          { roles: ['SUPER_ADMIN'] } as never,
          { id: 'admin-1', roles: ['ADMIN'] },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('rejects a non-super-admin revoking the super admin role', async () => {
      repository.findById.mockResolvedValue(
        fakeUser({ roles: ['SUPER_ADMIN'] }) as never,
      );

      await expect(
        service.updateRoles('target-user', { roles: ['ADMIN'] } as never, {
          id: 'admin-1',
          roles: ['ADMIN'],
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows a super admin to grant the super admin role', async () => {
      repository.findById.mockResolvedValue(
        fakeUser({ roles: ['USER'] }) as never,
      );
      repository.update.mockResolvedValue(
        fakeUser({ roles: ['SUPER_ADMIN'] }) as never,
      );

      await service.updateRoles(
        'target-user',
        { roles: ['SUPER_ADMIN'] } as never,
        { id: 'super-1', roles: ['SUPER_ADMIN'] },
      );

      expect(repository.update).toHaveBeenCalledWith(
        'target-user',
        expect.objectContaining({ roles: ['SUPER_ADMIN'] }),
      );
    });

    it('allows an admin to grant a non-super-admin role', async () => {
      repository.findById.mockResolvedValue(
        fakeUser({ roles: ['USER'] }) as never,
      );
      repository.update.mockResolvedValue(
        fakeUser({ roles: ['SCOUT'] }) as never,
      );

      await service.updateRoles('target-user', { roles: ['SCOUT'] } as never, {
        id: 'admin-1',
        roles: ['ADMIN'],
      });

      expect(repository.update).toHaveBeenCalledWith(
        'target-user',
        expect.objectContaining({ roles: ['SCOUT'] }),
      );
    });

    it('allows toggling isActive without touching roles', async () => {
      repository.findById.mockResolvedValue(
        fakeUser({ roles: ['USER'] }) as never,
      );
      repository.update.mockResolvedValue(
        fakeUser({ isActive: false }) as never,
      );

      await service.updateRoles('target-user', { isActive: false } as never, {
        id: 'admin-1',
        roles: ['ADMIN'],
      });

      expect(repository.update).toHaveBeenCalledWith(
        'target-user',
        expect.objectContaining({ isActive: false }),
      );
    });
  });
});
