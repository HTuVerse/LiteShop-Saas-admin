import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'

// Runs only against the local development services and creates disposable tenants.
const gateway = process.env.LITESHOP_GATEWAY_URL || 'http://127.0.0.1:8080'
const userService = process.env.LITESHOP_USER_SERVICE_URL || 'http://127.0.0.1:9001'
for (const url of [gateway, userService]) {
  assert.ok(
    ['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname),
    'This test requires local services'
  )
}
const platformPassword = process.env.LITESHOP_TEST_PASSWORD
assert.ok(
  platformPassword,
  'Set LITESHOP_TEST_PASSWORD to the development platform account password'
)
const root = path.resolve('.test-output/live-tenancy')
fs.mkdirSync(root, { recursive: true })
const checkpoint = path.join(root, 'live-fixtures.json')
assert.ok(
  !fs.existsSync(checkpoint) || JSON.parse(fs.readFileSync(checkpoint)).length === 0,
  'Previous fixtures remain; inspect live-fixtures.json before rerunning'
)
const results = [],
  fixtures = [],
  tokens = []
let admin = null
const runId = 'IT' + Date.now()
const username = 'it_' + Date.now(),
  password = crypto.randomBytes(16).toString('hex')
async function req(
  path,
  { token = admin, method = 'GET', params, body, headers = {}, base = gateway } = {}
) {
  const u = new URL(path, base)
  if (params) u.search = new URLSearchParams(params)
  const r = await fetch(u, {
    method,
    headers: {
      ...(token ? { satoken: token } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000)
  })
  return { status: r.status, ...(await r.json()) }
}
function ok(r) {
  assert.equal(r.status, 200, JSON.stringify(r))
  assert.equal(r.code, 200, r.msg)
  return r.data
}
function denied(r) {
  assert.ok(r.status >= 400 || (r.code && r.code !== 200), 'request unexpectedly succeeded')
}
function pass(name) {
  results.push({ name, status: 'passed' })
  console.log('PASS ' + name)
}
function sql(query) {
  const r = spawnSync(
    process.env.MYSQL_BIN || 'mysql',
    [
      '-h',
      process.env.MYSQL_HOST || '127.0.0.1',
      '-P',
      process.env.MYSQL_PORT || '3306',
      '-u',
      process.env.MYSQL_USERNAME || 'root',
      '-N',
      '-e',
      query
    ],
    {
      encoding: 'utf8',
      env: { ...process.env, MYSQL_PWD: process.env.MYSQL_PWD || process.env.MYSQL_PASSWORD || '' }
    }
  )
  if (r.error) throw r.error
  if (r.status !== 0) throw new Error(r.stderr)
  return r.stdout.trim()
}
async function select(token, tenantId) {
  return ok(
    await req('/user/admin/select-tenant', {
      token: null,
      method: 'POST',
      params: { selectionTicket: token, tenantId }
    })
  )
}
async function enter(id) {
  ok(await req('/sys-tenant/' + id + '/enter', { method: 'POST' }))
}
async function createTenant(suffix) {
  const t = ok(
    await req('/sys-tenant', {
      method: 'POST',
      body: {
        tenantCode: runId + suffix,
        tenantName: '联调临时商户' + runId + suffix,
        status: 1,
        remark: '自动联调临时数据'
      }
    })
  )
  fixtures.push(t)
  fs.writeFileSync(root + '/live-fixtures.json', JSON.stringify(fixtures))
  return t
}
;(async () => {
  try {
    sql('SELECT 1')
    const login = ok(
      await req('/user/admin/Login', {
        token: null,
        method: 'POST',
        params: {
          account: process.env.LITESHOP_TEST_ACCOUNT || 'superadmin',
          password: platformPassword
        }
      })
    )
    assert.ok(
      login.roleCode?.includes('SUPER_ADMIN') && login.token,
      'A platform account is required'
    )
    admin = login.token

    // Create from a selected tenant: default roles must belong to the newly created tenant.
    await enter(process.env.LITESHOP_TEST_TENANT_ID || '1001')
    const a = await createTenant('A')
    await enter(a.id)
    const b = await createTenant('B')
    for (const t of [a, b]) {
      await enter(t.id)
      const roles = ok(await req('/sys-role/list'))
      assert.equal(roles.length, 4)
      assert.ok(roles.every((x) => x.tenantId === t.id))
    }
    pass('创建商户时四个默认角色归属正确，包括在已选商户视角创建')
    const stores = {},
      users = {}
    for (const [tag, t] of [
      ['A', a],
      ['B', b]
    ]) {
      await enter(t.id)
      ok(
        await req('/store-info/add', {
          method: 'POST',
          body: {
            storeCode: 'IT_STORE',
            storeName: '测试门店' + tag,
            status: 1,
            paymentMode: 1,
            pickupMode: 0,
            allowPreOrder: 0,
            isPrint: 0
          }
        })
      )
      stores[tag] = ok(await req('/store-info/pageList')).records[0]
      ok(
        await req('/config/app/admin/add', {
          method: 'POST',
          body: {
            configKey: 'it_scope',
            configValue: tag,
            configName: '租户隔离联调',
            configType: 2,
            configGroup: 5,
            editable: 1
          }
        })
      )
      users[tag] = ok(
        await req('/user/add', {
          method: 'POST',
          body: { username, password, nickname: '联调管理员' + tag, status: 1, roleCode: ['ADMIN'] }
        })
      )
    }
    pass('两个商户可创建同名门店编码、配置键和管理账号')
    const pre = ok(
      await req('/user/admin/Login', {
        token: null,
        method: 'POST',
        params: { account: username, password }
      })
    )
    assert.equal(pre.tenants.length, 2)
    assert.equal(pre.token, undefined)
    const loginA = await select(pre.selectionTicket, a.id)
    tokens.push(loginA.token)
    assert.equal(loginA.tenantId, a.id)
    denied(
      await req('/user/admin/select-tenant', {
        token: null,
        method: 'POST',
        params: { selectionTicket: pre.selectionTicket, tenantId: b.id }
      })
    )
    pass('同账号双商户预认证、选择商户和一次性票据防重放')
    const preB = ok(
      await req('/user/admin/Login', {
        token: null,
        method: 'POST',
        params: { account: username, password }
      })
    )
    const loginB = await select(preB.selectionTicket, b.id)
    tokens.push(loginB.token)
    for (const [token, t, tag] of [
      [loginA.token, a, 'A'],
      [loginB.token, b, 'B']
    ]) {
      const page = ok(await req('/store-info/pageList', { token }))
      assert.deepEqual(
        page.records.map((x) => x.id),
        [stores[tag].id]
      )
      const info = ok(await req('/user/getUserBasicInfo', { token }))
      assert.equal(info.tenantId, t.id)
    }
    denied(
      await req('/store-info/getStoreDetail', { token: loginA.token, params: { id: stores.B.id } })
    )
    denied(
      await req('/store-info/update', {
        token: loginA.token,
        method: 'PUT',
        body: { id: stores.B.id, storeName: 'forged' }
      })
    )
    denied(
      await req('/user/admin/edit', {
        token: loginA.token,
        method: 'PUT',
        body: { id: users.B.id, nickname: 'forged' }
      })
    )
    pass('租户账号不能读取或修改另一商户的门店和用户')
    const forged = ok(
      await req('/store-info/pageList', {
        token: loginA.token,
        headers: {
          'X-Tenant-Id': b.id,
          'X-Super-Admin': 'true',
          'X-Internal-Call': 'forged',
          'X-Store-Restricted': 'false',
          'X-Public-Tenant-Id': b.id
        }
      })
    )
    assert.deepEqual(
      forged.records.map((x) => x.id),
      [stores.A.id]
    )
    denied(await req('/inner/user/tenants/' + a.id + '/active', { token: null, base: userService }))
    denied(await req('/inner/user/tenants/' + a.id + '/active', { token: null }))
    pass('网关清除伪造内部头，直接内部接口拒绝无凭据请求')
    for (let i = 0; i < 2; i++) {
      const publicA = await req('/config/app/value/it_scope', {
        token: null,
        headers: { 'X-Public-Tenant-Id': a.id }
      })
      assert.equal(ok(publicA), 'A')
      assert.equal(
        ok(
          await req('/config/app/value/it_scope', {
            token: null,
            headers: { 'X-Public-Tenant-Id': b.id }
          })
        ),
        'B'
      )
    }
    await enter(a.id)
    ok(
      await req('/config/app/admin/update-value', {
        method: 'PUT',
        params: { configKey: 'it_scope', configValue: 'A2' }
      })
    )
    assert.equal(ok(await req('/config/app/value/it_scope', { token: loginA.token })), 'A2')
    assert.equal(ok(await req('/config/app/value/it_scope', { token: loginB.token })), 'B')
    denied(await req('/config/app/value/it_scope', { token: null }))
    pass('公开商户头校验、同名配置缓存隔离和单商户更新')
    const staff = ok(
      await req('/user/add', {
        method: 'POST',
        body: {
          username: username + '_staff',
          password,
          nickname: '联调店员',
          status: 1,
          roleCode: ['STORE_STAFF']
        }
      })
    )
    ok(
      await req('/sys-user-store/assign', {
        method: 'POST',
        params: { userId: staff.id },
        body: [stores.A.id]
      })
    )
    ok(
      await req('/store-info/add', {
        method: 'POST',
        body: { storeCode: 'IT_OTHER', storeName: '未授权门店', status: 1 }
      })
    )
    const secondStore = ok(await req('/store-info/pageList')).records.find(
      (x) => x.id !== stores.A.id
    )
    const preStaff = ok(
      await req('/user/admin/Login', {
        token: null,
        method: 'POST',
        params: { account: username + '_staff', password }
      })
    )
    const staffLogin = await select(preStaff.selectionTicket, a.id)
    tokens.push(staffLogin.token)
    assert.deepEqual(
      ok(await req('/store-info/pageList', { token: staffLogin.token })).records.map((x) => x.id),
      [stores.A.id]
    )
    denied(
      await req('/store-info/getStoreDetail', {
        token: staffLogin.token,
        params: { id: secondStore.id }
      })
    )
    denied(
      await req('/store-info/update', {
        token: staffLogin.token,
        method: 'PUT',
        body: { id: secondStore.id, storeName: 'forged' }
      })
    )
    pass('店员只可见授权门店，同租户跨门店读取和修改被拒绝')
    // Selected platform account is filtered, identity still belongs to the platform.
    await enter(b.id)
    assert.deepEqual(
      ok(await req('/store-info/pageList')).records.map((x) => x.id),
      [stores.B.id]
    )
    const platform = ok(await req('/user/getUserBasicInfo'))
    assert.equal(platform.tenantId, null)
    assert.equal(platform.currentTenant.id, b.id)
    ok(await req('/sys-tenant/' + b.id + '/status', { method: 'PUT', params: { status: 0 } }))
    denied(await req('/store-info/pageList'))
    denied(await req('/store-info/pageList', { token: loginB.token }))
    denied(
      await req('/config/app/value/it_scope', {
        token: null,
        headers: { 'X-Public-Tenant-Id': b.id }
      })
    )
    ok(await req('/sys-tenant/exit', { method: 'POST' }))
    assert.equal(ok(await req('/user/getUserBasicInfo')).currentTenant, null)
    pass('停用商户立即拒绝业务访问，平台账号仍可退出该商户')
  } catch (e) {
    results.push({ name: 'failure', status: 'failed', message: e.message })
    throw e
  } finally {
    for (const token of tokens) await req('/user/logout', { token, method: 'POST' }).catch(() => {})
    await req('/sys-tenant/exit', { method: 'POST' }).catch(() => {})
    for (const t of fixtures) {
      assert.match(t.id, /^\d+$/)
      assert.match(t.tenantCode, /^IT\d+[AB]$/)
      const exists = sql(
        `SELECT COUNT(*) FROM liteshop_user.sys_tenant WHERE id=${t.id} AND tenant_code='${t.tenantCode}'`
      )
      assert.equal(exists, '1')
      const tables = sql(
        "SELECT TABLE_SCHEMA,TABLE_NAME FROM information_schema.COLUMNS WHERE COLUMN_NAME='tenant_id' AND TABLE_SCHEMA IN ('liteshop_user','liteshop_restaurant','liteshop_config','liteshop_coupon','liteshop_lottery','liteshop_file')"
      )
        .split(/\r?\n/)
        .filter(Boolean)
        .map((x) => x.split('\t'))
      const deletes = tables.map(([schema, table]) => {
        assert.match(schema, /^liteshop_\w+$/)
        assert.match(table, /^\w+$/)
        return `DELETE FROM ${schema}.${table} WHERE tenant_id=${t.id}`
      })
      sql(
        `START TRANSACTION;${deletes.join(';')};DELETE FROM liteshop_user.sys_tenant WHERE id=${
          t.id
        } AND tenant_code='${t.tenantCode}';COMMIT;`
      )
    }
    fs.writeFileSync(root + '/live-fixtures.json', '[]')
    fs.writeFileSync(
      root + '/live-tenant-results.json',
      JSON.stringify({ date: new Date().toISOString(), results, fixturesCleaned: true }, null, 2)
    )
    console.log('Temporary tenants cleaned')
  }
})().catch((e) => {
  console.error(e.message)
  process.exitCode = 1
})
