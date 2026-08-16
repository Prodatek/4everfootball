import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { JwtAccessPayload } from '@4ef/shared';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { OrganisationsService } from '../application/organisations.service';
import { CreateOrganisationDto } from '../application/dto/create-organisation.dto';

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

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.organisationsService.getById(id);
  }
}
