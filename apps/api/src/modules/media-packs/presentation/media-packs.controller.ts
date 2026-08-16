import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { JwtAccessPayload } from '@4ef/shared';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { OrganisationsService } from '../../organisations/application/organisations.service';
import { MediaPacksService } from '../application/media-packs.service';
import { PurchaseMediaPackDto } from '../application/dto/purchase-media-pack.dto';

@ApiTags('media-packs')
@ApiBearerAuth()
@Controller('media-packs')
export class MediaPacksController {
  constructor(
    private readonly mediaPacksService: MediaPacksService,
    private readonly organisationsService: OrganisationsService,
  ) {}

  @Post('purchase')
  async purchase(
    @Body() dto: PurchaseMediaPackDto,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    await this.organisationsService.assertCanManage(dto.organisationId, user);

    const { payment, authorizationUrl } = await this.mediaPacksService.purchase(
      {
        organisationId: dto.organisationId,
        competitionId: dto.competitionId,
        provider: dto.provider,
        payerEmail: dto.payerEmail,
      },
    );

    return { payment, authorizationUrl };
  }
}
