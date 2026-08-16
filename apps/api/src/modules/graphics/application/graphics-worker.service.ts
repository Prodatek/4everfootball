import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { S3StorageService } from '../../media/infrastructure/s3-storage.service';
import { SatoriRendererService } from '../infrastructure/satori-renderer.service';
import { ImageEmbedService } from '../infrastructure/image-embed.service';

// 5s poll, 5-per-tick batch — comfortably inside the brief's 60-second
// "goal captured -> shareable image" DoD budget without a real queue (see
// the Phase 3 plan: same @nestjs/schedule @Interval substitute Phase 2
// used for payment reconciliation — no queue infra exists in this repo).
const POLL_INTERVAL_MS = 5_000;
const BATCH_SIZE = 5;
const MAX_ATTEMPTS = 3;

@Injectable()
export class GraphicsWorkerService {
  private readonly logger = new Logger(GraphicsWorkerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly renderer: SatoriRendererService,
    private readonly imageEmbed: ImageEmbedService,
    private readonly s3: S3StorageService,
  ) {}

  @Interval(POLL_INTERVAL_MS)
  async processPending(): Promise<void> {
    const pending = await this.prisma.graphic.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: BATCH_SIZE,
    });

    for (const graphic of pending) {
      await this.renderOne(graphic.id);
    }
  }

  private async renderOne(id: string): Promise<void> {
    // Atomic claim: only the tick that successfully flips PENDING ->
    // PROCESSING proceeds, so two overlapping ticks (a slow render running
    // past the next 5s poll) can never render the same row twice.
    const claimed = await this.prisma.graphic.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: 'PROCESSING' },
    });

    if (claimed.count === 0) {
      return;
    }

    const graphic = await this.prisma.graphic.findUnique({
      where: { id },
      include: { competition: true },
    });

    if (!graphic) {
      return;
    }

    try {
      const preparedData = await this.imageEmbed.prepare(
        graphic.data as Record<string, unknown>,
      );
      const png = await this.renderer.render(
        graphic.template,
        graphic.format,
        preparedData,
        graphic.competition,
      );

      const key = `graphics/${graphic.template.toLowerCase()}/${graphic.id}.png`;
      await this.s3.putObject(key, png, 'image/png');

      await this.prisma.graphic.update({
        where: { id: graphic.id },
        data: {
          status: 'READY',
          mediaKey: key,
          publicUrl: this.s3.publicUrlFor(key),
          readyAt: new Date(),
        },
      });
    } catch (error) {
      const attempts = graphic.attempts + 1;
      const message = error instanceof Error ? error.message : String(error);

      await this.prisma.graphic.update({
        where: { id: graphic.id },
        data: {
          status: attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING',
          attempts,
          errorMessage: message,
        },
      });

      this.logger.error(
        `Graphic render failed for ${graphic.id} (attempt ${attempts})`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
