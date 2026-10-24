import { nextTick } from 'vue'
import { useSettingStore } from '@/store/modules/setting'
import { Router } from 'vue-router'
import NProgress from 'nprogress'
import { useCommon } from '@/hooks/core/useCommon'
import { loadingService } from '@/utils/ui'
import { getPendingLoading, resetPendingLoading } from './beforeEach'
import { useUserStore } from '@/store/modules/user'

let monitorHeartbeatStarted = false

function pulseBusinessMonitor(visit: boolean) {
  if (!useUserStore().accessToken) return
  void import('@/api/system-monitor')
    .then(({ sendMonitorPulse }) => sendMonitorPulse('B', visit))
    .catch(() => {})
}

/** 路由全局后置守卫 */
export function setupAfterEachGuard(router: Router) {
  const { scrollToTop } = useCommon()

  if (!monitorHeartbeatStarted) {
    monitorHeartbeatStarted = true
    window.setInterval(() => {
      if (document.visibilityState === 'visible') pulseBusinessMonitor(false)
    }, 60_000)
  }

  router.afterEach((to, from, failure) => {
    if (!failure && to.fullPath !== from.fullPath && !to.path.startsWith('/auth/'))
      pulseBusinessMonitor(true)
    scrollToTop()

    // 关闭进度条
    const settingStore = useSettingStore()
    if (settingStore.showNprogress) {
      NProgress.done()
      // 确保进度条完全移除，避免残影
      setTimeout(() => {
        NProgress.remove()
      }, 600)
    }

    // 关闭 loading 效果
    if (getPendingLoading()) {
      nextTick(() => {
        loadingService.hideLoading()
        resetPendingLoading()
      })
    }
  })
}
