import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { JwtAccessPayload } from '@4ef/shared';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { OrganisationsService } from '../../organisations/application/organisations.service';
import { InvoicesService } from '../application/invoices.service';
import { CreateInvoiceDto } from '../application/dto/create-invoice.dto';
import { RecordInvoicePaymentDto } from '../application/dto/record-invoice-payment.dto';

@ApiTags('invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly organisationsService: OrganisationsService,
  ) {}

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post()
  async create(
    @Body() dto: CreateInvoiceDto,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    await this.organisationsService.assertCanManage(dto.organisationId, user);
    return this.invoicesService.create(dto);
  }

  @Get('organisation/:organisationId')
  async listForOrganisation(
    @Param('organisationId') organisationId: string,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    await this.organisationsService.assertCanManage(organisationId, user);
    return this.invoicesService.listForOrganisation(organisationId);
  }

  @Get(':id')
  async getById(
    @Param('id') id: string,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    const invoice = await this.invoicesService.getById(id);
    await this.organisationsService.assertCanManage(
      invoice.organisationId,
      user,
    );
    return invoice;
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post(':id/issue')
  async issue(@Param('id') id: string, @CurrentUser() user: JwtAccessPayload) {
    const invoice = await this.invoicesService.getById(id);
    await this.organisationsService.assertCanManage(
      invoice.organisationId,
      user,
    );
    return this.invoicesService.issue(id);
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @CurrentUser() user: JwtAccessPayload) {
    const invoice = await this.invoicesService.getById(id);
    await this.organisationsService.assertCanManage(
      invoice.organisationId,
      user,
    );
    return this.invoicesService.cancel(id);
  }

  // Manual milestone recording (e.g. a bank-transferred deposit) — kept
  // distinct from the payments module's fulfilPayment() path since an
  // invoice can be paid in ad-hoc chunks that don't correspond 1:1 with a
  // single Payment record the way licence/registration payments do.
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post(':id/record-payment')
  async recordPayment(
    @Param('id') id: string,
    @Body() dto: RecordInvoicePaymentDto,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    const invoice = await this.invoicesService.getById(id);
    await this.organisationsService.assertCanManage(
      invoice.organisationId,
      user,
    );
    return this.invoicesService.recordPayment(id, dto.amountKobo);
  }

  // §5 D1: "downloadable PDFs" — any org member who can already read this
  // invoice can also download it.
  @Post(':id/pdf')
  async pdf(@Param('id') id: string, @CurrentUser() user: JwtAccessPayload) {
    const invoice = await this.invoicesService.getById(id);
    await this.organisationsService.assertCanManage(
      invoice.organisationId,
      user,
    );
    return this.invoicesService.generateAndUploadPdf(id);
  }
}
