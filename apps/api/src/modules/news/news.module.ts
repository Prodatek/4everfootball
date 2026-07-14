import { Module } from '@nestjs/common';
import { SearchModule } from '../search/search.module';
import { NEWS_REPOSITORY } from './domain/news.repository';
import { PrismaNewsRepository } from './infrastructure/prisma-news.repository';
import { NewsService } from './application/news.service';
import { NewsController } from './presentation/news.controller';

@Module({
  imports: [SearchModule],
  controllers: [NewsController],
  providers: [
    NewsService,
    { provide: NEWS_REPOSITORY, useClass: PrismaNewsRepository },
  ],
  exports: [NewsService],
})
export class NewsModule {}
