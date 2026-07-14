import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { JwtAccessPayload } from '@4ef/shared';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { MediaService } from '../application/media.service';
import { RequestUploadUrlDto } from '../application/dto/request-upload-url.dto';
import { ConfirmUploadDto } from '../application/dto/confirm-upload.dto';
import { QueryMediaDto } from '../application/dto/query-media.dto';

@ApiTags('media')
@ApiBearerAuth()
@Roles('SUPER_ADMIN', 'ADMIN', 'EDITOR')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  list(@Query() query: QueryMediaDto) {
    return this.mediaService.list(query);
  }

  @Post('upload-url')
  requestUploadUrl(@Body() dto: RequestUploadUrlDto) {
    return this.mediaService.requestUploadUrl(dto);
  }

  @Post()
  confirmUpload(
    @Body() dto: ConfirmUploadDto,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.mediaService.confirmUpload(dto, user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.mediaService.remove(id);
  }
}
