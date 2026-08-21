import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { JwtAccessPayload } from '@4ef/shared';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
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

  // §5 F5: the organiser's own "we chose a plan, awaiting confirmation" view.
  @Get('pending')
  async pending(
    @Param('organisationId') organisationId: string,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    await this.organisationsService.assertCanManage(organisationId, user);
    return this.subscriptionsService.pendingForOrganisation(organisationId);
  }

  @Get('history')
  async history(
    @Param('organisationId') organisationId: string,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    await this.organisationsService.assertCanManage(organisationId, user);
    return this.subscriptionsService.listForOrganisation(organisationId);
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

// §5 D2, internal-only: every organisation's academy plan choice still
// awaiting a platform admin's payment confirmation, and the action that
// confirms it. Deliberately not org-scoped (assertCanManage) — this data,
// like every other Phase D2 screen, spans every organisation on the
// platform, so it's gated to SUPER_ADMIN the same way revenue/webhook data
// already is.
@ApiTags('academy-subscriptions')
@ApiBearerAuth()
@Roles('SUPER_ADMIN')
@Controller('academy/subscription-requests')
export class AcademySubscriptionRequestsController {
  constructor(
    private readonly subscriptionsService: AcademySubscriptionsService,
  ) {}

  @Get()
  async listPending() {
    return this.subscriptionsService.listPendingRequests();
  }

  @Post(':id/confirm')
  async confirm(@Param('id') id: string) {
    return this.subscriptionsService.confirmAndActivate(id);
  }
}
