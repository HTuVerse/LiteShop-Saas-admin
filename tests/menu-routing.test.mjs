import test from 'node:test'
import assert from 'node:assert/strict'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createRouter, createMemoryHistory, RouterView } from 'vue-router'
import { RouteTransformer } from '../src/router/core/RouteTransformer.ts'
import { RouteValidator } from '../src/router/core/RouteValidator.ts'

test('nested database directories render one application shell and preserve moved page URLs', async () => {
  const shell = { render: () => h('section', { 'data-app-shell': '' }, [h(RouterView)]) }
  const page = { render: () => h('main', 'moved page content') }
  const loader = {
    load: (name) => async () => name === '/index/index' ? shell : page,
    loadLayout: () => async () => shell
  }
  const source = {
    id: '1',
    name: 'root',
    path: '/new-directory',
    component: '/index/index',
    meta: { title: 'root' },
    children: [
      {
        id: '2',
        name: 'nested',
        path: '/old-directory',
        component: '/index/index',
        meta: { title: 'nested' },
        children: [
          {
            id: '3',
            name: 'page',
            path: '/system/user',
            component: '/system/user/index',
            meta: { title: 'page' }
          }
        ]
      }
    ]
  }
  assert.equal(new RouteValidator().validate([source]).valid, true)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [new RouteTransformer(loader).transform(source)]
  })
  await router.push('/system/user')
  await router.isReady()
  assert.deepEqual(
    router.currentRoute.value.matched.map((r) => r.name),
    ['root', 'nested', 'page']
  )
  const html = await renderToString(createSSRApp({ render: () => h(RouterView) }).use(router))
  assert.equal((html.match(/data-app-shell/g) || []).length, 1)
  assert.ok(html.includes('moved page content'))
})
