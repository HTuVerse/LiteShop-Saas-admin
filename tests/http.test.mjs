import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'
import axios from 'axios'
import { parseBackendJson } from '../src/utils/http/json.ts'

// Execute the real request module with an in-memory Axios adapter and an isolated store.
function commonJs(file, dependencies, replace = (s) => s) {
  const source = replace(fs.readFileSync(new URL(file, import.meta.url), 'utf8'))
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true
    }
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', js)(
    (id) => {
      if (!(id in dependencies)) throw Error('Unexpected dependency ' + id)
      return dependencies[id]
    },
    module,
    module.exports
  )
  return module.exports
}
const errors = commonJs('../src/utils/http/error.ts', {
  'element-plus': { ElMessage: { error() {} } },
  axios: axios,
  './status': { ApiStatus: {} },
  '@/locales': { $t: (key) => key }
})
function setup(adapter) {
  const messages = [],
    session = {
      accessToken: 'session-a',
      sessionRevision: 1,
      logouts: 0,
      logOut() {
        this.logouts++
        this.accessToken = ''
        this.sessionRevision++
      }
    }
  const fakeAxios = { ...axios, create: (config) => axios.create({ ...config, adapter }) }
  const request = commonJs(
    '../src/utils/http/index.ts',
    {
      axios: fakeAxios,
      '@/store/modules/user': { useUserStore: () => session },
      './json': { parseBackendJson },
      './error': errors,
      'element-plus': {
        ElMessage: { error: (x) => messages.push(x), success: (x) => messages.push(x) }
      }
    },
    (s) => s.replaceAll('import.meta.env.VITE_API_URL', JSON.stringify('/api'))
  ).default
  return { request, session, messages }
}
const response = (config, data) => ({ config, status: 200, statusText: 'OK', headers: {}, data })
test('anonymous login keeps query credentials, strips tokens and tenant impersonation headers', async () => {
  let seen
  const { request } = setup(async (config) => {
    seen = config
    return response(config, '{"code":"200","data":{"id":9223372036854775807}}')
  })
  const result = await request.post({
    url: '/user/admin/Login',
    params: { account: 'fixture', password: 'fixture' },
    anonymous: true,
    headers: {
      satoken: 'incorrect',
      'X-Tenant-Id': 'other',
      'X-Public-Tenant-Id': 'other',
      'X-Super-Admin': 'true'
    }
  })
  assert.equal(seen.params.account, 'fixture')
  assert.equal(seen.data, undefined)
  assert.equal(seen.headers.get('satoken'), undefined)
  assert.equal(seen.headers.get('X-Tenant-Id'), undefined)
  assert.equal(seen.headers.get('X-Public-Tenant-Id'), undefined)
  assert.equal(result.id, '9223372036854775807')
})
test('authenticated writes preserve explicit JSON and are never retried on failure', async () => {
  let count = 0,
    seen
  const { request } = setup(async (config) => {
    count++
    seen = config
    throw new axios.AxiosError('timeout', 'ECONNABORTED', config)
  })
  await assert.rejects(
    request.post({
      url: '/user/admin/recharge',
      data: { amount: 10 },
      params: { userId: '9223372036854775807' }
    }),
    /超时/
  )
  assert.equal(count, 1)
  assert.equal(seen.headers.get('satoken'), 'session-a')
  assert.equal(seen.params.userId, '9223372036854775807')
  assert.deepEqual(JSON.parse(seen.data), { amount: 10 })
})
test('401 clears a matching session exactly once', async () => {
  const { request, session } = setup(async (config) =>
    response(config, { code: '401', msg: 'expired' })
  )
  await assert.rejects(request.get({ url: '/user/getUserBasicInfo' }))
  assert.equal(session.logouts, 1)
  assert.equal(session.accessToken, '')
})
test('a late old-scope response cannot replace data or log out the new session', async () => {
  let finish
  const { request, session } = setup(
    (config) =>
      new Promise((resolve) => {
        finish = (data) => resolve(response(config, data))
      })
  )
  const waiting = request.get({ url: '/user/getUserBasicInfo' })
  session.sessionRevision++
  session.accessToken = 'session-b'
  finish({ code: 401, msg: 'expired old session' })
  await assert.rejects(waiting, (error) => axios.isCancel(error))
  assert.equal(session.accessToken, 'session-b')
  assert.equal(session.logouts, 0)
})
test('invalid gateway HTML fails explicitly; AI raw JSON is opt-in', async () => {
  const html = setup(async (config) => response(config, '<!doctype html>'))
  await assert.rejects(html.request.get({ url: '/user/list' }), /非预期/)
  const ai = setup(async (config) => response(config, { content: 'fixture' }))
  assert.deepEqual(await ai.request.post({ url: '/ai/chat', rawResponse: true }), {
    content: 'fixture'
  })
})
