// Run against the local fixture gateway (18080) and Vite (15173), never a live backend.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
const modulePath = process.env.PLAYWRIGHT_MODULE
const { chromium } = await import(modulePath ? pathToFileURL(modulePath).href : 'playwright')
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1680, height: 1050 } })
const page = await context.newPage()
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
let publicReads = 0
page.on('request', (request) => {
  if (request.url().includes('/config/website/public')) publicReads++
})
const checks = []
const pass = (name) => {
  checks.push(name)
  console.log('PASS ' + name)
}
await mkdir('.test-output', { recursive: true })
try {
  await page.goto('http://127.0.0.1:15173/auth/login')
  await page.getByPlaceholder('请输入账号 / 手机号 / 邮箱').fill('platform')
  await page.getByPlaceholder('请输入密码', { exact: true }).fill('mock123')
  await page.getByRole('button', { name: '验证并继续' }).click()
  await page.waitForURL('**/platform/website')
  await page.getByLabel('系统名称', { exact: true }).waitFor()
  await page.getByLabel('系统名称', { exact: true }).fill('LiteShop 运营中心')
  await page.getByRole('button', { name: '重置当前表单' }).click()
  assert.equal(await page.getByLabel('系统名称', { exact: true }).inputValue(), 'LiteShop')
  pass('重置恢复已发布配置')
  const reads = publicReads
  await page.getByRole('button', { name: 'SEO 展现', exact: true }).click()
  await page.getByRole('button', { name: '联系合规', exact: true }).click()
  assert.equal(publicReads, reads)
  pass('切换配置分组不重复请求公共配置')
  await page.getByLabel('系统名称', { exact: true }).fill('LiteShop 运营中心')
  await page.getByLabel('登录欢迎标题', { exact: true }).fill('欢迎使用商户运营中心')
  await page.getByLabel('SEO 标题', { exact: true }).fill('LiteShop 品牌站')
  await page.getByLabel('SEO 描述', { exact: true }).fill('统一管理门店、会员与订单。')
  await page.getByLabel('联系邮箱', { exact: true }).fill('support@example.com')
  await page.getByLabel('版权文案', { exact: true }).fill('Copyright © LiteShop')
  await page
    .locator('.el-switch')
    .filter({ has: page.getByRole('switch', { name: '启用公共水印', exact: true }) })
    .click()
  await page
    .locator('.el-switch')
    .filter({ has: page.getByRole('switch', { name: '图片验证码', exact: true }) })
    .click()
  await page
    .locator('.el-switch')
    .filter({ has: page.getByRole('switch', { name: '维护模式', exact: true }) })
    .click()
  const observer = await context.newPage()
  await observer.goto('http://127.0.0.1:15173/auth/login')
  await observer.getByRole('heading', { name: '欢迎回来', exact: true }).waitFor()
  await page.bringToFront()
  await page.getByRole('button', { name: '保存并发布配置' }).click()
  await page.getByText('网站配置已保存并发布', { exact: true }).waitFor()
  await observer.getByRole('heading', { name: '欢迎使用商户运营中心', exact: true }).waitFor()
  await observer.getByRole('img', { name: '图片验证码，点击刷新' }).waitFor()
  assert.equal(await observer.getByText('Copyright © LiteShop', { exact: true }).count(), 1)
  await observer.getByText('维护期间普通管理员暂停登录，超级管理员可继续登录处理维护。').waitFor()
  pass('跨标签页同步欢迎文案、验证码、维护公告和页脚')
  assert.match(await page.title(), /LiteShop 品牌站/)
  assert.equal(
    await page.locator('meta[name="description"]').getAttribute('content'),
    '统一管理门店、会员与订单。'
  )
  await page.locator('.website-watermark').waitFor()
  const formBounds = await observer.locator('.form-inner').boundingBox()
  const footerBounds = await observer.locator('.login-footer').boundingBox()
  assert.ok(footerBounds.y >= formBounds.y + formBounds.height, '页脚不应覆盖登录表单')
  assert.ok(footerBounds.width > 200, '页脚文案应正常横向排列')
  pass('发布后浏览器标题、SEO 摘要与全局水印生效')
  await page.reload()
  await page.getByLabel('系统名称', { exact: true }).waitFor()
  assert.equal(await page.getByLabel('系统名称', { exact: true }).inputValue(), 'LiteShop 运营中心')
  pass('刷新后重新读取发布配置')
  await page.getByRole('button', { name: '状态概览', exact: true }).click()
  await page.waitForFunction(
    () =>
      document.getElementById('website-overview').getBoundingClientRect().top >=
      document.getElementById('app-header').getBoundingClientRect().bottom
  )
  await page.screenshot({ path: '.test-output/website-desktop.png' })
  await page.getByRole('button', { name: '发布预览', exact: true }).click()
  await page.locator('#website-preview').screenshot({ path: '.test-output/website-preview.png' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: '状态概览', exact: true }).click()
  await page.screenshot({ path: '.test-output/website-mobile.png' })
  assert.ok(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
  )
  pass('窄屏无横向页面溢出')
  await observer.screenshot({ path: '.test-output/website-login.png' })
  assert.deepEqual(errors, [])
  pass('无浏览器运行时异常')
  await writeFile(
    '.test-output/website-ui-report.json',
    JSON.stringify({ checks, publicReads, errors, fixtureOnly: true }, null, 2)
  )
} catch (error) {
  await page.screenshot({ path: '.test-output/website-failure.png' })
  console.error('URL', page.url(), 'PAGE ERRORS', errors)
  throw error
} finally {
  await browser.close()
}
