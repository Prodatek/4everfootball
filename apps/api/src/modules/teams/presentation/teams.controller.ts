import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { JwtAccessPayload } from '@4ef/shared';
import { Public } from '../../../common/decorators/public.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { OrganisationsService } from '../../organisations/application/organisations.service';
import { TeamsService } from '../application/teams.service';
import { CreateTeamDto } from '../application/dto/create-team.dto';
import { UpdateTeamDto } from '../application/dto/update-team.dto';
import { QueryTeamsDto } from '../application/dto/query-teams.dto';
import { ClaimTeamDto } from '../application/dto/claim-team.dto';

@ApiTags('teams')
@Controller('teams')
export class TeamsController {
  constructor(
    private readonly teamsService: TeamsService,
    private readonly organisationsService: OrganisationsService,
  ) {}

  @Public()
  @Get()
  list(@Query() query: QueryTeamsDto) {
    return this.teamsService.list(query);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('admin/all')
  listForAdmin(@Query() query: QueryTeamsDto) {
    return this.teamsService.listForAdmin(query);
  }

  @Public()
  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.teamsService.getBySlug(slug);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post()
  create(@Body() dto: CreateTeamDto) {
    return this.teamsService.create(dto);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTeamDto) {
    return this.teamsService.update(id, dto);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.teamsService.remove(id);
  }

  // §5 B2 of MONETISATION_UI_BRIEF.md — see TeamsService.claim(). Org-scoped
  // (assertCanManage), not platform-role-gated: this is the self-service
  // path a new club account uses to attach an unclaimed team to itself.
  @ApiBearerAuth()
  @Post(':id/claim')
  async claim(
    @Param('id') id: string,
    @Body() dto: ClaimTeamDto,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    await this.organisationsService.assertCanManage(dto.organisationId, user);
    return this.teamsService.claim(id, dto.organisationId);
  }
}
