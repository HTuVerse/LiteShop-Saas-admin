// Explicit local test fixture only. Production never imports or starts this server.
// Run: node scripts/mock-gateway.mjs. Credentials: platform/merchant/staff/expired + mock123.
import http from 'node:http'
const tenants = [
  { id: '9223372036854775101', tenantCode: 'DEMO-A', tenantName: '联调商户 A', status: 1 },
  { id: '9223372036854775102', tenantCode: 'DEMO-B', tenantName: '联调商户 B', status: 1 }
]
const stores = [
  {
    id: '9223372036854775201',
    storeName: '联调门店 A',
    status: '营业',
    address: '测试地址',
    phone: '13800000000'
  }
]
const sessions = new Map(),
  tickets = new Map()
let website = {
  revision: 0,
  systemName: 'LiteShop',
  description: '商户运营管理平台',
  watermarkEnabled: false,
  watermarkMode: 'username',
  watermarkText: '',
  loginTitle: '欢迎回来',
  loginDescription: '使用已开通管理权限的账号登录。',
  defaultLanguage: 'zh',
  captchaEnabled: false,
  captchaType: 'image',
  maxLoginAttempts: null,
  lockMinutes: 10,
  maintenanceEnabled: false,
  maintenanceMessage: '系统正在维护，请稍后再试。',
  seoTitle: '',
  seoKeywords: '',
  seoDescription: '',
  contactEmail: '',
  contactPhone: '',
  contactAddress: '',
  copyright: '',
  icpNumber: '',
  publicSecurityNumber: ''
}

const leaf = (id, path, component, title) => ({
  id,
  path,
  component,
  permissionType: '菜单',
  status: '正常',
  meta: { title }
})
const menu = [
  {
    id: 100,
    path: '/platform',
    component: 'Layout',
    meta: { title: '平台管理', icon: 'Setting' },
    children: [
      {
        ...leaf(101, 'website', 'config/website/index', '网站配置'),
        permissionCode: 'platform:website'
      }
    ]
  },

  {
    id: 1,
    path: '/system',
    component: 'Layout',
    meta: { title: '系统管理', icon: 'Setting' },
    children: [
      leaf(2, 'user', 'system/user/index', '用户管理'),
      leaf(3, 'role', 'system/role/index', '角色管理')
    ]
  },
  {
    id: 10,
    path: '/restaurant',
    component: 'Layout',
    meta: { title: '餐饮管理', icon: 'Shop' },
    children: [
      leaf(11, 'store', 'restaurant/store/index', '门店管理'),
      leaf(12, 'category', 'restaurant/category/index', '分类管理'),
      leaf(13, 'dish', 'restaurant/dish/index', '菜品管理'),
      leaf(14, 'table', 'restaurant/table/index', '餐桌管理'),
      leaf(15, 'order', 'restaurant/order/index', '订单管理'),
      leaf(16, 'printer', 'restaurant/printer/index', '打印机管理'),
      leaf(17, 'analysis', 'restaurant/analysis/index', '经营分析')
    ]
  },
  {
    id: 20,
    path: '/marketing',
    component: 'Layout',
    meta: { title: '营销活动' },
    children: [
      leaf(21, 'coupon', 'marketing/coupon/index', '优惠券管理'),
      leaf(22, 'lottery', 'marketing/lottery/index', '抽奖活动')
    ]
  },
  {
    id: 30,
    path: '/config',
    component: 'Layout',
    meta: { title: '配置中心' },
    children: [
      leaf(31, 'basic', 'config/basic/index', '应用配置'),
      leaf(32, 'banner', 'config/banner/index', '轮播图管理')
    ]
  }
]
function login(account, tenant = tenants[0]) {
  const token = 'fixture-' + crypto.randomUUID(),
    platform = account === 'platform'
  const user = {
    id: platform ? '1' : '9223372036854775301',
    username: account,
    nickname: platform ? '联调平台管理员' : '联调商户管理员',
    roleCode: [platform ? 'SUPER_ADMIN' : account === 'staff' ? 'STORE_STAFF' : 'ADMIN'],
    tenantId: platform ? null : tenant.id,
    tenantCode: platform ? null : tenant.tenantCode,
    currentTenant: platform ? null : tenant,
    storeIds: platform ? [] : stores.map((s) => s.id),
    token
  }
  sessions.set(token, user)
  return user
}
http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1'),
      p = url.pathname,
      q = url.searchParams
    const body = await Array.fromAsync(req)
    let data
    try {
      data = body.length ? JSON.parse(Buffer.concat(body).toString()) : undefined
    } catch {}
    const reply = (value, code = 200, msg = '成功') => {
      res.setHeader('Content-Type', 'application/json;charset=utf-8')
      res.end(JSON.stringify({ code, msg, data: value }))
    }
    const raw = (value) => {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(value))
    }
    console.log(
      req.method,
      p,
      'queryKeys=' + [...q.keys()].join(','),
      'auth=' + Boolean(req.headers.satoken)
    )
    if (
      Object.keys(req.headers).some((h) =>
        ['x-tenant-id', 'x-public-tenant-id', 'x-super-admin'].includes(h)
      )
    )
      return reply(null, 400, '管理端不应发送租户身份头')
    if (p === '/user/admin/Login' || p === '/user/admin/phoneOrEmailVerifyCodeLogin') {
      if (req.headers.satoken || data) return reply(null, 400, '登录必须使用匿名 query 参数')
      const account = q.get('account')
      if (
        !['platform', 'merchant', 'staff', 'expired'].includes(account) ||
        (q.get('password') !== 'mock123' && q.get('verifyCode') !== '123456')
      )
        return reply(null, 400, '账号或密码错误')
      if (account === 'platform') return reply(login(account))
      const ticket = crypto.randomUUID(),
        seconds = account === 'expired' ? 2 : 300
      tickets.set(ticket, { account, expires: Date.now() + seconds * 1000 })
      return reply({
        tenantSelectionRequired: true,
        selectionTicket: ticket,
        expiresInSeconds: seconds,
        tenants: tenants.map((t) => ({
          tenantId: t.id,
          tenantCode: t.tenantCode,
          tenantName: t.tenantName
        }))
      })
    }
    if (p === '/config/website/public') {
      const { maxLoginAttempts, lockMinutes, ...publicConfig } = website
      return reply(publicConfig)
    }
    if (p === '/user/admin/captcha')
      return reply({
        enabled: website.captchaEnabled,
        captchaId: 'fixture-only',
        image:
          'data:image/svg+xml,' +
          encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="150" height="48"><rect width="150" height="48" fill="#edf2fa"/><text x="22" y="33" font-size="28">TEST</text></svg>'
          )
      })

    if (p === '/msg/sendVerifyCode') return reply(true)
    if (p === '/user/admin/select-tenant') {
      const ticket = tickets.get(q.get('selectionTicket'))
      tickets.delete(q.get('selectionTicket'))
      const tenant = tenants.find((t) => t.id === q.get('tenantId'))
      if (!ticket || ticket.expires < Date.now() || !tenant)
        return reply(null, 400, '凭证已过期或已使用')
      return reply(login(ticket.account, tenant))
    }
    const user = sessions.get(req.headers.satoken)
    if (!user) return reply(null, 401, '登录已失效')
    if (p === '/config/website/admin') {
      if (!user.roleCode.includes('SUPER_ADMIN'))
        return reply(null, 403, '仅超级管理员可编辑网站配置')
      if (req.method === 'PUT') {
        if (data.revision !== website.revision) return reply(null, 409, '配置已被其他管理员更新')
        website = { ...data, revision: website.revision + 1 }
      }
      return reply(website)
    }

    if (p === '/user/logout') {
      sessions.delete(req.headers.satoken)
      return reply(true)
    }
    if (p === '/user/getUserBasicInfo') return reply(user)
    if (p === '/sys-permission/getCurrentUserMenus') return reply(menu)
    if (p === '/sys-tenant/page') return reply({ records: tenants, total: 2, current: 1, size: 10 })
    if (/^\/sys-tenant\/\d+\/enter$/.test(p)) {
      user.currentTenant = tenants.find((t) => p.includes(t.id))
      return reply(user.currentTenant)
    }
    if (p === '/sys-tenant/exit') {
      user.currentTenant = null
      return reply(true)
    }
    const page = (records) =>
      reply({
        records,
        total: records.length,
        current: Number(q.get('currentPage') || 1),
        size: Number(q.get('pageSize') || 10)
      })
    if (p === '/store-info/pageList') return page(stores)
    if (p === '/user/list') return page([user])
    if (p === '/sys-role/list')
      return reply([
        { id: 2, roleCode: 'ADMIN', roleName: '商户管理员', status: '正常' },
        { id: 3, roleCode: 'STORE_STAFF', roleName: '门店员工', status: '正常' }
      ])
    if (p === '/user-level/list' || p === '/user-level/listEnabledLevels')
      return reply([{ id: 1, levelCode: 1, levelName: '普通会员', discount: 100, status: '正常' }])
    if (p.startsWith('/sys-user-store/')) return reply(stores.map((s) => s.id))
    if (p === '/ai/status') return raw({ enabled: true, provider: 'test-fixture' })
    if (p === '/ai/chat') return raw({ content: '这是本地接口测试回复：' + data?.message })
    if (req.method !== 'GET') return reply(null, 400, '测试服务仅支持登录与切换；业务写操作未模拟')
    if (/pageList|\/page$|listPage/i.test(p)) return page([])
    if (/list|tree|getAll/i.test(p)) return reply([])
    if (p.includes('/config/')) return reply({})
    return reply(null, 404, '测试服务未模拟接口 ' + p)
  })
  .listen(18080, '127.0.0.1', () => console.log('TEST FIXTURE ONLY: http://127.0.0.1:18080'))
