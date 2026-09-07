export type Id = string | number
export interface Tenant {
  id: Id
  tenantCode: string
  tenantName: string
  contactName?: string
  contactPhone?: string
  status: number
  expireTime?: string | null
  remark?: string
}
export interface TenantOption {
  tenantId: Id
  tenantCode: string
  tenantName: string
  roleCodes: string[]
  stores: StoreOption[]
  storeSelectionRequired: boolean
}
export interface StoreOption {
  storeId: Id
  storeName: string
  defaultStore: boolean
}
export interface TenantSelection {
  tenantSelectionRequired: true
  selectionTicket: string
  expiresInSeconds: number
  tenants: TenantOption[]
}
export interface BackendUser {
  id: Id
  username: string
  nickname?: string
  tenantId?: Id | null
  tenantCode?: string | null
  storeIds?: Id[]
  activeStoreId?: Id | null
  currentTenant?: Tenant | null
  roleCode: string[]
  token?: string
  [key: string]: unknown
}
export type AdminLoginResult = TenantSelection | BackendUser
export type WorkspaceOption = TenantOption
export interface Page<T> {
  records: T[]
  total: number
  current: number
  size: number
  pages?: number
}
