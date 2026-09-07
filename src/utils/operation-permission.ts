export type RequiredPermission = string | readonly string[]

/** Exact codes: page access never implies permission to write. */
export function hasOperationPermission(
  granted: Iterable<string>,
  required: RequiredPermission,
  superAdmin = false
): boolean {
  const codes = typeof required === 'string' ? [required] : required
  if (!codes.length || codes.some((code) => !code?.trim())) return false
  if (superAdmin) return true
  const owned = new Set(granted)
  return codes.some((code) => owned.has(code))
}

interface PermissionRoute {
  meta?: { permissionCode?: unknown; authList?: unknown }
  children?: PermissionRoute[]
}
export function collectOperationPermissions(routes: PermissionRoute[]): string[] {
  const result = new Set<string>()
  const visit = (nodes: PermissionRoute[]) => {
    for (const node of nodes) {
      if (typeof node.meta?.permissionCode === 'string') result.add(node.meta.permissionCode)
      if (Array.isArray(node.meta?.authList)) {
        for (const item of node.meta.authList)
          if (typeof item?.authMark === 'string' && item.authMark) result.add(item.authMark)
      }
      visit(node.children || [])
    }
  }
  visit(routes)
  return [...result]
}
