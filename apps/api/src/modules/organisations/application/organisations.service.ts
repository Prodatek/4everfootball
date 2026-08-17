import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { OrganisationMemberRole } from '@prisma/client';
import type { JwtAccessPayload } from '@4ef/shared';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { paginate, type PaginatedResult } from '../../../common/dto/paginated-result';
import {
  canCreateCommunityCompetition,
  checkTeamLimit,
  effectiveMaxTeams,
} from '../domain/entitlements';
import type { CreateOrganisationDto } from './dto/create-organisation.dto';
import type { QueryOrganisationsDto } from './dto/query-organisations.dto';

const MANAGE_ROLES: OrganisationMemberRole[] = ['OWNER', 'ADMIN'];
// Phase 4 (brief §5.2): a coach's daily task (recording attendance) isn't
// an "administer this organisation" action the way adding a member or
// buying an academy plan is — OWNER/ADMIN can still do it (they might
// coach too), but it shouldn't require being one.
const COACH_ROLES: OrganisationMemberRole[] = ['OWNER', 'ADMIN', 'COACH'];

@Injectable()
export class OrganisationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrganisationDto, creatorUserId: string) {
    return this.prisma.organisation.create({
      data: {
        ...dto,
        members: {
          create: { userId: creatorUserId, role: 'OWNER' },
        },
      },
    });
  }

  async getById(id: string) {
    const organisation = await this.prisma.organisation.findUnique({
      where: { id },
    });

    if (!organisation) {
      throw new NotFoundException('Organisation not found');
    }

    return organisation;
  }

  async listForUser(userId: string) {
    return this.prisma.organisation.findMany({
      where: { members: { some: { userId } } },
      orderBy: { name: 'asc' },
    });
  }

  // §5 A1 of MONETISATION_UI_BRIEF.md needed an admin org list to build
  // against — until now nothing on the API surface could enumerate
  // organisations at all, only a single one by id or "mine" for the caller.
  async listAll(
    query: QueryOrganisationsDto,
  ): Promise<PaginatedResult<unknown>> {
    const where = query.search
      ? { name: { contains: query.search, mode: 'insensitive' as const } }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.organisation.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.organisation.count({ where }),
    ]);

    return paginate(data, total, query.page, query.limit);
  }

  // Same brief section — the members list existed only as a write target
  // (addMember). Returns each member's role alongside the basic user
  // fields the UI needs (name/email), never the password hash.
  async listMembers(organisationId: string) {
    return this.prisma.organisationMember.findMany({
      where: { organisationId },
      orderBy: { createdAt: 'asc' },
      select: {
        userId: true,
        role: true,
        createdAt: true,
        user: {
          select: { id: true, displayName: true, email: true },
        },
      },
    });
  }

  /**
   * The organisation-scoped authorization check every other Phase 2 module
   * uses before a mutation: SUPER_ADMIN can act on any organisation (same
   * platform-super-user convention as everywhere else in this codebase);
   * otherwise the acting user must be an OWNER/ADMIN member of THIS
   * specific organisation. Not a full custom guard/decorator — this is a
   * service-layer check called explicitly, which is enough for the number
   * of call sites Phase 2 actually has; worth promoting to a real guard if
   * organisation-scoped routes grow substantially.
   */
  async assertCanManage(
    organisationId: string,
    actingUser: JwtAccessPayload,
  ): Promise<void> {
    await this.assertHasRole(
      organisationId,
      actingUser,
      MANAGE_ROLES,
      'You must be an owner or admin of this organisation to do that',
    );
  }

  /** Brief §5.2: attendance recording is a coach's core task, not an
   * "administer this organisation" action — see the comment on
   * COACH_ROLES. */
  async assertCanCoach(
    organisationId: string,
    actingUser: JwtAccessPayload,
  ): Promise<void> {
    await this.assertHasRole(
      organisationId,
      actingUser,
      COACH_ROLES,
      'You must be an owner, admin, or coach of this organisation to do that',
    );
  }

  private async assertHasRole(
    organisationId: string,
    actingUser: JwtAccessPayload,
    allowedRoles: OrganisationMemberRole[],
    errorMessage: string,
  ): Promise<void> {
    if (actingUser.roles.includes('SUPER_ADMIN')) {
      return;
    }

    const membership = await this.prisma.organisationMember.findUnique({
      where: {
        organisationId_userId: { organisationId, userId: actingUser.sub },
      },
    });

    if (!membership || !allowedRoles.includes(membership.role)) {
      throw new ForbiddenException(errorMessage);
    }
  }

  async addMember(
    organisationId: string,
    userId: string,
    role: OrganisationMemberRole,
  ) {
    return this.prisma.organisationMember.upsert({
      where: { organisationId_userId: { organisationId, userId } },
      create: { organisationId, userId, role },
      update: { role },
    });
  }

  /**
   * §3.3's free-tier + max-teams gates, called before creating a
   * competition/adding a team entry. Returns a decision rather than
   * throwing — "never let a customer hit a wall mid-season with money in
   * hand" means the caller decides what to do with `needsUpgrade` (e.g.
   * still allow the write, surface an upgrade prompt), not this method.
   */
  async checkCanCreateCommunityCompetition(
    organisationId: string,
  ): Promise<boolean> {
    const openCommunityCount = await this.prisma.competition.count({
      where: {
        organisationId,
        tier: 'COMMUNITY',
        licenceStatus: { notIn: ['CLOSED'] },
      },
    });

    return canCreateCommunityCompetition(openCommunityCount);
  }

  async checkTeamLimitFor(competitionId: string) {
    const competition = await this.prisma.competition.findUniqueOrThrow({
      where: { id: competitionId },
      select: { tier: true, maxTeams: true },
    });

    const teamCount = await this.prisma.competitionEntry.count({
      where: { competitionId },
    });

    const cap = effectiveMaxTeams(competition.tier, competition.maxTeams);
    return checkTeamLimit(teamCount, cap);
  }
}
