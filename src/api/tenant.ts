import request from '@/utils/http'
import type { Id, Page, Tenant } from '@/types/backend'

export const listTenants = (params: {
  currentPage: number
  pageSize: number
  keyword?: string
  status?: number
}) => request.get<Page<Tenant>>({ url: '/sys-tenant/page', params })
export const createTenant = (data: Partial<Tenant>) =>
  request.post<Tenant>({ url: '/sys-tenant', data })
export const updateTenant = (data: Tenant) => request.put<Tenant>({ url: '/sys-tenant', data })
export const setTenantStatus = (id: Id, status: number) =>
  request.put({ url: `/sys-tenant/${id}/status`, params: { status } })
export const enterTenant = (id: Id) => request.post<Tenant>({ url: `/sys-tenant/${id}/enter` })
export const exitTenant = () => request.post({ url: '/sys-tenant/exit' })
export const getUserStores = (userId: Id) => request.get<Id[]>({ url: `/sys-user-store/${userId}` })
export interface StoreAuthorization {
  userId: Id
  username: string
  nickname?: string
  phone?: string
  storeIds: Id[]
  defaultStoreId?: Id | null
  allStores: boolean
}
export const listStoreAuthorizations = (params: {
  currentPage: number
  pageSize: number
  keyword?: string
  storeId?: Id
  authorized?: boolean
}) => request.get<Page<StoreAuthorization>>({ url: '/sys-user-store/page', params })
export const assignUserStores = (userId: Id, storeIds: Id[], defaultStoreId?: Id) =>
  request.post({
    url: '/sys-user-store/assign',
    params: { userId, defaultStoreId },
    data: storeIds
  })
export const assignUserRoles = (userId: Id, roleIds: Id[]) =>
  request.post({ url: '/sys-user-role/assign', params: { userId }, data: roleIds })
