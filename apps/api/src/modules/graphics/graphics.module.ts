import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { MediaPacksModule } from '../media-packs/media-packs.module';
import { OrganisationsModule } from '../organisations/organisations.module';
import { GraphicsService } from './application/graphics.service';
import { GraphicsWorkerService } from './application/graphics-worker.service';
import { SatoriRendererService } from './infrastructure/satori-renderer.service';
import { ImageEmbedService } from './infrastructure/image-embed.service';
import { GraphicsController } from './presentation/graphics.controller';

// Deliberately does NOT import StandingsModule/StatsModule — StatsModule
// depends on MatchesModule, and MatchesModule needs to import THIS module
// for its GOAL/FULL_TIME hooks (see MatchEventsService). Importing Stats
// here would close that into a cycle. The calendar-driven triggers that
// genuinely need Standings/Stats live in the separate
// GraphicsTriggersModule instead, which nothing else imports, so it's free
// to sit above this cycle-risk entirely.
@Module({
  imports: [MediaModule, MediaPacksModule, OrganisationsModule],
  controllers: [GraphicsController],
  providers: [
    GraphicsService,
    GraphicsWorkerService,
    SatoriRendererService,
    ImageEmbedService,
  ],
  exports: [GraphicsService],
})
export class GraphicsModule {}
