import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AcademyAgeGroupsService } from './academy-age-groups.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PlayersService } from '../../players/application/players.service';
import { GraphicsService } from '../../graphics/application/graphics.service';

function fakePrisma() {
  return {
    academyAgeGroup: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    team: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    player: { findUnique: jest.fn() },
  };
}

describe('AcademyAgeGroupsService', () => {
  let service: AcademyAgeGroupsService;
  let prisma: ReturnType<typeof fakePrisma>;
  let playersService: jest.Mocked<PlayersService>;
  let graphicsService: jest.Mocked<GraphicsService>;

  beforeEach(async () => {
    prisma = fakePrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AcademyAgeGroupsService,
        { provide: PrismaService, useValue: prisma },
        { provide: PlayersService, useValue: { update: jest.fn() } },
        {
          provide: GraphicsService,
          useValue: { enqueue: jest.fn().mockResolvedValue(null) },
        },
      ],
    }).compile();

    service = moduleRef.get(AcademyAgeGroupsService);
    playersService = moduleRef.get(PlayersService);
    graphicsService = moduleRef.get(GraphicsService);
  });

  describe('assignTeam', () => {
    it('throws NotFoundException when the age group does not belong to this organisation', async () => {
      prisma.academyAgeGroup.findUnique.mockResolvedValue({
        id: 'ag1',
        organisationId: 'other-org',
      });

      await expect(
        service.assignTeam('org-1', 'ag1', 'team-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.team.update).not.toHaveBeenCalled();
    });

    it('links the team to the age group', async () => {
      prisma.academyAgeGroup.findUnique.mockResolvedValue({
        id: 'ag1',
        organisationId: 'org-1',
      });
      prisma.team.findUnique.mockResolvedValue({ id: 'team-1' });

      await service.assignTeam('org-1', 'ag1', 'team-1');

      expect(prisma.team.update).toHaveBeenCalledWith({
        where: { id: 'team-1' },
        data: { ageGroupId: 'ag1' },
      });
    });
  });

  describe('enrollPlayer', () => {
    it('rejects enrolling into an age group with no squad yet', async () => {
      prisma.academyAgeGroup.findUnique.mockResolvedValue({
        id: 'ag1',
        organisationId: 'org-1',
      });
      prisma.team.findFirst.mockResolvedValue(null);

      await expect(
        service.enrollPlayer('org-1', 'ag1', 'player-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(playersService.update).not.toHaveBeenCalled();
    });

    it('assigns the player to the age group squad and enqueues an ungated passport', async () => {
      prisma.academyAgeGroup.findUnique.mockResolvedValue({
        id: 'ag1',
        organisationId: 'org-1',
      });
      prisma.team.findFirst.mockResolvedValue({ id: 'team-1' });
      prisma.player.findUnique.mockResolvedValue({
        id: 'player-1',
        firstName: 'Ada',
        lastName: 'Okoro',
        position: null,
        shirtNumber: null,
        nationality: null,
        dateOfBirth: null,
        photoUrl: null,
        team: { name: 'U12 Eagles' },
      });

      const result = await service.enrollPlayer('org-1', 'ag1', 'player-1');

      expect(playersService.update).toHaveBeenCalledWith('player-1', {
        teamId: 'team-1',
      });
      expect(graphicsService.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'PLAYER_PASSPORT',
          subjectId: 'player-1',
          data: expect.objectContaining({
            playerName: 'Ada Okoro',
            teamName: 'U12 Eagles',
          }),
        }),
      );
      expect(result).toEqual({ teamId: 'team-1' });
    });
  });
});
