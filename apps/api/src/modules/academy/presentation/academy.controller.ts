import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { JwtAccessPayload } from '@4ef/shared';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { OrganisationsService } from '../../organisations/application/organisations.service';
import { AcademyAgeGroupsService } from '../application/academy-age-groups.service';
import { CreateAgeGroupDto } from '../application/dto/create-age-group.dto';
import { AssignTeamDto } from '../application/dto/assign-team.dto';

@ApiTags('academy')
@ApiBearerAuth()
@Controller('organisations/:organisationId/academy/age-groups')
export class AcademyController {
  constructor(
    private readonly ageGroupsService: AcademyAgeGroupsService,
    private readonly organisationsService: OrganisationsService,
  ) {}

  @Get()
  async list(
    @Param('organisationId') organisationId: string,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    await this.organisationsService.assertCanCoach(organisationId, user);
    return this.ageGroupsService.listForOrganisation(organisationId);
  }

  @Post()
  async create(
    @Param('organisationId') organisationId: string,
    @Body() dto: CreateAgeGroupDto,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    await this.organisationsService.assertCanManage(organisationId, user);
    return this.ageGroupsService.create(
      organisationId,
      dto.name,
      dto.minAge,
      dto.maxAge,
    );
  }

  @Post(':ageGroupId/team')
  async assignTeam(
    @Param('organisationId') organisationId: string,
    @Param('ageGroupId') ageGroupId: string,
    @Body() dto: AssignTeamDto,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    await this.organisationsService.assertCanManage(organisationId, user);
    await this.ageGroupsService.assignTeam(
      organisationId,
      ageGroupId,
      dto.teamId,
    );
    return { assigned: true };
  }

  // Coach-accessible, not just OWNER/ADMIN — enrolling a player (and thus
  // issuing their passport, brief §5.2) is a coach's day-to-day task.
  @Post(':ageGroupId/players/:playerId/enroll')
  async enrollPlayer(
    @Param('organisationId') organisationId: string,
    @Param('ageGroupId') ageGroupId: string,
    @Param('playerId') playerId: string,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    await this.organisationsService.assertCanCoach(organisationId, user);
    return this.ageGroupsService.enrollPlayer(
      organisationId,
      ageGroupId,
      playerId,
    );
  }
}
