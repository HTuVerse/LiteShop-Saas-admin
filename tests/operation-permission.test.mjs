import test from 'node:test'
import assert from 'node:assert/strict'
import {
  hasOperationPermission,
  collectOperationPermissions
} from '../src/utils/operation-permission.ts'
import { adaptMenus } from '../src/router/backend-menu.ts'

test('page access never implies a write operation or wildcard grant', () => {
  assert.equal(hasOperationPermission(['system:user'], 'system:user:delete'), false)
  assert.equal(hasOperationPermission(['system:user:*'], 'system:user:delete'), false)
  assert.equal(hasOperationPermission(['system:user:edit'], 'system:user:delete'), false)
  assert.equal(hasOperationPermission(['system:user:delete'], 'system:user:delete'), true)
})
test('alternative entry points share an operation without sharing all actions', () => {
  const granted = ['operations:direct-cashier:settle']
  assert.equal(
    hasOperationPermission(granted, [
      'restaurant:order:settle',
      'operations:direct-cashier:settle'
    ]),
    true
  )
  assert.equal(
    hasOperationPermission(granted, [
      'restaurant:order:refund',
      'operations:direct-cashier:refund'
    ]),
    false
  )
  assert.equal(hasOperationPermission([], 'restaurant:order:refund', true), true)
  assert.equal(hasOperationPermission([], [], true), false)
})
test('only enabled operations from the server are collected and revocation removes them', () => {
  const source = [
    {
      id: '1',
      path: '/users',
      component: 'system/user/index',
      permissionCode: 'system:user',
      permissionType: 1,
      children: [
        { id: '2', permissionCode: 'system:user:edit', permissionType: 2, status: 1 },
        { id: '3', permissionCode: 'system:user:delete', permissionType: 2, status: 0 }
      ]
    }
  ]
  const adapt = () =>
    collectOperationPermissions(adaptMenus(source, { roleCode: ['CUSTOM_ROLE'] }, false))
  assert.deepEqual(adapt(), ['system:user', 'system:user:edit'])
  source[0].children = []
  assert.deepEqual(adapt(), ['system:user'])
})
