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
import type { JwtAccessPayload } from '@4ef/shared';
import { Public } from '../../../common/decorators/public.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { NewsService } from '../application/news.service';
import { CreateNewsDto } from '../application/dto/create-news.dto';
import { UpdateNewsDto } from '../application/dto/update-news.dto';
import { QueryNewsDto } from '../application/dto/query-news.dto';

@ApiTags('news')
@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Public()
  @Get()
  list(@Query() query: QueryNewsDto) {
    return this.newsService.list(query);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN', 'EDITOR')
  @Get('admin/all')
  listForAdmin(@Query() query: QueryNewsDto) {
    return this.newsService.listForAdmin(query);
  }

  @Public()
  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.newsService.getPublishedBySlug(slug);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN', 'EDITOR')
  @Post()
  create(@Body() dto: CreateNewsDto, @CurrentUser() user: JwtAccessPayload) {
    return this.newsService.create(dto, user.sub);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN', 'EDITOR')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateNewsDto) {
    return this.newsService.update(id, dto);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN', 'EDITOR')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.newsService.remove(id);
  }
}
