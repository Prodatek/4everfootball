import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { JwtAccessPayload } from '@4ef/shared';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UsersService } from '../application/users.service';
import { QueryUsersDto } from '../application/dto/query-users.dto';
import { UpdateUserRolesDto } from '../application/dto/update-user-roles.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser() user: JwtAccessPayload) {
    return this.usersService.getPublicProfile(user.sub);
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('admin/all')
  listForAdmin(@Query() query: QueryUsersDto) {
    return this.usersService.listForAdmin(query);
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id/roles')
  updateRoles(
    @Param('id') id: string,
    @Body() dto: UpdateUserRolesDto,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.usersService.updateRoles(id, dto, {
      id: user.sub,
      roles: user.roles,
    });
  }
}
