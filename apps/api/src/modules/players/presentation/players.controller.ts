import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { PlayersService } from '../application/players.service';
import { CreatePlayerDto } from '../application/dto/create-player.dto';
import { UpdatePlayerDto } from '../application/dto/update-player.dto';
import { QueryPlayersDto } from '../application/dto/query-players.dto';

@ApiTags('players')
@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Public()
  @Get()
  list(@Query() query: QueryPlayersDto) {
    return this.playersService.list(query);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('admin/all')
  listForAdmin(@Query() query: QueryPlayersDto) {
    return this.playersService.listForAdmin(query);
  }

  @Public()
  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.playersService.getBySlug(slug);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post()
  create(@Body() dto: CreatePlayerDto) {
    return this.playersService.create(dto);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePlayerDto) {
    return this.playersService.update(id, dto);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.playersService.remove(id);
  }
}
