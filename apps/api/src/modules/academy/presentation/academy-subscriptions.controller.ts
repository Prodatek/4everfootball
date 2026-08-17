import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { JwtAccessPayload } from '@4ef/shared';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { OrganisationsService } from '../../organisations/application/organisations.service';
import { AcademySubscriptionsService } from '../application/academy-subscriptions.service';
import { SubscribePlanDto } from '../application/dto/subscribe-plan.dto';

@ApiTags('academy-subscriptions')
@ApiBearerAuth()
@Controller('organisations/:organisationId/academy/subscription')
export class AcademySubscriptionsController {
  constructor(
    private readonly subscriptionsService: AcademySubscriptionsService,
    private readonly organisationsService: OrganisationsService,
  ) {}

  @Get()
  async current(
    @Param('organisationId') organisationId: string,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    await this.organisationsService.assertCanManage(organisationId, user);
    return this.subscriptionsService.currentForOrganisation(organisationId);
  }

  @Post()
  async subscribe(
    @Param('organisationId') organisationId: string,
    @Body() dto: SubscribePlanDto,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    await this.organisationsService.assertCanManage(organisationId, user);
    return this.subscriptionsService.subscribe({
      organisationId,
      planKey: dto.planKey,
      prepay: dto.prepay,
    });
  }
}
