import { Controller, Get, Param } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../../../common/decorators/public.decorator";
import { StandingsService } from "../application/standings.service";

@ApiTags("standings")
@Controller("competitions")
export class StandingsController {
  constructor(private readonly standingsService: StandingsService) {}

  @Public()
  @Get(":competitionId/table")
  getTable(@Param("competitionId") competitionId: string) {
    return this.standingsService.getTable(competitionId);
  }
}
