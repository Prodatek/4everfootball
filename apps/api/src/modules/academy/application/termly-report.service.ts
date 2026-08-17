import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { S3StorageService } from '../../media/infrastructure/s3-storage.service';
import { PdfRendererService } from '../../pdf/pdf-renderer.service';
import { AcademyAttendanceService } from './academy-attendance.service';

export interface TermlyReportDataset {
  playerName: string;
  teamName: string | null;
  organisationName: string;
  periodLabel: string;
  attendance: { present: number; total: number; ratePercent: number };
  goals: number;
  assists: number;
}

/**
 * Brief §5.2: "Termly development report — branded per academy, generated
 * from attendance and match data, exportable as PDF and shareable to a
 * parent by WhatsApp link." No stored "Term" entity — the caller supplies
 * an explicit date range, kept lightweight rather than inventing a
 * calendar concept this schema has no other use for.
 */
@Injectable()
export class TermlyReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attendanceService: AcademyAttendanceService,
    private readonly pdfRenderer: PdfRendererService,
    private readonly s3: S3StorageService,
  ) {}

  async generateDataset(
    playerId: string,
    ageGroupId: string,
    from: Date,
    to: Date,
  ): Promise<TermlyReportDataset> {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      include: { team: { include: { organisation: true } } },
    });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    if (player.team?.ageGroupId !== ageGroupId) {
      throw new NotFoundException('Player not found in this age group');
    }

    const [{ present, total }, goalEvents, assistEvents] = await Promise.all([
      this.attendanceService.attendanceRateForPlayer(playerId, from, to),
      this.prisma.matchEvent.count({
        where: {
          playerId,
          type: { in: ['GOAL', 'PENALTY_SCORED'] },
          fixture: { kickoffAt: { gte: from, lte: to } },
        },
      }),
      this.prisma.matchEvent.count({
        where: {
          assistPlayerId: playerId,
          type: 'GOAL',
          fixture: { kickoffAt: { gte: from, lte: to } },
        },
      }),
    ]);

    return {
      playerName: `${player.firstName} ${player.lastName}`,
      teamName: player.team?.name ?? null,
      organisationName: player.team?.organisation?.name ?? 'Academy',
      periodLabel: `${from.toDateString()} – ${to.toDateString()}`,
      attendance: {
        present,
        total,
        ratePercent: total === 0 ? 0 : Math.round((present / total) * 100),
      },
      goals: goalEvents,
      assists: assistEvents,
    };
  }

  async generatePdf(dataset: TermlyReportDataset): Promise<Buffer> {
    return this.pdfRenderer.render((doc) => {
      doc.header(
        dataset.playerName,
        `Development Report — ${dataset.periodLabel}`,
      );
      doc.paragraph(
        `${dataset.organisationName}${dataset.teamName ? ` · ${dataset.teamName}` : ''}`,
      );

      doc.sectionTitle('This term');
      doc.statGrid([
        {
          label: 'Sessions attended',
          value: `${dataset.attendance.present} / ${dataset.attendance.total}`,
        },
        {
          label: 'Attendance rate',
          value: `${dataset.attendance.ratePercent}%`,
        },
        { label: 'Goals', value: String(dataset.goals) },
        { label: 'Assists', value: String(dataset.assists) },
      ]);

      doc.signatureFooter();
    });
  }

  async generateAndUploadPdf(
    playerId: string,
    ageGroupId: string,
    from: Date,
    to: Date,
  ): Promise<{ dataset: TermlyReportDataset; url: string }> {
    const dataset = await this.generateDataset(playerId, ageGroupId, from, to);
    const pdf = await this.generatePdf(dataset);
    const key = `termly-reports/${playerId}/${Date.now()}.pdf`;
    await this.s3.putObject(key, pdf, 'application/pdf');

    return { dataset, url: this.s3.publicUrlFor(key) };
  }
}
