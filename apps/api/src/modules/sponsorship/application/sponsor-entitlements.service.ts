import { Injectable } from '@nestjs/common';
import type { SponsorFeature } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * Admin-granted, not self-serve purchased — brief §7 explicitly lists
 * "self-serve checkout and pricing pages before the tenth manual deal" as
 * something not to build. An IMPACT_REPORT deal is closed manually; this
 * just records that it happened.
 */
@Injectable()
export class SponsorEntitlementsService {
  constructor(private readonly prisma: PrismaService) {}

  async grant(params: {
    organisationId: string;
    competitionId?: string;
    feature: SponsorFeature;
    grantedById: string;
    note?: string;
  }) {
    return this.prisma.sponsorEntitlement.create({ data: params });
  }

  async hasEntitlement(
    organisationId: string,
    competitionId: string | null,
    feature: SponsorFeature,
  ): Promise<boolean> {
    const entitlement = await this.prisma.sponsorEntitlement.findFirst({
      where: {
        organisationId,
        feature,
        OR: [
          { competitionId: null },
          ...(competitionId ? [{ competitionId }] : []),
        ],
      },
      select: { id: true },
    });

    return entitlement !== null;
  }
}
