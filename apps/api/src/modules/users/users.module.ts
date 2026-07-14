import { Module } from '@nestjs/common';
import { USER_REPOSITORY } from './domain/user.repository';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';
import { UsersService } from './application/users.service';
import { UsersController } from './presentation/users.controller';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
  ],
  exports: [UsersService, USER_REPOSITORY],
})
export class UsersModule {}
