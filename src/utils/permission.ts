import type { Id } from '@/types/backend'
import type { BackendMenu } from '@/router/backend-menu'

export type PermissionTypeCode = 1 | 2 | 3
export interface PermissionNode extends Omit<BackendMenu, 'children' | 'id'> {
  id: Id
  parentId: Id
  permissionName: string
  permissionCode: string
  permissionType: PermissionTypeCode
  routerAddress: string
  componentAddress: string
  icon: string
  status: 0 | 1
  sort: number
  isIframe: boolean
  keepAlive: boolean
  isHide: boolean
  link: string | null
  createTime?: string
  updateTime?: string
  children?: PermissionNode[]
}
const isOne = (value: unknown) =>
  value === true || value === 1 || value === '1' || value === '是' || value === 'YES'
export function permissionTypeCode(value: unknown): PermissionTypeCode {
  if ([2, '2', '按钮', 'BUTTON'].includes(value as string | number)) return 2
  if ([3, '3', 'API'].includes(value as string | number)) return 3
  return 1
}
export function permissionStatusCode(value: unknown): 0 | 1 {
  return [0, '0', '禁用', 'DISABLED', false].includes(value as string | number | boolean) ? 0 : 1
}
export function normalizePermissionTree(
  source: Array<BackendMenu & Record<string, any>>,
  fallbackParent: Id = '0'
): PermissionNode[] {
  return (source || []).map((item) => {
    const id = item.id == null ? '' : String(item.id)
    return {
      ...item,
      id,
      parentId: item.parentId == null ? fallbackParent : String(item.parentId),
      permissionName: item.permissionName || item.meta?.title || item.name || '',
      permissionCode: item.permissionCode || '',
      permissionType: permissionTypeCode(item.permissionType),
      routerAddress: item.routerAddress ?? item.path ?? '',
      componentAddress: item.componentAddress ?? item.component ?? '',
      icon: item.icon ?? item.meta?.icon ?? '',
      status: permissionStatusCode(item.status),
      sort: Number(item.sort || 0),
      isIframe: item.isIframe == null ? isOne(item.meta?.isIframe) : isOne(item.isIframe),
      keepAlive: item.keepAlive == null ? isOne(item.meta?.keepAlive) : isOne(item.keepAlive),
      isHide: item.isHide == null ? isOne(item.meta?.isHide) : isOne(item.isHide),
      link: item.link ?? item.meta?.link ?? null,
      children: normalizePermissionTree(item.children || [], id)
    }
  })
}
export function filterPermissionTree(nodes: PermissionNode[], keyword: string): PermissionNode[] {
  const needle = keyword.trim().toLowerCase()
  if (!needle) return nodes
  return nodes.flatMap((node) => {
    const children = filterPermissionTree(node.children || [], needle)
    const haystack = [
      node.permissionName,
      node.permissionCode,
      node.routerAddress,
      node.componentAddress
    ].join(' ').toLowerCase()
    return haystack.includes(needle) || children.length ? [{ ...node, children }] : []
  })
}
export function flattenPermissions(nodes: PermissionNode[]): PermissionNode[] {
  return nodes.flatMap((node) => [node, ...flattenPermissions(node.children || [])])
}
