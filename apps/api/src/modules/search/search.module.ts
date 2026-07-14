import { Module } from '@nestjs/common';
import { SearchIndexService } from './infrastructure/search-index.service';
import { SearchService } from './application/search.service';
import { SearchController } from './presentation/search.controller';

@Module({
  controllers: [SearchController],
  providers: [SearchService, SearchIndexService],
  exports: [SearchService],
})
export class SearchModule {}
