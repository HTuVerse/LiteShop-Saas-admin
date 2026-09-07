import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizePermissionTree } from '../src/utils/permission.ts'
import {
  canParentPermission,
  hierarchyEntries,
  permissionFullPaths
} from '../src/utils/permission-hierarchy.ts'
import { adaptMenus } from '../src/router/backend-menu.ts'

const nodes = () =>
  normalizePermissionTree([
    {
      id: '9223372036854775800',
      component: 'Layout',
      path: '/one',
      children: [
        {
          id: '9223372036854775801',
          component: 'system/user/index',
          path: 'user',
          children: [
            { id: '9223372036854775802', permissionType: 2, permissionCode: 'system:user:add' }
          ]
        }
      ]
    },
    { id: '9223372036854775803', component: 'Layout', path: '/two' }
  ])
test('hierarchy supports cross-directory moves and preserves Long IDs without changing page URLs', () => {
  const tree = nodes()
  const original = hierarchyEntries(tree)
  const page = tree[0].children.pop()
  tree[1].children.push(page)
  assert.equal(canParentPermission(page, tree[1]), true)
  assert.equal(canParentPermission(page), true)
  const after = hierarchyEntries(tree, true)
  assert.equal(after.find((row) => row.id === page.id).parentId, tree[1].id)
  assert.equal(after.find((row) => row.id === page.id).sort, 10)
  assert.equal(original.find((row) => row.id === page.id).parentId, tree[0].id)
  assert.equal(page.routerAddress, 'user')
  assert.equal(permissionFullPaths(nodes()).get(page.id), '/one/user')
})
test('dragging prevents cycles, menu children below pages and root buttons', () => {
  const tree = nodes(),
    page = tree[0].children[0],
    button = page.children[0]
  assert.equal(canParentPermission(tree[0], page), false)
  assert.equal(canParentPermission(tree[0], tree[0]), false)
  assert.equal(canParentPermission(tree[1], page), false)
  assert.equal(canParentPermission(button), false)
  assert.equal(canParentPermission(button, page), true)
})
test('missing, deleted or disabled DB menus are never supplemented for any role', () => {
  for (const role of ['SUPER_ADMIN', 'ADMIN', 'STORE_STAFF']) {
    assert.deepEqual(adaptMenus([], { roleCode: [role] }, false), [])
    assert.deepEqual(
      adaptMenus(
        [
          {
            id: 70,
            path: '/operations',
            component: 'Layout',
            status: 0,
            children: [{ id: 71, path: 'direct-cashier', component: 'cashier/workspace/index' }]
          }
        ],
        { roleCode: [role] },
        false
      ),
      []
    )
  }
})
test('platform and tenant leaves remain scoped after moving under a different DB directory', () => {
  const tree = [
    {
      id: 1,
      component: 'Layout',
      path: '/group',
      permissionCode: 'system:menu',
      children: [
        {
          id: 2,
          path: '/platform/permission',
          component: 'system/menu/index',
          permissionCode: 'platform:permission'
        },
        {
          id: 3,
          path: '/system/user',
          component: 'system/user/index',
          permissionCode: 'system:user'
        }
      ]
    }
  ]
  assert.deepEqual(
    adaptMenus(tree, { roleCode: ['SUPER_ADMIN'] }, true)[0].children.map((n) => n.id),
    [2]
  )
  tree[0].permissionCode = 'platform:menu'
  assert.deepEqual(
    adaptMenus(tree, { roleCode: ['ADMIN'] }, false)[0].children.map((n) => n.id),
    [3]
  )
})
