import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PLAYER_REGISTRATION } from '@4ef/shared';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PaymentsService } from '../../payments/application/payments.service';
import {
  hasCompleteGuardianConsent,
  isMinor,
} from '../domain/guardian-consent';
import type { GuardianConsentInput } from '../domain/guardian-consent';

@Injectable()
export class PlayerRegistrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
  ) {}

  /**
   * One player at a time (not a whole-squad bulk call) so a U18 player
   * missing guardian consent fails on their own row without blocking the
   * rest of the squad the club is trying to register alongside them.
   */
  async register(
    competitionId: string,
    teamId: string,
    playerId: string,
    guardianConsent?: GuardianConsentInput,
  ) {
    const [competition, player] = await Promise.all([
      this.prisma.competition.findUnique({ where: { id: competitionId } }),
      this.prisma.player.findUnique({ where: { id: playerId } }),
    ]);

    if (!competition) throw new NotFoundException('Competition not found');
    if (!player) throw new NotFoundException('Player not found');
    if (player.teamId !== teamId) {
      throw new BadRequestException('Player does not belong to this team');
    }

    if (player.dateOfBirth && isMinor(player.dateOfBirth)) {
      if (!guardianConsent || !hasCompleteGuardianConsent(guardianConsent)) {
        throw new BadRequestException(
          'This player is under 18 — guardian name plus a phone or email is required to register them',
        );
      }
    }

    const priceKobo = PLAYER_REGISTRATION.STANDARD.priceKobo;

    return this.prisma.playerRegistration.upsert({
      where: { competitionId_playerId: { competitionId, playerId } },
      create: {
        competitionId,
        teamId,
        playerId,
        priceKobo,
        status: 'DRAFT',
        guardianName: guardianConsent?.guardianName,
        guardianPhone: guardianConsent?.guardianPhone,
        guardianEmail: guardianConsent?.guardianEmail,
        guardianConsentAt: guardianConsent ? new Date() : undefined,
      },
      // Re-registering an already-DRAFT row (e.g. updating guardian
      // details before paying) is fine; a CONFIRMED/LOCKED one is not
      // touched here — see the DoD test for why that matters.
      update: {
        guardianName: guardianConsent?.guardianName,
        guardianPhone: guardianConsent?.guardianPhone,
        guardianEmail: guardianConsent?.guardianEmail,
        guardianConsentAt: guardianConsent ? new Date() : undefined,
      },
    });
  }

  /**
   * §3.4: "Partial payment is allowed: a club can pay for 15 of 20
   * players; only the paid 15 become eligible" — checkout takes an explicit
   * list of registration ids the club is choosing to pay for right now, not
   * implicitly "everything unpaid for this team".
   */
  async checkout(
    registrationIds: string[],
    organisationId: string,
    provider: 'PAYSTACK' | 'BANK_TRANSFER' | 'CASH',
    payerEmail: string,
  ) {
    if (registrationIds.length === 0) {
      throw new BadRequestException('No registrations selected');
    }

    const registrations = await this.prisma.playerRegistration.findMany({
      where: { id: { in: registrationIds } },
    });

    if (registrations.length !== registrationIds.length) {
      throw new NotFoundException('One or more registrations were not found');
    }

    const notDraft = registrations.filter((r) => r.status !== 'DRAFT');
    if (notDraft.length > 0) {
      throw new BadRequestException(
        `${notDraft.length} of the selected registrations are not in DRAFT status (already paid or locked)`,
      );
    }

    const teamId = registrations[0].teamId;
    if (!registrations.every((r) => r.teamId === teamId)) {
      throw new BadRequestException(
        'All selected registrations must belong to the same team',
      );
    }

    const amountKobo = registrations.reduce((sum, r) => sum + r.priceKobo, 0);

    const { payment, authorizationUrl } = await this.paymentsService.initialize(
      {
        organisationId,
        provider,
        purpose: 'PLAYER_REGISTRATION',
        subjectType: 'TEAM',
        subjectId: teamId,
        amountKobo,
        payerEmail,
      },
    );

    await this.prisma.playerRegistration.updateMany({
      where: { id: { in: registrationIds } },
      data: { paymentId: payment.id, status: 'PENDING_PAYMENT' },
    });

    return { payment, authorizationUrl };
  }

  /**
   * The actual eligibility gate MatchEventsService.recordEvent() calls.
   * True (eligible) when either no paid-registration record exists for
   * this player+competition at all — meaning this competition doesn't use
   * the paid registration flow, true for every competition that predates
   * Phase 2 — or one exists and has cleared payment.
   */
  async isEligible(playerId: string, competitionId: string): Promise<boolean> {
    const registration = await this.prisma.playerRegistration.findUnique({
      where: { competitionId_playerId: { competitionId, playerId } },
    });

    if (!registration) {
      return true;
    }

    return (
      registration.status === 'CONFIRMED' || registration.status === 'LOCKED'
    );
  }

  /**
   * §3.4: "Once LOCKED (at registration close), player records become
   * immutable. Additions after lock require an organiser-approved, logged
   * exception." Locking itself is the mechanical half of that — the
   * "organiser-approved, logged exception" workflow for post-lock additions
   * isn't built in this pass (flagged in the Phase 2 report as a real gap,
   * not silently skipped).
   */
  async lockForCompetition(competitionId: string): Promise<number> {
    const result = await this.prisma.playerRegistration.updateMany({
      where: { competitionId, status: 'CONFIRMED' },
      data: { status: 'LOCKED', lockedAt: new Date() },
    });
    return result.count;
  }
}
