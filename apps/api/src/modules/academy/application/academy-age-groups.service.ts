import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PlayersService } from '../../players/application/players.service';
import { GraphicsService } from '../../graphics/application/graphics.service';
import { formatAgeLabel } from '../../graphics/domain/age';

function startOfWeekUtc(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const diffFromMonday = day === 0 ? 6 : day - 1;
  const start = new Date(now);
  start.setUTCDate(now.getUTCDate() - diffFromMonday);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

@Injectable()
export class AcademyAgeGroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly playersService: PlayersService,
    private readonly graphicsService: GraphicsService,
  ) {}

  async create(
    organisationId: string,
    name: string,
    minAge?: number,
    maxAge?: number,
  ) {
    return this.prisma.academyAgeGroup.create({
      data: { organisationId, name, minAge, maxAge },
    });
  }

  async listForOrganisation(organisationId: string) {
    return this.prisma.academyAgeGroup.findMany({
      where: { organisationId },
      orderBy: { name: 'asc' },
      include: { teams: { select: { id: true, name: true } } },
    });
  }

  /** Links an existing squad (Team) to this age group — squad creation
   * itself reuses the existing Teams module, not reinvented here. */
  async assignTeam(organisationId: string, ageGroupId: string, teamId: string) {
    const ageGroup = await this.getOwnedAgeGroup(organisationId, ageGroupId);

    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    await this.prisma.team.update({
      where: { id: teamId },
      data: { ageGroupId: ageGroup.id },
    });
  }

  /**
   * "Enrolling" a player = assigning them to the age group's squad —
   * reuses PlayersService.update() for the actual teamId change rather
   * than duplicating team-assignment logic, then triggers the ungated
   * PLAYER_PASSPORT graphic (brief §5.2: "player passports issued to
   * every academy player"), same template Phase 3 built for competition
   * registration, not a new one.
   */
  async enrollPlayer(
    organisationId: string,
    ageGroupId: string,
    playerId: string,
  ) {
    const ageGroup = await this.getOwnedAgeGroup(organisationId, ageGroupId);

    const team = await this.prisma.team.findFirst({
      where: { ageGroupId: ageGroup.id },
    });

    if (!team) {
      throw new BadRequestException(
        'This age group has no squad yet — assign a team to it first',
      );
    }

    await this.playersService.update(playerId, { teamId: team.id });

    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      include: { team: true },
    });

    if (player) {
      await this.graphicsService.enqueue({
        template: 'PLAYER_PASSPORT',
        subjectType: 'PLAYER',
        subjectId: player.id,
        data: {
          playerName: `${player.firstName} ${player.lastName}`,
          teamName: player.team?.name ?? null,
          position: player.position,
          shirtNumber: player.shirtNumber,
          nationality: player.nationality,
          ageLabel: formatAgeLabel(player.dateOfBirth),
          photoUrl: player.photoUrl,
          competitionName: null,
        },
      });
    }

    return { teamId: team.id };
  }

  /**
   * §5 F1: "Roster size, age groups, attendance this week, plan status."
   * One consolidated read so the dashboard is a single call, same shape as
   * SponsorDashboardService.getForSlug() (Phase 4).
   */
  async getDashboard(organisationId: string) {
    const [ageGroupCount, rosterSize, weekAttendance] = await Promise.all([
      this.prisma.academyAgeGroup.count({ where: { organisationId } }),
      this.prisma.player.count({
        where: {
          team: { organisationId, ageGroupId: { not: null } },
          isActive: true,
        },
      }),
      this.prisma.academyAttendance.findMany({
        where: { organisationId, date: { gte: startOfWeekUtc() } },
        select: { status: true },
      }),
    ]);

    const present = weekAttendance.filter(
      (a) => a.status === 'PRESENT' || a.status === 'LATE',
    ).length;

    return {
      ageGroupCount,
      rosterSize,
      attendanceThisWeek: { present, total: weekAttendance.length },
    };
  }

  private async getOwnedAgeGroup(organisationId: string, ageGroupId: string) {
    const ageGroup = await this.prisma.academyAgeGroup.findUnique({
      where: { id: ageGroupId },
    });

    if (!ageGroup || ageGroup.organisationId !== organisationId) {
      throw new NotFoundException('Age group not found for this organisation');
    }

    return ageGroup;
  }
}
