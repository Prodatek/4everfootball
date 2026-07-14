import { Module } from '@nestjs/common';
import { SearchModule } from './search.module';
import { TeamsModule } from '../teams/teams.module';
import { PlayersModule } from '../players/players.module';
import { CompetitionsModule } from '../competitions/competitions.module';
import { NewsModule } from '../news/news.module';
import { SearchReindexService } from './application/search-reindex.service';
import { SearchReindexController } from './presentation/search-reindex.controller';

@Module({
  imports: [
    SearchModule,
    TeamsModule,
    PlayersModule,
    CompetitionsModule,
    NewsModule,
  ],
  controllers: [SearchReindexController],
  providers: [SearchReindexService],
})
export class SearchAdminModule {}
