import fs from 'node:fs'
import path from 'node:path'
import { Linter } from 'eslint'
import globals from 'globals'

const expectedRuntimeGlobals = [
  'define', // AMD feature detection in third-party editors
  'WorkerGlobalScope',
  'WebKitCSSMatrix',
  'wx', // optional WeChat runtime
  '__INTLIFY_PROD_DEVTOOLS__',
  '__VUE_I18N_LEGACY_API__',
  '__VUE_I18N_FULL_INSTALL__',
  '__INTLIFY_JIT_COMPILATION__',
  '__INTLIFY_DROP_MESSAGE_COMPILER__'
]
const bundleGlobals = Object.fromEntries(expectedRuntimeGlobals.map((name) => [name, 'readonly']))
const assets = 'dist/assets'
if (!fs.existsSync(assets)) throw new Error('dist/assets 不存在，请先运行 Vite 构建')
const linter = new Linter()
const errors = []
for (const file of fs.readdirSync(assets).filter((name) => name.endsWith('.js'))) {
  const messages = linter.verify(
    fs.readFileSync(path.join(assets, file), 'utf8'),
    {
      languageOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        globals: { ...globals.browser, ...globals.node, ...bundleGlobals }
      },
      rules: { 'no-undef': 'error' }
    },
    { filename: file }
  )
  for (const message of messages)
    errors.push({ file, line: message.line, column: message.column, message: message.message })
}
if (errors.length) {
  console.error(JSON.stringify(errors.slice(0, 20), null, 2))
  throw new Error(`生产资源存在 ${errors.length} 处未定义引用`)
}
console.log(
  `Production bundle check passed: ${
    fs.readdirSync(assets).filter((name) => name.endsWith('.js')).length
  } JavaScript assets, 0 unexpected globals`
)
