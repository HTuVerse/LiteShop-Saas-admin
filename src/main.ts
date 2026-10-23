import App from './App.vue'
import { useUserStore } from '@/store/modules/user'
import { useWebsiteStore } from '@/store/modules/website'
import { createApp } from 'vue'
import { initStore } from './store'                 // Store
import { initRouter } from './router'               // Router
import language from './locales'                    // 国际化
import '@styles/core/tailwind.css'                  // tailwind
import '@styles/index.scss'                         // 样式
import '@utils/sys/console.ts'                      // 控制台输出内容
import { setupGlobDirectives } from './directives'
import { setupErrorHandle } from './utils/sys/error-handle'
import '@utils/ui/iconify-loader'

document.addEventListener(
  'touchstart',
  function () {},
  { passive: false }
)

const app = createApp(App)
initStore(app)
setupGlobDirectives(app)
setupErrorHandle(app)

app.use(language)
function bootstrap() {
  const site = useWebsiteStore()
  initRouter(app)
  // 锁屏密码只保存在内存中；刷新后要求重新登录，防止绕过锁屏。
  const session = useUserStore()
  if (session.isLock) session.logOut()
  app.mount('#app')
  void site.refresh()
  window.addEventListener('focus', () => void site.refresh())
  window.addEventListener('storage', event => {
    if (event.key === 'liteshop-website-published') void site.refresh(true)
  })
}
void bootstrap()
window.addEventListener('storage', event => {
  if (event.key !== 'liteshop-scope-change' || !event.newValue) return
  try {
    const change = JSON.parse(event.newValue)
    const session = useUserStore()
    if (session.isLogin && String(change.userId) === String(session.info.userId)) {
      session.clearBusinessState()
      window.location.reload()
    }
  } catch { /* Ignore malformed cross-tab notifications. */ }
})
