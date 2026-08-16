import { Injectable, NotFoundException } from '@nestjs/common';
import type { PaymentProvider } from '@prisma/client';
import { ADD_ONS } from '@4ef/shared';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PaymentsService } from '../../payments/application/payments.service';
import {
  MEDIA_PACK_COMPETITION_SUBJECT_TYPE,
  MEDIA_PACK_ORGANISATION_SUBJECT_TYPE,
} from '../../payments/domain/add-on-subjects';

@Injectable()
export class MediaPacksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
  ) {}

  /**
   * Whole-club packs (competitionId null on the entitlement row) cover
   * every competition under the organisation; a competition-scoped pack
   * only covers that one competition. Either satisfies the check.
   */
  async hasEntitlement(
    organisationId: string,
    competitionId: string | null,
  ): Promise<boolean> {
    const entitlement = await this.prisma.mediaPackEntitlement.findFirst({
      where: {
        organisationId,
        OR: [
          { competitionId: null },
          ...(competitionId ? [{ competitionId }] : []),
        ],
      },
      select: { id: true },
    });

    return entitlement !== null;
  }

  async purchase(params: {
    organisationId: string;
    competitionId?: string;
    provider: PaymentProvider;
    payerEmail: string;
  }) {
    if (params.competitionId) {
      const competition = await this.prisma.competition.findUnique({
        where: { id: params.competitionId },
        select: { organisationId: true },
      });

      if (
        !competition ||
        competition.organisationId !== params.organisationId
      ) {
        throw new NotFoundException(
          'Competition not found for this organisation',
        );
      }
    }

    const amountKobo = params.competitionId
      ? ADD_ONS.MEDIA_PACK_COMPETITION.priceKobo
      : ADD_ONS.MEDIA_PACK_PER_CLUB.priceKobo;

    return this.paymentsService.initialize({
      organisationId: params.organisationId,
      provider: params.provider,
      purpose: 'ADD_ON',
      subjectType: params.competitionId
        ? MEDIA_PACK_COMPETITION_SUBJECT_TYPE
        : MEDIA_PACK_ORGANISATION_SUBJECT_TYPE,
      subjectId: params.competitionId ?? params.organisationId,
      amountKobo,
      payerEmail: params.payerEmail,
    });
  }
}
