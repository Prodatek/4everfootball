import { Module } from '@nestjs/common';
import { MEDIA_REPOSITORY } from './domain/media.repository';
import { PrismaMediaRepository } from './infrastructure/prisma-media.repository';
import { S3StorageService } from './infrastructure/s3-storage.service';
import { MediaService } from './application/media.service';
import { MediaController } from './presentation/media.controller';

@Module({
  controllers: [MediaController],
  providers: [
    MediaService,
    S3StorageService,
    { provide: MEDIA_REPOSITORY, useClass: PrismaMediaRepository },
  ],
  exports: [MediaService],
})
export class MediaModule {}
