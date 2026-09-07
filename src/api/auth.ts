import request from '@/utils/http'
import type { AdminLoginResult, BackendUser, Id, WorkspaceOption } from '@/types/backend'

export function fetchLogin(params: {
  account: string
  password: string
  captchaId?: string
  captchaCode?: string
}) {
  return request.post<AdminLoginResult>({ url: '/user/admin/Login', params, anonymous: true })
}
export function fetchVerifyCodeLogin(params: {
  account: string
  verifyCode: string
  captchaId?: string
  captchaCode?: string
}) {
  return request.post<AdminLoginResult>({
    url: '/user/admin/phoneOrEmailVerifyCodeLogin',
    params,
    anonymous: true
  })
}
export function selectAdminTenant(selectionTicket: string, tenantId: Id, storeId?: Id) {
  return request.post<BackendUser>({
    url: '/user/admin/select-tenant',
    params: { selectionTicket, tenantId, storeId },
    anonymous: true
  })
}
export function fetchAdminWorkspaces() {
  return request.get<WorkspaceOption[]>({ url: '/user/admin/workspaces' })
}
export function switchAdminWorkspace(tenantId: Id, storeId?: Id) {
  return request.post<BackendUser>({
    url: '/user/admin/switch-workspace',
    params: { tenantId, storeId }
  })
}
export function sendVerifyCode(account: string) {
  return request.post({ url: '/msg/sendVerifyCode', params: { account, type: 1 }, anonymous: true })
}
export function normalizeUser(user: BackendUser): Api.Auth.UserInfo {
  return {
    ...user,
    userId: user.id,
    userName: user.nickname || user.username,
    roles: user.roleCode || [],
    buttons: []
  } as unknown as Api.Auth.UserInfo
}
export async function fetchGetUserInfo() {
  return normalizeUser(await request.get<BackendUser>({ url: '/user/getUserBasicInfo' }))
}
export function fetchLogout() {
  return request.post({ url: '/user/logout', showErrorMessage: false })
}
export function updateProfile(data: Record<string, unknown>) {
  return request.post<BackendUser>({ url: '/user/updateUserInfo', data })
}
