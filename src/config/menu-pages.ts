import { componentPath, resolveMenuScope } from '@/router/backend-menu'

/** Editor suggestions only. These entries NEVER register routes or populate the sidebar. */
const labels: Record<string, [string, string, string]> = {
  'dashboard/console': ['工作台', '/dashboard/console', 'common:console'],
  'platform/level-template': [
    '平台等级体系',
    '/platform/level-template',
    'platform:level-template'
  ],
  'platform/tenant': ['租户管理', '/platform/tenant', 'platform:tenant'],
  'platform/saas': ['套餐与权益', '/platform/saas', 'platform:saas'],
  'config/website': ['网站配置', '/platform/website', 'platform:website'],
  'system/menu': ['菜单管理', '/platform/permission', 'platform:permission'],
  'system/user': ['用户管理', '/system/user', 'system:user'],
  'system/role': ['角色管理', '/system/role', 'system:role'],
  'system/audit': ['操作审计日志', '/system/audit', 'system:audit'],
  'system/user-store': ['门店授权', '/system/user-store', 'system:user-store'],
  'system/user-center': ['个人中心', '/system/user-center', 'common:profile'],
  'system/level': ['会员等级', '/system/level', 'system:level'],
  'dish/store': ['门店管理', '/restaurant/store', 'restaurant:store'],
  'dish/category': ['菜品分类', '/restaurant/category', 'restaurant:category'],
  'dish/menu': ['菜品管理', '/restaurant/dish', 'restaurant:dish'],
  'dish/table': ['餐桌管理', '/restaurant/table', 'restaurant:table'],
  'dish/order': ['订单管理', '/restaurant/order', 'restaurant:order'],
  'dashboard/restaurantAnalyze': ['经营分析', '/restaurant/analysis', 'restaurant:analysis'],
  'device/printer': ['打印管理', '/restaurant/printer', 'restaurant:printer'],
  'device/template': ['打印模板', '/operations/templates', 'operations:templates'],
  'activity/coupon': ['优惠券管理', '/marketing/coupon', 'marketing:coupon'],
  'activity/pointsMall': ['积分兑换管理', '/marketing/points-mall', 'marketing:points-mall'],
  'activity/wallet': ['储值管理', '/marketing/wallet', 'marketing:wallet'],
  'activity/lottery': ['抽奖管理', '/marketing/lottery', 'marketing:lottery'],
  'activity/record': ['核销记录', '/operations/verify-record', 'operations:verify-record'],
  'config/miniapp': ['基础配置', '/config/basic', 'config:basic'],
  'config/banner': ['轮播图配置', '/config/banner', 'config:banner'],
  'cashier/workspace': ['直接收银', '/operations/direct-cashier', 'operations:direct-cashier'],
  'cashier/tableCashier': ['餐桌收银', '/operations/table-cashier', 'operations:table-cashier'],
  'cashier/tableReservation': [
    '预约管理',
    '/operations/table-reservation',
    'operations:table-reservation'
  ],
  'operations/assistant': ['经营助手', '/operations/assistant', 'operations:assistant'],
  'operations/stores': ['我的门店', '/operations/stores', 'restaurant:my-stores']
}
const modules = import.meta.glob('../views/**/index.vue')
export const menuPages = Object.keys(modules)
  .map((path) => path.replace('../views/', '').replace('/index.vue', ''))
  .filter(
    (path) =>
      !/^(auth|exception|result|index|outside)(\/|$)/.test(path) &&
      !/(^|\/)(modules|components)(\/|$)/.test(path) &&
      path !== 'cashier/directCashier'
  )
  .sort()
  .map((path) => {
    const [title, route, code] = labels[path] || [path, '/' + path, path.replaceAll('/', ':')]
    return {
      label: title + ' · ' + path,
      title,
      value: path + '/index',
      route,
      code,
      menuScope: resolveMenuScope({ component: path + '/index', permissionCode: code })
    }
  })

export function findMenuPage(component: string) {
  const path = componentPath(component).replace(/\/index$/, '')
  return menuPages.find((page) => componentPath(page.value).replace(/\/index$/, '') === path)
}
