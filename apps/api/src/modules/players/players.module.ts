import { Module } from '@nestjs/common';
import { TeamsModule } from '../teams/teams.module';
import { PLAYER_REPOSITORY } from './domain/player.repository';
import { PrismaPlayerRepository } from './infrastructure/prisma-player.repository';
import { PlayersService } from './application/players.service';
import { PlayersController } from './presentation/players.controller';

@Module({
  imports: [TeamsModule],
  controllers: [PlayersController],
  providers: [
    PlayersService,
    { provide: PLAYER_REPOSITORY, useClass: PrismaPlayerRepository },
  ],
  exports: [PlayersService],
})
export class PlayersModule {}
