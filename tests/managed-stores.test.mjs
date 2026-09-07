import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'
import * as vue from 'vue'

// Run the real composable with the same Vue reactivity and an isolated API response.
function setup(fetchStores) {
  const source = fs.readFileSync(
    new URL('../src/views/device/composables/useManagedStores.ts', import.meta.url),
    'utf8'
  )
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  })
  const module = { exports: {} }
  const dependencies = {
    vue,
    '@/api/dish-manage': { fetchGetStoreList: fetchStores }
  }
  new Function('require', 'module', 'exports', outputText)(
    (id) => {
      assert.ok(id in dependencies, `Unexpected dependency: ${id}`)
      return dependencies[id]
    },
    module,
    module.exports
  )
  return module.exports.useManagedStores()
}

function validate(stores, value) {
  return new Promise((resolve) => stores.storeRules[1].validator({}, value, resolve))
}

test('only API-authorized stores can be selected, preserving long IDs and edit values', async () => {
  const stores = setup(async () => ({
    records: [
      { id: '9223372036854775807', storeName: '授权门店 A' },
      { id: 42, storeName: '授权门店 B' }
    ]
  }))
  assert.equal(await stores.loadStores(), true)
  assert.equal(stores.resolveStoreId('9223372036854775807'), '9223372036854775807')
  assert.equal(stores.resolveStoreId(42), '42')
  assert.equal(await validate(stores, 42), undefined)
  assert.equal(stores.defaultStoreId.value, undefined)
  assert.ok(await validate(stores, 99), 'a store outside the API scope must be rejected')
  assert.ok(await validate(stores, undefined), 'a store account must select a store')
})

test('a single authorized store defaults automatically; no authorization leaves no selection', async () => {
  let records = [{ id: 42, storeName: '唯一门店' }]
  const stores = setup(async () => ({ records }))
  await stores.loadStores()
  assert.equal(stores.defaultStoreId.value, '42')
  records = []
  await stores.loadStores()
  assert.equal(stores.defaultStoreId.value, undefined)
  assert.ok(await validate(stores, 42), 'revoked authorization must not survive a refresh')
})

test('failed refresh removes stale options and blocks previous store values', async () => {
  let fail = false
  const stores = setup(async () => {
    if (fail) throw new Error('Unavailable')
    return { records: [{ id: 42, storeName: '门店' }] }
  })
  await stores.loadStores()
  fail = true
  assert.equal(await stores.loadStores(), false)
  assert.equal(stores.storesError.value, true)
  assert.equal(stores.storesLoading.value, false)
  assert.deepEqual(stores.storeOptions.value, [])
  assert.ok(await validate(stores, 42))
})

test('out-of-order responses cannot restore an older store scope', async () => {
  const pending = []
  const stores = setup(() => new Promise((resolve) => pending.push(resolve)))
  const first = stores.loadStores()
  assert.ok(await validate(stores, 1), 'submission is blocked while loading')
  const second = stores.loadStores()
  pending[1]({ records: [{ id: 2, storeName: '当前门店' }] })
  assert.equal(await second, true)
  pending[0]({ records: [{ id: 1, storeName: '旧门店' }] })
  assert.equal(await first, false)
  assert.equal(stores.defaultStoreId.value, '2')
  assert.equal(stores.resolveStoreId(1), undefined)
})
