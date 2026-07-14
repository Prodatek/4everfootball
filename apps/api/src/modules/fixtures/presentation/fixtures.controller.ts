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
import { FixturesService } from '../application/fixtures.service';
import { CreateFixtureDto } from '../application/dto/create-fixture.dto';
import { UpdateFixtureDto } from '../application/dto/update-fixture.dto';
import { QueryFixturesDto } from '../application/dto/query-fixtures.dto';

@ApiTags('fixtures')
@Controller('fixtures')
export class FixturesController {
  constructor(private readonly fixturesService: FixturesService) {}

  @Public()
  @Get()
  list(@Query() query: QueryFixturesDto) {
    return this.fixturesService.list(query);
  }

  @Public()
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.fixturesService.getById(id);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post()
  create(@Body() dto: CreateFixtureDto) {
    return this.fixturesService.create(dto);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFixtureDto) {
    return this.fixturesService.update(id, dto);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.fixturesService.remove(id);
  }
}
