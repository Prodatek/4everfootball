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
import { Public } from '../../../common/decorators/public.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TeamsService } from '../application/teams.service';
import { CreateTeamDto } from '../application/dto/create-team.dto';
import { UpdateTeamDto } from '../application/dto/update-team.dto';
import { QueryTeamsDto } from '../application/dto/query-teams.dto';

@ApiTags('teams')
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

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
}
