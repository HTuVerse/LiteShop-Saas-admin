import request from '@/utils/http'

export interface ResourceFile {
  id: string
  originalFileName: string
  size: number
  contentType?: string
  url: string | null
  storageType: number
  storageKey?: string
  bucket?: string
  visibility?: 'PUBLIC' | 'PRIVATE'
  tenantId?: string
  uploaderId?: string
  folderId?: string
  createdAt?: string
}

export interface ResourceFolder {
  id: string
  name: string
}

export interface ResourceQuery {
  currentPage: number
  pageSize: number
  keyword?: string
  type?: 'image' | 'file'
  visibility?: 'PUBLIC' | 'PRIVATE'
  tenantId?: string
  uploaderId?: string
  folderId?: string
}

export interface ResourcePage {
  records: ResourceFile[]
  total: number
  current: number
  size: number
}

export interface ResourceAccess {
  visibility: 'PUBLIC' | 'PRIVATE'
  url: string
  expiresAt: string | null
}

const base = '/file-upload/admin/resources'

export const listResources = (params: ResourceQuery) =>
  request.get<ResourcePage>({ url: base, params })

export const listResourceFolders = () =>
  request.get<ResourceFolder[]>({ url: `${base}/folders` })

export const createResourceFolder = (name: string) =>
  request.post<ResourceFolder>({ url: `${base}/folders`, data: { name } })

export const renameResourceFolder = (id: string, name: string) =>
  request.put<ResourceFolder>({ url: `${base}/folders/${id}`, data: { name } })

export const deleteResourceFolder = (id: string) =>
  request.del({ url: `${base}/folders/${id}` })

export const uploadResources = (files: File[], folderId?: string, visibility: 'PUBLIC' | 'PRIVATE' = 'PUBLIC',
  onProgress?: (percent: number) => void) => {
  const data = new FormData()
  files.forEach((file) => data.append('files', file))
  if (folderId) data.append('folderId', folderId)
  data.append('visibility', visibility)
  return request.post<ResourceFile[]>({ url: `${base}/upload`, data, timeout: 120000,
    onUploadProgress: (event) => { if (event.total) onProgress?.(Math.round(event.loaded / event.total * 100)) }
  })
}

export const renameResource = (id: string, name: string) =>
  request.put<ResourceFile>({ url: `${base}/${id}/name`, data: { name } })

export const moveResources = (ids: string[], folderId: string | null) =>
  request.put({ url: `${base}/move`, data: { ids, folderId } })

export const deleteResources = (ids: string[]) =>
  request.post({ url: `${base}/delete`, data: { ids } })

export const downloadResource = (id: string) =>
  request.get<Blob>({ url: `${base}/${id}/download`, responseType: 'blob', timeout: 120000 })

/** 私有资源按次授权；本地私有文件由已有鉴权下载接口取 Blob。 */
export const getResourceAccessUrl = async (id: string) => {
  const access = await request.get<ResourceAccess>({ url: `/file-upload/resources/${id}/access` })
  return access.visibility === 'PRIVATE' && !access.expiresAt ? null : access.url
}

export const setResourceVisibility = (id: string, visibility: 'PUBLIC' | 'PRIVATE') =>
  request.put<ResourceFile>({ url: `${base}/${id}/visibility`, data: { visibility } })

export const getResourceDetail = (id: string) =>
  request.get<ResourceFile>({ url: `${base}/${id}` })
