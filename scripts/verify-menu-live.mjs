// Read-only/no-change contract check against an already running local gateway.
// Existing menu records and role assignments are never edited by this script.
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { parseBackendJson } from '../src/utils/http/json.ts'

const gateway = process.env.LITESHOP_GATEWAY_URL || 'http://127.0.0.1:8080'
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(gateway).hostname), 'Local gateway only')
assert.ok(
  process.env.LITESHOP_TEST_PASSWORD,
  'Set LITESHOP_TEST_PASSWORD to the development platform password'
)
const report = { timestamp: new Date().toISOString(), checks: [], databaseChanges: false }
let token
const call = async (path, method = 'GET', body, useToken = true) => {
  const response = await fetch(gateway + path, {
    method,
    headers: {
      ...(useToken && token ? { satoken: token } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20000)
  })
  return parseBackendJson(await response.text())
}
const ok = (result) => {
  assert.equal(result.code, 200, result.msg)
  return result.data
}
const check = (name) => {
  report.checks.push(name)
  console.log('PASS ' + name)
}
try {
  const query = new URLSearchParams({
    account: process.env.LITESHOP_TEST_ACCOUNT || 'superadmin',
    password: process.env.LITESHOP_TEST_PASSWORD
  })
  const login = ok(await call('/user/admin/Login?' + query, 'POST', undefined, false))
  assert.ok(login.roleCode?.includes('SUPER_ADMIN') && login.token)
  token = login.token
  const before = ok(await call('/sys-permission/tree'))
  const flatten = (nodes) => nodes.flatMap((n) => [n, ...flatten(n.children || [])])
  const all = flatten(before)
  assert.ok(all.length)
  const entries = all.map((n) => ({
    id: String(n.id),
    parentId: String(n.parentId || 0),
    sort: n.sort ?? 0
  }))
  // No-change success check is safe only if every menu URL is already absolute.
  assert.ok(
    all.every(
      (n) =>
        !['菜单', 'MENU', 1, '1'].includes(n.permissionType) ||
        (typeof n.path === 'string' && (n.path.startsWith('/') || /^https?:/.test(n.path)))
    ),
    'Skip no-change save: relative menu URLs would be normalized. No request sent.'
  )
  ok(await call('/sys-permission/hierarchy', 'PUT', { original: entries, nodes: entries }))
  check('existing hierarchy accepted without changing rows')
  const cyclic = structuredClone(entries)
  cyclic[0].parentId = cyclic[0].id
  const invalid = await call('/sys-permission/hierarchy', 'PUT', {
    original: entries,
    nodes: cyclic
  })
  assert.notEqual(invalid.code, 200)
  assert.match(invalid.msg, /自己|循环|下级/)
  check('cycle rejected before persistence')
  const stale = structuredClone(entries)
  stale[0].sort++
  const conflict = await call('/sys-permission/hierarchy', 'PUT', {
    original: stale,
    nodes: entries
  })
  assert.notEqual(conflict.code, 200)
  assert.match(conflict.msg, /刷新|修改/)
  check('stale hierarchy rejected')
  const unauth = await call(
    '/sys-permission/hierarchy',
    'PUT',
    { original: entries, nodes: entries },
    false
  )
  assert.equal(unauth.code, 401)
  check('anonymous hierarchy write denied')
  const after = ok(await call('/sys-permission/tree'))
  assert.deepEqual(after, before)
  report.snapshotSha256 = createHash('sha256').update(JSON.stringify(before)).digest('hex')
  report.permissionCount = all.length
  check('all menu values and update times unchanged')
  const menus = ok(await call('/sys-permission/getCurrentUserMenus'))
  const knownIds = new Set(all.map((n) => String(n.id)))
  assert.ok(flatten(menus).every((n) => knownIds.has(String(n.id))))
  check('current-user menus contain database IDs only')
  await writeFile('docs/menu-live-verification.json', JSON.stringify(report, null, 2) + '\n')
} finally {
  // Sa-Token may share this account's session with an open browser; do not log it out.
}
