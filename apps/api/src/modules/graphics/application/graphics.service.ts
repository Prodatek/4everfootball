import { createRequire } from 'node:module';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type ArchiverType from 'archiver';
import type { GraphicFormat, GraphicTemplate, Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { MediaPacksService } from '../../media-packs/application/media-packs.service';
import { S3StorageService } from '../../media/infrastructure/s3-storage.service';
import { DEFAULT_FORMAT, isGatedTemplate } from '../domain/templates';

// Same classic-CJS-export interop issue as pdfkit (see PdfRendererService's
// comment): `import archiver from 'archiver'` type-checks fine but resolves
// to undefined at runtime because this tsconfig has no esModuleInterop.
const loadCjsModule = createRequire(__filename);
const archiver: typeof ArchiverType = loadCjsModule('archiver');

export interface GraphicListFilters {
  template?: GraphicTemplate;
  teamId?: string;
  fixtureId?: string;
}

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
    private readonly s3: S3StorageService,
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

  /**
   * §5 G1: "filterable by club, match and type." Graphic has no direct
   * teamId/fixtureId column — every template's subject means something
   * different (a fixture, a player, a match event, or the whole
   * competition), so a club/match filter is really "which subjectIds, of
   * whichever subjectTypes actually carry that club/match, match" —
   * resolved as small targeted lookups rather than one giant join.
   * Competition-wide templates (LEAGUE_TABLE, TOP_SCORERS, ...) have no
   * single club or match and are correctly excluded once either filter is
   * applied, not force-fitted into one.
   */
  async listForCompetition(competitionId: string, filters: GraphicListFilters = {}) {
    const and: Prisma.GraphicWhereInput[] = [{ competitionId }];

    if (filters.template) {
      and.push({ template: filters.template });
    }

    if (filters.fixtureId) {
      const events = await this.prisma.matchEvent.findMany({
        where: { fixtureId: filters.fixtureId },
        select: { id: true },
      });

      and.push({
        OR: [
          { subjectType: 'FIXTURE', subjectId: filters.fixtureId },
          {
            subjectType: 'MATCH_EVENT',
            subjectId: { in: events.map((e) => e.id) },
          },
        ],
      });
    }

    if (filters.teamId) {
      const [fixtures, players, events] = await Promise.all([
        this.prisma.fixture.findMany({
          where: {
            competitionId,
            OR: [{ homeTeamId: filters.teamId }, { awayTeamId: filters.teamId }],
          },
          select: { id: true },
        }),
        this.prisma.player.findMany({
          where: { teamId: filters.teamId },
          select: { id: true },
        }),
        this.prisma.matchEvent.findMany({
          where: { teamId: filters.teamId, fixture: { competitionId } },
          select: { id: true },
        }),
      ]);

      and.push({
        OR: [
          { subjectType: 'FIXTURE', subjectId: { in: fixtures.map((f) => f.id) } },
          { subjectType: 'PLAYER', subjectId: { in: players.map((p) => p.id) } },
          {
            subjectType: 'MATCH_EVENT',
            subjectId: { in: events.map((e) => e.id) },
          },
        ],
      });
    }

    return this.prisma.graphic.findMany({
      where: { AND: and },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * §5 G1: "Bulk download." Streams every matching READY graphic straight
   * from S3 into a zip archive — the caller (controller) pipes the
   * returned archive into the HTTP response, so nothing is buffered fully
   * in memory.
   */
  async buildZipArchive(competitionId: string, filters: GraphicListFilters = {}) {
    const graphics = await this.listForCompetition(competitionId, filters);
    const ready = graphics.filter(
      (g): g is typeof g & { mediaKey: string } => g.status === 'READY' && !!g.mediaKey,
    );

    const archive = archiver('zip', { zlib: { level: 9 } });

    for (const graphic of ready) {
      const stream = await this.s3.getObjectStream(graphic.mediaKey);
      const filename = `${graphic.template.toLowerCase().replace(/_/g, '-')}-${graphic.id.slice(0, 8)}.png`;
      archive.append(stream, { name: filename });
    }

    void archive.finalize();

    return { archive, count: ready.length };
  }

  /**
   * Phase 4 (brief §5.1) "graphics shared" metric — a share *intent*
   * (the link was requested), not a confirmed share, since the native
   * share sheet itself is a client-side action invisible to this API. See
   * the schema comment on Graphic.shareCount.
   */
  async incrementShareCount(id: string): Promise<void> {
    await this.prisma.graphic.update({
      where: { id },
      data: { shareCount: { increment: 1 } },
    });
  }
}
