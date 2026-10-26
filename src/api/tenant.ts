import request from '@/utils/http'
import type { Id, Page, Tenant } from '@/types/backend'

export type TenantWithAccess = Tenant & { accessAvailable?: boolean }
export const listTenants = (params: {
  currentPage: number
  pageSize: number
  keyword?: string
  status?: number
}) => request.get<Page<TenantWithAccess>>({ url: '/sys-tenant/page', params })
export interface PublishedPlanOption {
  planId: Id
  planVersionId: Id
  planCode: string
  planName: string
  description?: string
  versionNo: number
  monthlyPrice?: number | null
  yearlyPrice?: number | null
  currency?: string
}
export const listPublishedPlanOptions = () =>
  request.get<PublishedPlanOption[]>({ url: '/saas/admin/plan-options' })
export interface TenantCreateRequest extends Pick<Tenant, 'tenantCode' | 'tenantName'> {
  contactName?: string
  contactPhone?: string
  remark?: string
  status?: number
  planVersionId: Id
  billingCycle: 'MONTHLY' | 'YEARLY'
}
export const createTenant = (data: TenantCreateRequest) =>
  request.post<Tenant>({ url: '/sys-tenant', data })
export type TenantProfileUpdate = Pick<Tenant, 'id' | 'tenantCode' | 'tenantName'> &
  Partial<Pick<Tenant, 'contactName' | 'contactPhone' | 'remark'>>
export const updateTenant = (data: TenantProfileUpdate) =>
  request.put<Tenant>({ url: '/sys-tenant', data })
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
