import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { JwtAccessPayload } from '@4ef/shared';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { SponsorEntitlementsService } from '../application/sponsor-entitlements.service';
import { GrantSponsorEntitlementDto } from '../application/dto/grant-sponsor-entitlement.dto';

// Platform-admin only, not the organisation's own admin — granting this is
// the internal record of a manual sales deal closing, not something an
// organiser does to themselves.
@ApiTags('sponsor-entitlements')
@ApiBearerAuth()
@Controller('sponsor-entitlements')
export class SponsorEntitlementsController {
  constructor(
    private readonly entitlementsService: SponsorEntitlementsService,
  ) {}

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post()
  grant(
    @Body() dto: GrantSponsorEntitlementDto,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.entitlementsService.grant({
      organisationId: dto.organisationId,
      competitionId: dto.competitionId,
      feature: dto.feature,
      grantedById: user.sub,
      note: dto.note,
    });
  }
}
