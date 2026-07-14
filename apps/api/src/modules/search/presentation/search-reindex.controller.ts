import { Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { SearchReindexService } from '../application/search-reindex.service';

@ApiTags('search')
@ApiBearerAuth()
@Controller('search')
export class SearchReindexController {
  constructor(private readonly searchReindexService: SearchReindexService) {}

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post('reindex')
  reindex() {
    return this.searchReindexService.reindexAll();
  }
}
