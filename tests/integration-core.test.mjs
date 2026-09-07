import test from 'node:test'
import assert from 'node:assert/strict'
import { parseBackendJson } from '../src/utils/http/json.ts'
import { adaptMenus, componentPath } from '../src/router/backend-menu.ts'
import { filterPermissionTree, normalizePermissionTree } from '../src/utils/permission.ts'
import ZipArchive from '../src/utils/export/zip.ts'

test('Java Long IDs survive JSON parsing, including nested IDs and negative numbers', () => {
  const parsed = parseBackendJson(
    '{"id":9223372036854775807,"ids":[9007199254740993,-9223372036854775808],"price":12.34,"count":42,"text":"id:9223372036854775807","escaped":"\\"12345678901234567890\\""}'
  )
  assert.equal(parsed.id, '9223372036854775807')
  assert.deepEqual(parsed.ids, ['9007199254740993', '-9223372036854775808'])
  assert.equal(parsed.price, 12.34)
  assert.equal(parsed.count, 42)
  assert.equal(parsed.text, 'id:9223372036854775807')
  assert.throws(() => parseBackendJson('{"id":undefined}'))
})
const tree = [
  {
    id: 1,
    path: '/restaurant',
    component: 'Layout',
    meta: { title: '餐饮' },
    children: [
      {
        id: 2,
        path: 'store',
        component: 'restaurant/store/index',
        permissionType: '菜单',
        status: '正常'
      },
      { id: 3, path: 'dish', component: 'restaurant/dish/index', status: 1 },
      { id: 4, path: 'deleted', component: 'restaurant/dish/index', status: '禁用' },
      { id: 5, path: 'button', permissionType: '按钮', component: 'restaurant/dish/index' }
    ]
  },
  {
    id: 10,
    path: '/platform',
    component: 'Layout',
    permissionCode: 'platform:view',
    children: [
      {
        id: 11,
        path: 'tenant',
        component: 'platform/tenant/index',
        permissionCode: 'platform:tenant'
      }
    ]
  }
]
test('merchant menus preserve components and nested paths, excluding disabled/button/platform routes', () => {
  const routes = adaptMenus(tree, { roleCode: ['ADMIN'] }, false)
  assert.equal(routes.length, 1)
  assert.deepEqual(
    routes[0].children.map((r) => r.path),
    ['/restaurant/store', '/restaurant/dish']
  )
  assert.equal(routes[0].children[1].component, '/dish/menu')
  assert.equal(routes[0].children[1].meta.keepAlive, false)
  assert.equal(componentPath('/src/views/restaurant/dish/index.vue'), '/dish/menu')
  assert.equal(componentPath('system/menu/index'), '/system/menu')
})
test('store roles see exactly their backend-granted business routes', () => {
  const routes = adaptMenus(tree, { roleCode: ['STORE_STAFF'] }, false)
  assert.equal(routes.length, 1)
  assert.equal(routes[0].children.length, 2)
  assert.equal(routes[0].children[0].component, '/dish/store')
  assert.equal(routes[0].children[1].component, '/dish/menu')
  assert.deepEqual(adaptMenus(tree, { roleCode: ['CUSTOM_CASHIER'] }, false), routes)
  assert.deepEqual(adaptMenus([], { roleCode: ['STORE_STAFF'] }, false), [])
})
test('platform mode hides tenant business until an explicit tenant is selected', () => {
  const routes = adaptMenus(tree, { roleCode: ['SUPER_ADMIN'] }, true)
  assert.equal(routes.length, 1)
  assert.equal(routes[0].path, '/platform')
})
test('permission administration preserves Long IDs, real state and matching ancestors', () => {
  const permissions = normalizePermissionTree([
    {
      id: '9223372036854775807',
      path: '/system',
      component: 'Layout',
      permissionCode: 'system:menu',
      permissionType: '菜单',
      status: '禁用',
      parentId: 0,
      meta: { title: '系统管理', isHide: 1 },
      children: [
        {
          id: '9223372036854775806',
          path: 'permission',
          component: 'system/menu/index',
          permissionCode: 'system:permission',
          permissionType: '按钮',
          status: '正常',
          meta: { title: '菜单管理' }
        }
      ]
    }
  ])
  assert.equal(permissions[0].id, '9223372036854775807')
  assert.equal(permissions[0].status, 0)
  assert.equal(permissions[0].isHide, true)
  assert.equal(permissions[0].children[0].parentId, '9223372036854775807')
  assert.equal(permissions[0].children[0].permissionType, 2)
  const filtered = filterPermissionTree(permissions, 'system:permission')
  assert.equal(filtered.length, 1)
  assert.equal(filtered[0].children.length, 1)
})
test('QR export ZIP has valid offsets, UTF-8 names and known CRC32', async () => {
  const zip = new ZipArchive()
  zip.file('餐桌.txt', '123456789')
  const bytes = new Uint8Array(await (await zip.generateAsync({ type: 'blob' })).arrayBuffer()),
    view = new DataView(bytes.buffer)
  assert.equal(view.getUint32(0, true), 0x04034b50)
  assert.equal(view.getUint32(14, true), 0xcbf43926)
  assert.equal(view.getUint16(6, true), 0x800)
  const n = view.getUint16(26, true)
  assert.equal(new TextDecoder().decode(bytes.slice(30, 30 + n)), '餐桌.txt')
  const end = bytes.length - 22,
    central = view.getUint32(end + 16, true)
  assert.equal(view.getUint32(central, true), 0x02014b50)
  assert.equal(view.getUint16(end + 10, true), 1)
  assert.equal(new TextDecoder().decode(bytes.slice(30 + n, central)), '123456789')
})
