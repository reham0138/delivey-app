import { apiRequest, ApiError } from '@/shared/api/client'

export const IMAGE_TOO_LARGE_MESSAGE = 'The image is too large. Maximum size is 5 MB.'

export const uploadService = {
  async upload(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    try {
      const result = await apiRequest<{ url: string }>('/uploads', {
        method: 'POST',
        formData,
      })
      return result.url
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 413) {
        throw new Error(IMAGE_TOO_LARGE_MESSAGE, { cause: error })
      }
      throw error
    }
  },
}
