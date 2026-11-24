import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger'
import { Roles } from '../../common/decorators/roles.decorator'
import { Role } from '../../common/enums'
import { UploadsService } from './uploads.service'

const MAX_FILE_SIZE = 5 * 1024 * 1024

@ApiTags('uploads')
@ApiBearerAuth('bearer')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Roles(Role.Restaurant, Role.Admin)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }))
  upload(
    @UploadedFile()
    file: { buffer: Buffer; mimetype: string; size: number } | undefined,
  ): Promise<{ url: string }> {
    if (!file || file.size === 0) throw new BadRequestException('An image file is required.')
    return this.uploadsService.upload(file)
  }
}
