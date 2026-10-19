import request from '@/utils/http'
import type { PermissionNode } from '@/utils/permission'
import type { Id } from '@/types/backend'

// 获取用户列表
export function fetchGetUserList(params: Api.SystemManage.UserSearchParams) {
  return request.get<Api.SystemManage.UserList>({
    url: '/user/list',
    data: null,
    params
  })
}

export interface UserRecipient {
  id: Id
  username: string
  nickname?: string
}
export function fetchUserRecipients(keyWord: string) {
  return request.get<Api.Common.PageResult<UserRecipient>>({
    url: '/user/recipients',
    params: { keyWord, pageSize: 20 }
  })
}

// 获取角色列表
export function fetchGetRoleList() {
  return request.get<Api.SystemManage.RoleListItem[]>({
    url: '/sys-role/list'
  })
}

//获取等级列表（分页）
export function fetchGetLevelList(params?: Api.SystemManage.LevelSearchParams) {
  return request.get<Api.SystemManage.LevelListItem[]>({
    url: '/user-level/list',
    params
  })
}

//获取启用的等级列表（下拉选择用）
export function fetchGetEnabledLevelList() {
  return request.get<Api.SystemManage.LevelListItem[]>({
    url: '/user-level/listEnabledLevels'
  })
}

// 添加等级
export function fetchAddLevel(data: Api.SystemManage.LevelFormData) {
  return request.post({
    url: '/user-level/add',
    data
  })
}

// 更新等级
export function fetchUpdateLevel(data: Api.SystemManage.LevelFormData) {
  return request.put({
    url: '/user-level/update',
    data
  })
}

// 删除等级
export function fetchDeleteLevel(id: number) {
  return request.del({
    url: `/user-level/${id}`
  })
}

// 更新等级状态
export function fetchUpdateLevelStatus(id: number, _status: number) {
  return request.put({
    url: `/user-level/editStatus/${id}`
  })
}

// 获取菜单列表
export function fetchGetMenuList() {
  return request.get<import('@/router/backend-menu').BackendMenu[]>({
    url: '/sys-permission/getCurrentUserMenus'
  })
}

// 获取权限树（菜单管理使用）
export function fetchGetPermissionTree() {
  return request.get<PermissionNode[]>({
    url: '/sys-permission/tree'
  })
}

// 添加权限
export function fetchAddPermission(data: Api.SystemManage.PermissionFormData) {
  return request.post({
    url: '/sys-permission/add',
    data
  })
}

// 更新权限
export function fetchUpdatePermission(data: Api.SystemManage.PermissionFormData) {
  return request.put({
    url: '/sys-permission/update',
    data
  })
}

export function fetchUpdatePermissionHierarchy(
  data: import('@/utils/permission-hierarchy').HierarchyChange
) {
  return request.put({ url: '/sys-permission/hierarchy', data })
}

// 删除权限
export function fetchDeletePermission(id: Id) {
  return request.del({
    url: `/sys-permission/${id}`
  })
}
