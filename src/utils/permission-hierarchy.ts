import type { Id } from '@/types/backend'
import type { PermissionNode } from './permission'
import { flattenPermissions } from './permission'

export interface HierarchyEntry {
  id: Id
  parentId: Id
  sort: number
}
export interface HierarchyChange {
  original: HierarchyEntry[]
  nodes: HierarchyEntry[]
}

export const isPermissionDirectory = (node: PermissionNode) =>
  node.permissionType === 1 &&
  ['Layout', '/index/index', 'index/index', 'index/index.vue'].includes(node.componentAddress)

export function canParentPermission(node: PermissionNode, parent?: PermissionNode): boolean {
  if (!parent) return node.permissionType === 1
  if (String(node.id) === String(parent.id)) return false
  if (
    flattenPermissions(node.children || []).some((child) => String(child.id) === String(parent.id))
  )
    return false
  return node.permissionType === 1 ? isPermissionDirectory(parent) : parent.permissionType === 1
}

export function hierarchyEntries(tree: PermissionNode[], ordered = false): HierarchyEntry[] {
  const visit = (nodes: PermissionNode[], parentId: Id): HierarchyEntry[] =>
    nodes.flatMap((node, index) => [
      {
        id: String(node.id),
        parentId: String(parentId),
        sort: ordered ? (index + 1) * 10 : node.sort
      },
      ...visit(node.children || [], node.id)
    ])
  return visit(tree, '0')
}

export function permissionFullPaths(tree: PermissionNode[]): Map<string, string> {
  const paths = new Map<string, string>()
  const visit = (nodes: PermissionNode[], parent = '') =>
    nodes.forEach((node) => {
      const raw = node.routerAddress || ''
      const path =
        raw.startsWith('/') || /^https?:\/\//.test(raw)
          ? raw
          : parent.replace(/\/$/, '') + '/' + raw
      paths.set(String(node.id), path)
      visit(node.children || [], path)
    })
  visit(tree)
  return paths
}
