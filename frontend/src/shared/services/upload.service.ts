import { apiRequest } from '@/shared/api/client'

export const uploadService = {
  async upload(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    const result = await apiRequest<{ url: string }>('/uploads', {
      method: 'POST',
      formData,
    })
    return result.url
  },
}
