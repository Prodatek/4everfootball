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
import { CompetitionsService } from '../application/competitions.service';
import { CreateCompetitionDto } from '../application/dto/create-competition.dto';
import { UpdateCompetitionDto } from '../application/dto/update-competition.dto';
import { QueryCompetitionsDto } from '../application/dto/query-competitions.dto';
import { AddEntryDto } from '../application/dto/add-entry.dto';

@ApiTags('competitions')
@Controller('competitions')
export class CompetitionsController {
  constructor(private readonly competitionsService: CompetitionsService) {}

  @Public()
  @Get()
  list(@Query() query: QueryCompetitionsDto) {
    return this.competitionsService.list(query);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('admin/all')
  listForAdmin(@Query() query: QueryCompetitionsDto) {
    return this.competitionsService.listForAdmin(query);
  }

  @Public()
  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.competitionsService.getBySlug(slug);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post()
  create(@Body() dto: CreateCompetitionDto) {
    return this.competitionsService.create(dto);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCompetitionDto) {
    return this.competitionsService.update(id, dto);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.competitionsService.remove(id);
  }

  @Public()
  @Get(':id/teams')
  listEntries(@Param('id') id: string) {
    return this.competitionsService.listEntries(id);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post(':id/teams')
  addEntry(@Param('id') id: string, @Body() dto: AddEntryDto) {
    return this.competitionsService.addEntry(id, dto.teamId);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Delete(':id/teams/:teamId')
  removeEntry(@Param('id') id: string, @Param('teamId') teamId: string) {
    return this.competitionsService.removeEntry(id, teamId);
  }
}
