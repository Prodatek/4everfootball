import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PlayerRegistrationsService } from './player-registrations.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PaymentsService } from '../../payments/application/payments.service';

function fakePrisma() {
  return {
    competition: { findUnique: jest.fn() },
    player: { findUnique: jest.fn() },
    playerRegistration: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };
}

describe('PlayerRegistrationsService', () => {
  let service: PlayerRegistrationsService;
  let prisma: ReturnType<typeof fakePrisma>;
  let paymentsService: jest.Mocked<PaymentsService>;

  beforeEach(async () => {
    prisma = fakePrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [
        PlayerRegistrationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: PaymentsService, useValue: { initialize: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(PlayerRegistrationsService);
    paymentsService = moduleRef.get(PaymentsService);
  });

  describe('register', () => {
    const adultPlayer = {
      id: 'p1',
      teamId: 'team-1',
      dateOfBirth: new Date('1995-01-01'),
    };
    const minorPlayer = {
      id: 'p2',
      teamId: 'team-1',
      dateOfBirth: new Date('2015-01-01'),
    };

    beforeEach(() => {
      prisma.competition.findUnique.mockResolvedValue({ id: 'comp-1' });
    });

    it('registers an adult player with no guardian consent needed', async () => {
      prisma.player.findUnique.mockResolvedValue(adultPlayer);
      prisma.playerRegistration.upsert.mockResolvedValue({ id: 'reg-1' });

      await service.register('comp-1', 'team-1', 'p1');

      expect(prisma.playerRegistration.upsert).toHaveBeenCalled();
    });

    it('rejects a minor with no guardian consent at all', async () => {
      prisma.player.findUnique.mockResolvedValue(minorPlayer);

      await expect(
        service.register('comp-1', 'team-1', 'p2'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.playerRegistration.upsert).not.toHaveBeenCalled();
    });

    it('rejects a minor with a name but no way to contact the guardian', async () => {
      prisma.player.findUnique.mockResolvedValue(minorPlayer);

      await expect(
        service.register('comp-1', 'team-1', 'p2', { guardianName: 'Parent' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('registers a minor with complete guardian consent', async () => {
      prisma.player.findUnique.mockResolvedValue(minorPlayer);
      prisma.playerRegistration.upsert.mockResolvedValue({ id: 'reg-1' });

      await service.register('comp-1', 'team-1', 'p2', {
        guardianName: 'Parent',
        guardianPhone: '0800',
      });

      expect(prisma.playerRegistration.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            guardianName: 'Parent',
            guardianPhone: '0800',
          }),
        }),
      );
    });

    it("rejects a player who isn't on the given team", async () => {
      prisma.player.findUnique.mockResolvedValue({
        ...adultPlayer,
        teamId: 'other-team',
      });

      await expect(
        service.register('comp-1', 'team-1', 'p1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('checkout', () => {
    it('sums server-stored priceKobo across selected registrations, never a client amount', async () => {
      prisma.playerRegistration.findMany.mockResolvedValue([
        { id: 'r1', teamId: 'team-1', status: 'DRAFT', priceKobo: 100_000 },
        { id: 'r2', teamId: 'team-1', status: 'DRAFT', priceKobo: 100_000 },
      ]);
      paymentsService.initialize.mockResolvedValue({
        payment: { id: 'pay-1' } as never,
        authorizationUrl: 'https://paystack.test/x',
      });

      await service.checkout(
        ['r1', 'r2'],
        'org-1',
        'PAYSTACK',
        'club@example.com',
      );

      expect(paymentsService.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          amountKobo: 200_000,
          purpose: 'PLAYER_REGISTRATION',
        }),
      );
    });

    it('marks only the selected registrations PENDING_PAYMENT, enabling true partial payment', async () => {
      prisma.playerRegistration.findMany.mockResolvedValue([
        { id: 'r1', teamId: 'team-1', status: 'DRAFT', priceKobo: 100_000 },
      ]);
      paymentsService.initialize.mockResolvedValue({
        payment: { id: 'pay-1' } as never,
        authorizationUrl: null,
      });

      await service.checkout(
        ['r1'],
        'org-1',
        'BANK_TRANSFER',
        'club@example.com',
      );

      expect(prisma.playerRegistration.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['r1'] } },
        data: { paymentId: 'pay-1', status: 'PENDING_PAYMENT' },
      });
    });

    it('rejects checking out a registration that is not DRAFT (already paid, being paid, or locked)', async () => {
      prisma.playerRegistration.findMany.mockResolvedValue([
        { id: 'r1', teamId: 'team-1', status: 'CONFIRMED', priceKobo: 100_000 },
      ]);

      await expect(
        service.checkout(['r1'], 'org-1', 'PAYSTACK', 'club@example.com'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(paymentsService.initialize).not.toHaveBeenCalled();
    });

    it('rejects mixing registrations from different teams in one checkout', async () => {
      prisma.playerRegistration.findMany.mockResolvedValue([
        { id: 'r1', teamId: 'team-1', status: 'DRAFT', priceKobo: 100_000 },
        { id: 'r2', teamId: 'team-2', status: 'DRAFT', priceKobo: 100_000 },
      ]);

      await expect(
        service.checkout(['r1', 'r2'], 'org-1', 'PAYSTACK', 'club@example.com'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a registration id that does not exist', async () => {
      prisma.playerRegistration.findMany.mockResolvedValue([]);

      await expect(
        service.checkout(['missing'], 'org-1', 'PAYSTACK', 'club@example.com'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('isEligible', () => {
    it('is eligible when no registration record exists at all (competition predates paid registration)', async () => {
      prisma.playerRegistration.findUnique.mockResolvedValue(null);
      await expect(service.isEligible('p1', 'comp-1')).resolves.toBe(true);
    });

    it('is eligible once CONFIRMED', async () => {
      prisma.playerRegistration.findUnique.mockResolvedValue({
        status: 'CONFIRMED',
      });
      await expect(service.isEligible('p1', 'comp-1')).resolves.toBe(true);
    });

    it('is eligible once LOCKED', async () => {
      prisma.playerRegistration.findUnique.mockResolvedValue({
        status: 'LOCKED',
      });
      await expect(service.isEligible('p1', 'comp-1')).resolves.toBe(true);
    });

    it('is NOT eligible while still DRAFT', async () => {
      prisma.playerRegistration.findUnique.mockResolvedValue({
        status: 'DRAFT',
      });
      await expect(service.isEligible('p1', 'comp-1')).resolves.toBe(false);
    });

    it('is NOT eligible while PENDING_PAYMENT (this is the actual enforcement point for "unpaid squad cannot be selected")', async () => {
      prisma.playerRegistration.findUnique.mockResolvedValue({
        status: 'PENDING_PAYMENT',
      });
      await expect(service.isEligible('p1', 'comp-1')).resolves.toBe(false);
    });
  });

  describe('lockForCompetition', () => {
    it('transitions only CONFIRMED registrations to LOCKED and reports the count', async () => {
      prisma.playerRegistration.updateMany.mockResolvedValue({ count: 15 });

      const count = await service.lockForCompetition('comp-1');

      expect(prisma.playerRegistration.updateMany).toHaveBeenCalledWith({
        where: { competitionId: 'comp-1', status: 'CONFIRMED' },
        data: { status: 'LOCKED', lockedAt: expect.any(Date) },
      });
      expect(count).toBe(15);
    });
  });
});
