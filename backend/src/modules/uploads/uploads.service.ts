import { BadGatewayException, BadRequestException, Injectable, Logger } from '@nestjs/common'
import { createHash } from 'node:crypto'
import { ConfigService } from '@nestjs/config'

interface UploadFile {
  buffer: Buffer
  mimetype: string
  size: number
}

interface CloudinaryResponse {
  secure_url?: string
  error?: { message?: string }
}

const MAX_FILE_SIZE = 5 * 1024 * 1024
const MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function isSupportedImage(file: UploadFile): boolean {
  if (!MIME_TYPES.has(file.mimetype) || file.size > MAX_FILE_SIZE) return false
  const bytes = file.buffer
  if (file.mimetype === 'image/jpeg') {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  }
  if (file.mimetype === 'image/png') {
    return bytes.length >= 8 &&
      bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  }
  return bytes.length >= 12 &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP'
}

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name)

  constructor(private readonly config: ConfigService) {}

  async upload(file: UploadFile): Promise<{ url: string }> {
    if (!isSupportedImage(file)) {
      throw new BadRequestException('Only JPEG, PNG and WebP images up to 5 MB are supported.')
    }

    const cloudName = this.config.getOrThrow<string>('CLOUDINARY_CLOUD_NAME')
    const apiKey = this.config.getOrThrow<string>('CLOUDINARY_API_KEY')
    const apiSecret = this.config.getOrThrow<string>('CLOUDINARY_API_SECRET')
    const timestamp = Math.floor(Date.now() / 1000)
    const signature = createHash('sha1')
      .update(`timestamp=${timestamp}${apiSecret}`)
      .digest('hex')
    const formData = new FormData()
    const fileBytes = new Uint8Array(file.buffer.length)
    fileBytes.set(file.buffer)
    formData.append('file', new Blob([fileBytes.buffer], { type: file.mimetype }), 'upload')
    formData.append('api_key', apiKey)
    formData.append('timestamp', String(timestamp))
    formData.append('signature', signature)

    let response: Response
    try {
      response = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
        { method: 'POST', body: formData },
      )
    } catch {
      throw new BadGatewayException('Image storage is unavailable. Please try again.')
    }

    const result = (await response.json().catch(() => null)) as CloudinaryResponse | null
    if (!response.ok || !result?.secure_url) {
      this.logger.warn(
        `Cloudinary upload failed: status=${response.status} error=${result?.error?.message ?? 'none'}`,
      )
      throw new BadGatewayException('Image upload failed. Please try again.')
    }
    return { url: result.secure_url }
  }
}
