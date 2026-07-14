import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { TEAM_REPOSITORY } from '../domain/team.repository';
import type { TeamRepository } from '../domain/team.repository';

describe('TeamsService', () => {
  let service: TeamsService;
  let repository: jest.Mocked<TeamRepository>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        TeamsService,
        {
          provide: TEAM_REPOSITORY,
          useValue: {
            findMany: jest.fn(),
            findById: jest.fn(),
            findBySlug: jest.fn(),
            slugExists: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(TeamsService);
    repository = moduleRef.get(TEAM_REPOSITORY);
  });

  it('appends a numeric suffix when the slug already exists', async () => {
    repository.slugExists
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    repository.create.mockResolvedValue({
      toPublic: () => ({ id: '1', slug: 'real-madrid-2' }),
    } as never);

    await service.create({ name: 'Real Madrid' } as never);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'real-madrid-2' }),
    );
  });

  it('uses the base slug when it is available', async () => {
    repository.slugExists.mockResolvedValue(false);
    repository.create.mockResolvedValue({
      toPublic: () => ({ id: '1', slug: 'real-madrid' }),
    } as never);

    await service.create({ name: 'Real Madrid' } as never);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'real-madrid' }),
    );
  });

  it('throws NotFoundException when updating a team that does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.update('missing-id', {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when removing a team that does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.remove('missing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
