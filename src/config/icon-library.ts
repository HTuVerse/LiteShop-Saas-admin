import remixIcons from '@iconify-json/ri/icons.json'
import flatColorIcons from '@iconify-json/flat-color-icons/icons.json'
import { describeRemixIcon } from './icon-labels'
import { colorLabels } from './icon-data/color-labels'

/** Curated shortcuts with Chinese labels, alongside the complete offline Remix catalog. */
export const iconLibrary = [
  ['home-line', '首页', '通用'],
  ['dashboard-line', '工作台', '通用'],
  ['apps-line', '应用', '通用'],
  ['menu-line', '菜单', '通用'],
  ['list-check', '列表', '通用'],
  ['layout-grid-line', '网格', '通用'],
  ['folder-line', '目录', '通用'],
  ['file-list-3-line', '记录', '通用'],
  ['search-line', '搜索', '通用'],
  ['settings-3-line', '设置', '通用'],
  ['tools-line', '工具', '通用'],
  ['information-line', '信息', '通用'],
  ['user-line', '用户', '人员权限'],
  ['group-line', '用户组', '人员权限'],
  ['team-line', '团队', '人员权限'],
  ['user-settings-line', '用户设置', '人员权限'],
  ['shield-user-line', '角色', '人员权限'],
  ['key-line', '授权', '人员权限'],
  ['lock-line', '安全', '人员权限'],
  ['building-line', '租户', '人员权限'],
  ['building-2-line', '企业', '人员权限'],
  ['store-2-line', '门店', '餐饮业务'],
  ['restaurant-line', '餐饮', '餐饮业务'],
  ['restaurant-2-line', '菜品', '餐饮业务'],
  ['cup-line', '饮品', '餐饮业务'],
  ['shopping-cart-line', '购物车', '餐饮业务'],
  ['shopping-bag-line', '商品', '餐饮业务'],
  ['qr-code-line', '二维码', '餐饮业务'],
  ['printer-line', '打印', '餐饮业务'],
  ['table-line', '桌位', '餐饮业务'],
  ['receipt-line', '账单', '餐饮业务'],
  ['bank-card-line', '收银', '餐饮业务'],
  ['wallet-3-line', '余额', '餐饮业务'],
  ['coupon-line', '优惠券', '会员营销'],
  ['gift-line', '礼品', '会员营销'],
  ['gift-2-line', '赠送', '会员营销'],
  ['trophy-line', '奖品', '会员营销'],
  ['vip-crown-line', '会员', '会员营销'],
  ['medal-line', '等级', '会员营销'],
  ['star-line', '星级', '会员营销'],
  ['heart-line', '喜爱', '会员营销'],
  ['megaphone-line', '活动', '会员营销'],
  ['bar-chart-line', '统计', '数据服务'],
  ['pie-chart-line', '报表', '数据服务'],
  ['line-chart-line', '趋势', '数据服务'],
  ['calendar-line', '日历', '数据服务'],
  ['time-line', '时间', '数据服务'],
  ['notification-3-line', '通知', '数据服务'],
  ['image-line', '图片', '数据服务'],
  ['phone-line', '电话', '数据服务'],
  ['mail-line', '邮件', '数据服务'],
  ['map-pin-line', '地址', '数据服务'],
  ['links-line', '链接', '数据服务'],
  ['robot-line', '智能助手', '数据服务']
].map(([name, label, category]) => ({ icon: 'ri:' + name, label, category }))
const commonByName = new Map(iconLibrary.map((item) => [item.icon, item]))
const commonByShape = new Map(
  iconLibrary.map((item) => [item.icon.replace(/-(line|fill)$/, ''), item])
)
const monoIcons = Object.keys(remixIcons.icons)
  .sort()
  .map((name) => {
    const icon = 'ri:' + name
    const common = commonByName.get(icon) || commonByShape.get(icon.replace(/-(line|fill)$/, ''))
    const description = describeRemixIcon(name)
    return {
      icon,
      label: description.label,
      keywords: `${description.keywords},${common?.label || ''},${common?.category || ''}`,
      category: description.category,
      color: false
    }
  })

export const colorIcons = Object.keys(flatColorIcons.icons)
  .sort()
  .map((name) => ({
    icon: `flat-color-icons:${name}`,
    label: colorLabels[name] || '彩色图标',
    keywords: `${colorLabels[name] || ''},彩色,多色,${name}`,
    category: '彩色图标',
    color: true
  }))

export const allIcons = [...monoIcons, ...colorIcons]
export const iconsByName = new Map(allIcons.map((item) => [item.icon, item]))
export const iconCategories = [...new Set(allIcons.map((item) => item.category))]
