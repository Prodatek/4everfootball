import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { JwtAccessPayload } from '@4ef/shared';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { OrganisationsService } from '../../organisations/application/organisations.service';
import { AcademyAttendanceService } from '../application/academy-attendance.service';
import { RecordAcademyAttendanceDto } from '../application/dto/record-academy-attendance.dto';

@ApiTags('academy-attendance')
@ApiBearerAuth()
@Controller('organisations/:organisationId/academy/attendance')
export class AcademyAttendanceController {
  constructor(
    private readonly attendanceService: AcademyAttendanceService,
    private readonly organisationsService: OrganisationsService,
  ) {}

  // Coach-accessible — this is the "four taps per player" action itself.
  @Post()
  async record(
    @Param('organisationId') organisationId: string,
    @Body() dto: RecordAcademyAttendanceDto,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    await this.organisationsService.assertCanCoach(organisationId, user);
    return this.attendanceService.record({
      organisationId,
      ageGroupId: dto.ageGroupId,
      playerId: dto.playerId,
      date: new Date(dto.date),
      status: dto.status,
      recordedById: user.sub,
      clientEventId: dto.clientEventId,
    });
  }

  @Get(':ageGroupId')
  async listForAgeGroup(
    @Param('organisationId') organisationId: string,
    @Param('ageGroupId') ageGroupId: string,
    @CurrentUser() user: JwtAccessPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    await this.organisationsService.assertCanCoach(organisationId, user);
    return this.attendanceService.listForAgeGroup(
      ageGroupId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }
}
