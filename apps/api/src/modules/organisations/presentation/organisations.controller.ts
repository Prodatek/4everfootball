import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { JwtAccessPayload } from '@4ef/shared';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { OrganisationsService } from '../application/organisations.service';
import { CreateOrganisationDto } from '../application/dto/create-organisation.dto';
import { AddOrganisationMemberDto } from '../application/dto/add-organisation-member.dto';
import { QueryOrganisationsDto } from '../application/dto/query-organisations.dto';

@ApiTags('organisations')
@ApiBearerAuth()
@Controller('organisations')
export class OrganisationsController {
  constructor(private readonly organisationsService: OrganisationsService) {}

  // Any authenticated user can create an organisation (this is how a club
  // or a new competition organiser signs up in the first place — there's
  // nothing to be a member of yet to gate this behind).
  @Post()
  create(
    @Body() dto: CreateOrganisationDto,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.organisationsService.create(dto, user.sub);
  }

  @Get('mine')
  listMine(@CurrentUser() user: JwtAccessPayload) {
    return this.organisationsService.listForUser(user.sub);
  }

  // §5 A1 of MONETISATION_UI_BRIEF.md — see OrganisationsService.listAll().
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('admin/all')
  listAll(@Query() query: QueryOrganisationsDto) {
    return this.organisationsService.listAll(query);
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.organisationsService.getById(id);
  }

  // Org-scoped (assertCanManage), same reasoning as addMember below — an
  // org's own OWNER/ADMIN can see who's in it, not just a platform admin.
  @Get(':id/members')
  async listMembers(
    @Param('id') id: string,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    await this.organisationsService.assertCanManage(id, user);
    return this.organisationsService.listMembers(id);
  }

  // Was never wired up despite OrganisationsService.addMember() existing
  // since Phase 2 — no member (of any role, including this phase's new
  // COACH) could be added via the API at all. Org-scoped (assertCanManage),
  // not the platform-role gate on getById() above: adding a member is
  // something an org's own OWNER/ADMIN does, not just a platform admin.
  @Post(':id/members')
  async addMember(
    @Param('id') id: string,
    @Body() dto: AddOrganisationMemberDto,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    await this.organisationsService.assertCanManage(id, user);
    return this.organisationsService.addMember(id, dto.userId, dto.role);
  }
}
