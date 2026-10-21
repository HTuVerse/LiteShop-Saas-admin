import request from '@/utils/http'
import type { ResourceFolder } from '@/api/resource-library'

export type NestedResourceFolder = ResourceFolder & { parentId?: string | null; tenantId?: string }

export const createNestedResourceFolder = (name: string, parentId?: string, tenantId?: string) =>
  request.post<NestedResourceFolder>({
    url: '/file-upload/admin/resources/folders',
    data: { name, parentId, tenantId }
  })
