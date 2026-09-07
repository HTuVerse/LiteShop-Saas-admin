import type { AppRouteRecord } from '@/types/router'
import type { BackendUser } from '@/types/backend'
import type { Id } from '@/types/backend'

export const MenuScope = { ALL: 0, PLATFORM: 1, TENANT: 2 } as const
export type MenuScope = (typeof MenuScope)[keyof typeof MenuScope]
export const menuScopeLabels: Record<MenuScope, string> = {
  0: '平台和租户',
  1: '仅平台',
  2: '仅租户'
}
export interface BackendMenu {
  menuScope?: MenuScope | 'ALL' | 'PLATFORM' | 'TENANT' | '0' | '1' | '2' | null
  id?: Id
  parentId?: Id
  path?: string
  name?: string
  component?: string
  permissionCode?: string
  permissionType?: string | number
  status?: string | number
  sort?: number
  meta?: Record<string, any>
  children?: BackendMenu[]
}
const aliases: Record<string, string> = {
  Layout: '/index/index',
  'system/menu/index': '/system/menu',
  'restaurant/store/index': '/dish/store',
  'restaurant/category/index': '/dish/category',
  'restaurant/dish/index': '/dish/menu',
  'restaurant/table/index': '/dish/table',
  'restaurant/order/index': '/dish/order',
  'restaurant/printer/index': '/device/printer',
  'restaurant/analysis/index': '/dashboard/restaurantAnalyze',
  'marketing/coupon/index': '/activity/coupon',
  'marketing/lottery/index': '/activity/lottery',
  'config/basic/index': '/config/miniapp',
  'device/printer/template': '/device/template',
  'cashier/index': '/cashier/workspace',
  'cashier/directCashier': '/cashier/workspace',
  'cashier/directCashier/index': '/cashier/workspace'
}
const icons: Record<string, string> = {
  Platform: 'ri:building-line',
  OfficeBuilding: 'ri:building-2-line',
  Setting: 'ri:settings-3-line',
  User: 'ri:user-line',
  UserFilled: 'ri:group-line',
  Connection: 'ri:links-line',
  KnifeFork: 'ri:restaurant-line',
  Shop: 'ri:store-2-line',
  Menu: 'ri:list-check',
  Dish: 'ri:restaurant-2-line',
  Grid: 'ri:layout-grid-line',
  List: 'ri:file-list-3-line',
  Printer: 'ri:printer-line',
  DataAnalysis: 'ri:bar-chart-line',
  Present: 'ri:gift-line',
  Ticket: 'ri:coupon-line',
  Trophy: 'ri:trophy-line',
  Tools: 'ri:settings-line',
  Operation: 'ri:settings-4-line',
  Picture: 'ri:image-line'
}
export function componentPath(value = ''): string {
  const normalized = value
    .replace(/^\/?(?:src\/)?views\//, '')
    .replace(/^\/+/, '')
    .replace(/\.vue$/, '')
  return aliases[normalized] || '/' + normalized
}
const enabled = (status: unknown) =>
  status === undefined || [1, '1', '正常', 'NORMAL'].includes(status as string | number)
const menuType = (type: unknown) =>
  type === undefined || [1, '1', '菜单', 'MENU'].includes(type as string | number)

/** Legacy menus retain an inferred scope until the database migration is applied. */
export function resolveMenuScope(node: BackendMenu): MenuScope {
  // Accept old API/cache values during rollout; all new writes use numeric codes.
  const raw = node.menuScope
  if (raw === 0 || raw === '0' || raw === 'ALL') return MenuScope.ALL
  if (raw === 1 || raw === '1' || raw === 'PLATFORM') return MenuScope.PLATFORM
  if (raw === 2 || raw === '2' || raw === 'TENANT') return MenuScope.TENANT
  const component = componentPath(node.component).replace(/\/index$/, '')
  if (['/index', '/dashboard/console', '/system/user-center'].includes(component))
    return MenuScope.ALL
  if (node.permissionCode?.startsWith('platform:') || component.startsWith('/platform/'))
    return MenuScope.PLATFORM
  return MenuScope.TENANT
}

export function adaptMenus(
  items: BackendMenu[],
  user: BackendUser,
  platformMode: boolean
): AppRouteRecord[] {
  const superAdmin = user.roleCode?.includes('SUPER_ADMIN')
  const visit = (nodes: BackendMenu[], parent = ''): AppRouteRecord[] =>
    nodes.flatMap((node) => {
      if (!enabled(node.status) || !menuType(node.permissionType)) return []
      const component = componentPath(node.component)
      const directory = component === '/index/index'
      const scope = resolveMenuScope(node)
      if (!directory) {
        if (
          !superAdmin &&
          (scope === MenuScope.PLATFORM ||
            node.permissionCode?.startsWith('platform:') ||
            component.startsWith('/platform/'))
        )
          return []
        if (platformMode ? scope === MenuScope.TENANT : scope === MenuScope.PLATFORM) return []
      }
      const rawPath = node.path || ''
      const path = rawPath.startsWith('/') ? rawPath : (parent + '/' + rawPath).replace(/\/+/g, '/')
      if (!path || path === '/') return []
      const children = visit(node.children || [], path)
      if (component === '/index/index' && children.length === 0) return []
      const buttons = (node.children || []).filter(
        (child) => !menuType(child.permissionType) && enabled(child.status)
      )
      const route: AppRouteRecord = {
        id: node.id,
        path,
        name: 'backend:' + (node.id ?? path),
        component,
        meta: {
          ...node.meta,
          permissionCode: node.permissionCode,
          title: node.meta?.title || node.name || path,
          icon: icons[node.meta?.icon] || node.meta?.icon || 'ri:apps-line',
          isHide: [true, 1, '1'].includes(node.meta?.isHide),
          isIframe: [true, 1, '1'].includes(node.meta?.isIframe),
          keepAlive: false,
          authList: buttons.map((button) => ({
            title: button.meta?.title || '',
            authMark: button.permissionCode || ''
          }))
        }
      }
      if (children.length) route.children = children
      return [route]
    })
  return visit(items)
}
