import request from '@/utils/http'
import type { UploadRequestOptions } from 'element-plus'
export async function uploadImage(file: File) {
  const data = new FormData()
  data.append('file', file)
  return request.post<{ url: string }>({ url: '/file-upload/upload/image', data })
}

export interface UploadedFile {
  id: string | number
  originalFileName: string
  size: number
  contentType?: string
  url: string
  storageType: string
}

export async function uploadAttachment(file: File) {
  const data = new FormData()
  data.append('file', file)
  return request.post<UploadedFile>({ url: '/file-upload/upload/file', data })
}
export async function uploadRequest(options: UploadRequestOptions) {
  // Element Plus invokes onSuccess/onError from the returned promise.
  const data = await uploadImage(options.file)
  return { code: 200, data }
}
