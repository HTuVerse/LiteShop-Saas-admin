import request from '@/utils/http'
import type { Id, Tenant } from '@/types/backend'
export interface LevelScheme {
  id: Id
  tenantId?: Id | null
  name: string
  description?: string
  isActive: number
  isDefault: number
  status: number
  sourceTemplateId?: Id
}
export interface MemberLevel {
  id?: Id
  tenantId?: Id | null
  schemeId: Id
  levelCode: number
  levelName: string
  requiredExp: number
  benefits?: string
  description?: string
  icon?: string
  sort: number
  status: number
}
export const listLevelSchemes = () =>
  request.get<{ schemes: LevelScheme[]; templates: LevelScheme[] }>({ url: '/user-level/schemes' })
export const listSchemeLevels = (id: Id) =>
  request.get<MemberLevel[]>({ url: `/user-level/schemes/${id}/levels` })
export const createLevelScheme = (data: { name: string; description?: string; copyFromId?: Id }) =>
  request.post<LevelScheme>({ url: '/user-level/schemes', data })
export const renameLevelScheme = (id: Id, data: { name: string; description?: string }) =>
  request.put({ url: `/user-level/schemes/${id}`, data })
export const activateLevelScheme = (id: Id) =>
  request.post({ url: `/user-level/schemes/${id}/activate` })
export const defaultLevelTemplate = (id: Id) =>
  request.post({ url: `/user-level/schemes/${id}/default` })
export const useDefaultLevelTemplate = () =>
  request.post<LevelScheme>({ url: '/user-level/schemes/use-default' })
export const useLevelTemplate = (id: Id) =>
  request.post<LevelScheme>({ url: `/user-level/schemes/${id}/use-template` })
export const listLevelTemplateTenants = (id: Id) =>
  request.get<Tenant[]>({ url: `/user-level/schemes/${id}/tenants` })
export const assignLevelTemplateTenants = (id: Id, tenantIds: Id[]) =>
  request.put({ url: `/user-level/schemes/${id}/tenants`, data: tenantIds })
export const deleteLevelScheme = (id: Id) => request.del({ url: `/user-level/schemes/${id}` })
export const saveMemberLevel = (data: MemberLevel) =>
  data.id
    ? request.put({ url: '/user-level/update', data })
    : request.post({ url: '/user-level/add', data })
export const deleteMemberLevel = (id: Id) => request.del({ url: `/user-level/${id}` })
export const toggleMemberLevel = (id: Id) => request.put({ url: `/user-level/editStatus/${id}` })
