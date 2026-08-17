import { Injectable, NotFoundException } from '@nestjs/common';
import type { PlayerOutcomeType } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * "The number sponsors care about most and nobody else can produce it"
 * (brief §5.1) — deliberately hand-entered, unlike every other
 * sponsor-dashboard number, but WITH a mandatory sourceNote citation. Same
 * EDITOR-role convention as news articles: curated content, not a derived
 * metric.
 */
@Injectable()
export class PlayerOutcomesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: {
    playerId: string;
    type: PlayerOutcomeType;
    description: string;
    sourceNote: string;
    occurredAt: Date;
    createdById: string;
  }) {
    const player = await this.prisma.player.findUnique({
      where: { id: params.playerId },
      select: { id: true },
    });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    return this.prisma.playerOutcome.create({ data: params });
  }

  async listForPlayer(playerId: string) {
    return this.prisma.playerOutcome.findMany({
      where: { playerId },
      orderBy: { occurredAt: 'desc' },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.playerOutcome.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Player outcome not found');
    }

    await this.prisma.playerOutcome.delete({ where: { id } });
  }
}
