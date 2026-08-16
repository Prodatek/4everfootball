import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { GraphicFormat, GraphicTemplate, Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { MediaPacksService } from '../../media-packs/application/media-packs.service';
import { DEFAULT_FORMAT, isGatedTemplate } from '../domain/templates';

// Guards against re-enqueueing the same graphic if a cron trigger fires
// twice in a short window (an app restart mid-tick, a misconfigured
// schedule) — event-driven enqueues (GOAL/FULL_TIME) are already
// deduplicated upstream by MatchEventsService's clientEventId check before
// they ever reach here, so this mostly protects the @Cron triggers.
const DEDUP_WINDOW_MS = 20 * 60 * 60 * 1000; // 20 hours

export interface EnqueueGraphicInput {
  template: GraphicTemplate;
  format?: GraphicFormat;
  competitionId?: string | null;
  subjectType: string;
  subjectId: string;
  data: Record<string, unknown>;
}

@Injectable()
export class GraphicsService {
  private readonly logger = new Logger(GraphicsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaPacksService: MediaPacksService,
  ) {}

  /**
   * Returns null (rather than throwing) whenever a graphic is deliberately
   * skipped — not entitled, not enough context to gate, or a duplicate.
   * Callers (event hooks, cron triggers) are expected to fire-and-forget
   * this in a loop over many subjects; a skip is a normal outcome, not an
   * error condition worth interrupting the loop for.
   */
  async enqueue(input: EnqueueGraphicInput) {
    if (isGatedTemplate(input.template)) {
      if (!input.competitionId) {
        this.logger.debug(
          `Skipped ${input.template}: gated template with no competitionId`,
        );
        return null;
      }

      const competition = await this.prisma.competition.findUnique({
        where: { id: input.competitionId },
        select: { organisationId: true },
      });

      if (!competition) {
        return null;
      }

      const entitled = await this.mediaPacksService.hasEntitlement(
        competition.organisationId,
        input.competitionId,
      );

      if (!entitled) {
        return null;
      }
    }

    const format = input.format ?? DEFAULT_FORMAT[input.template];

    const duplicate = await this.prisma.graphic.findFirst({
      where: {
        template: input.template,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        format,
        OR: [
          { status: { in: ['PENDING', 'PROCESSING'] } },
          { createdAt: { gt: new Date(Date.now() - DEDUP_WINDOW_MS) } },
        ],
      },
      select: { id: true },
    });

    if (duplicate) {
      return null;
    }

    return this.prisma.graphic.create({
      data: {
        template: input.template,
        format,
        competitionId: input.competitionId ?? null,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        data: input.data as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Used by the passport get-or-create flow (brief §4's "on demand" —
   * PlayerPassportsController) to check "does this player already have a
   * passport" without going through enqueue()'s dedup-window skip logic,
   * which is designed for cron/event re-firing, not a user-facing lookup.
   */
  async findLatestForSubject(
    template: GraphicTemplate,
    subjectType: string,
    subjectId: string,
  ) {
    return this.prisma.graphic.findFirst({
      where: { template, subjectType, subjectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(id: string) {
    const graphic = await this.prisma.graphic.findUnique({ where: { id } });

    if (!graphic) {
      throw new NotFoundException('Graphic not found');
    }

    return graphic;
  }

  /** The "one screen" a club admin downloads every graphic for their team
   * from (brief §4 DoD) — every competition under their organisation. */
  async listForOrganisation(organisationId: string) {
    return this.prisma.graphic.findMany({
      where: { competition: { organisationId } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listForCompetition(competitionId: string) {
    return this.prisma.graphic.findMany({
      where: { competitionId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
