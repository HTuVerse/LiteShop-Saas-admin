import test from 'node:test'
import assert from 'node:assert/strict'
import { adaptMenus, resolveMenuScope } from '../src/router/backend-menu.ts'
import { normalizePermissionTree } from '../src/utils/permission.ts'

const admin = { roleCode: ['SUPER_ADMIN'] }
const tenantUser = { roleCode: ['ADMIN'] }
const page = (scope, code = 'system:level') => ({
  id: '9007199254740993',
  path: '/levels',
  component: 'system/level/index',
  permissionCode: code,
  menuScope: scope
})

test('scope determines visibility in platform and tenant contexts', () => {
  for (const [scope, platformCount, tenantCount] of [
    [1, 1, 0],
    [2, 0, 1],
    [0, 1, 1]
  ]) {
    assert.equal(adaptMenus([page(scope)], admin, true).length, platformCount)
    assert.equal(adaptMenus([page(scope)], admin, false).length, tenantCount)
  }
})
test('shared visibility never overrides platform administrator restriction', () => {
  assert.equal(adaptMenus([page(0, 'platform:level-template')], tenantUser, false).length, 0)
  assert.equal(adaptMenus([page(1)], tenantUser, true).length, 0)
  assert.equal(adaptMenus([page(0)], tenantUser, false).length, 1)
  assert.equal(
    adaptMenus([{ ...page(0), component: 'platform/level-template/index' }], tenantUser, false)
      .length,
    0
  )
})
test('directories follow visible children while disabled ancestors and missing grants stay absent', () => {
  const directory = {
    id: '1',
    path: '/system',
    component: 'Layout',
    menuScope: 2,
    children: [page(0)]
  }
  assert.equal(adaptMenus([directory], admin, true)[0].children[0].id, '9007199254740993')
  assert.equal(adaptMenus([{ ...directory, children: [page(2)] }], admin, true).length, 0)
  assert.equal(adaptMenus([{ ...directory, status: 0 }], admin, true).length, 0)
  assert.deepEqual(adaptMenus([], admin, true), [])
})
test('legacy menu defaults and persisted editor scope remain consistent', () => {
  assert.equal(resolveMenuScope(page(undefined)), 2)
  assert.equal(resolveMenuScope(page(undefined, 'platform:level-template')), 1)
  assert.equal(resolveMenuScope({ component: '/src/views/dashboard/console/index.vue' }), 0)
  const normalized = normalizePermissionTree([page(0)])[0]
  assert.equal(normalized.menuScope, 0)
  assert.equal(resolveMenuScope(normalized), 0)
})

test('legacy string codes are normalized and numeric zero never falls back to tenant scope', () => {
  for (const [input, expected] of [
    ['ALL', 0],
    ['PLATFORM', 1],
    ['TENANT', 2],
    ['0', 0],
    ['1', 1],
    ['2', 2],
    [0, 0]
  ]) {
    assert.equal(resolveMenuScope(page(input)), expected)
  }
  assert.equal(adaptMenus([page(0)], admin, true).length, 1)
})
