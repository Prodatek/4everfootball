import { Injectable, NotFoundException } from '@nestjs/common';
import type { AttendanceStatus } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * Same offline-sync idempotency pattern as MatchEventsService.recordEvent()
 * (brief §5.2: "works offline, same sync mechanism as match capture") —
 * clientEventId is generated once on the device when a coach taps a
 * status, and replaying the same submission after a connectivity retry
 * resolves to the one row it already created rather than a duplicate.
 */
@Injectable()
export class AcademyAttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async record(params: {
    organisationId: string;
    ageGroupId: string;
    playerId: string;
    date: Date;
    status: AttendanceStatus;
    recordedById: string;
    clientEventId: string;
  }) {
    const existing = await this.prisma.academyAttendance.findUnique({
      where: { clientEventId: params.clientEventId },
    });

    if (existing) {
      return existing;
    }

    const ageGroup = await this.prisma.academyAgeGroup.findUnique({
      where: { id: params.ageGroupId },
    });

    if (!ageGroup || ageGroup.organisationId !== params.organisationId) {
      throw new NotFoundException('Age group not found for this organisation');
    }

    return this.prisma.academyAttendance.create({ data: params });
  }

  async listForAgeGroup(ageGroupId: string, from?: Date, to?: Date) {
    return this.prisma.academyAttendance.findMany({
      where: {
        ageGroupId,
        ...(from || to
          ? {
              date: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      orderBy: { date: 'desc' },
    });
  }

  /**
   * Attendance rate over a date range for one player — the raw input
   * TermlyReportService needs, kept here (not duplicated there) since it's
   * a query over this service's own table.
   */
  async attendanceRateForPlayer(
    playerId: string,
    from: Date,
    to: Date,
  ): Promise<{ present: number; total: number }> {
    const records = await this.prisma.academyAttendance.findMany({
      where: { playerId, date: { gte: from, lte: to } },
      select: { status: true },
    });

    const present = records.filter(
      (r) => r.status === 'PRESENT' || r.status === 'LATE',
    ).length;
    return { present, total: records.length };
  }
}
