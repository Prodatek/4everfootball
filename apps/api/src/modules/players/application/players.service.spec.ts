import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PlayersService } from './players.service';
import { PLAYER_REPOSITORY } from '../domain/player.repository';
import type { PlayerRepository } from '../domain/player.repository';
import { TeamsService } from '../../teams/application/teams.service';

describe('PlayersService', () => {
  let service: PlayersService;
  let repository: jest.Mocked<PlayerRepository>;
  let teamsService: jest.Mocked<TeamsService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PlayersService,
        {
          provide: PLAYER_REPOSITORY,
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
        {
          provide: TeamsService,
          useValue: { exists: jest.fn() },
        },
      ],
    }).compile();

    service = moduleRef.get(PlayersService);
    repository = moduleRef.get(PLAYER_REPOSITORY);
    teamsService = moduleRef.get(TeamsService);
  });

  it('generates a slug from first and last name', async () => {
    repository.slugExists.mockResolvedValue(false);
    repository.create.mockResolvedValue({
      toPublic: () => ({ id: '1', slug: 'kylian-mbappe' }),
    } as never);

    await service.create({ firstName: 'Kylian', lastName: 'Mbappe' } as never);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'kylian-mbappe' }),
    );
    expect(teamsService.exists).not.toHaveBeenCalled();
  });

  it('rejects creation when the given team does not exist', async () => {
    teamsService.exists.mockResolvedValue(false);

    await expect(
      service.create({
        firstName: 'Kylian',
        lastName: 'Mbappe',
        teamId: 'missing-team',
      } as never),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("allows unassigning a player's team by passing teamId: null", async () => {
    repository.findById.mockResolvedValue({ id: '1' } as never);
    repository.update.mockResolvedValue({
      toPublic: () => ({ id: '1', teamId: null }),
    } as never);

    await service.update('1', { teamId: null } as never);

    expect(teamsService.exists).not.toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({ teamId: null }),
    );
  });

  it('throws NotFoundException when removing a player that does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.remove('missing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
