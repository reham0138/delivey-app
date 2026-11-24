import { BadRequestException } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import { UploadsService } from './uploads.service'

describe('UploadsService', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('rejects unsupported image signatures without contacting storage', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch')
    const service = new UploadsService({} as ConfigService)

    await expect(
      service.upload({
        buffer: Buffer.from('not an image'),
        mimetype: 'image/png',
        size: 12,
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('uploads supported images and returns the storage URL', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ secure_url: 'https://images.example.test/meal.png' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const config = {
      getOrThrow: (key: string) =>
        ({
          CLOUDINARY_CLOUD_NAME: 'test-cloud',
          CLOUDINARY_API_KEY: 'test-key',
          CLOUDINARY_API_SECRET: 'test-secret',
        })[key],
    } as unknown as ConfigService
    const service = new UploadsService(config)
    const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

    await expect(
      service.upload({ buffer, mimetype: 'image/png', size: buffer.length }),
    ).resolves.toEqual({ url: 'https://images.example.test/meal.png' })
    expect(fetch).toHaveBeenCalledWith(
      'https://api.cloudinary.com/v1_1/test-cloud/image/upload',
      expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
    )
  })
})
