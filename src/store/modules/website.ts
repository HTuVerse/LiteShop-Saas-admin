import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchPublicWebsiteConfig } from '@/api/website-config'
import { applyWebsiteConfig, website, type PublicWebsiteConfig } from '@/config/website'

export const useWebsiteStore = defineStore('website', () => {
  const loaded = ref(false)
  const error = ref('')
  const watermarkHidden = ref(false)
  let fetchedAt = 0
  let pending: Promise<void> | undefined
  function accept(config: PublicWebsiteConfig) {
    if (loaded.value && config.revision < website.revision) return
    applyWebsiteConfig(config)
    fetchedAt = Date.now()
    loaded.value = true
    error.value = ''
  }
  function refresh(force = false): Promise<void> {
    if (pending) return pending
    if (!force && Date.now() - fetchedAt < 60_000) return Promise.resolve()
    pending = fetchPublicWebsiteConfig()
      .then(accept)
      .catch(() => {
        error.value = '网站配置加载失败，请检查配置服务后重试'
      })
      .finally(() => {
        pending = undefined
      })
    return pending
  }
  function published(config: PublicWebsiteConfig) {
    accept(config)
    // Notify other tabs to fetch the public allowlist, never broadcast administrative settings.
    try {
      localStorage.setItem('liteshop-website-published', String(Date.now()))
    } catch {
      /* optional */
    }
  }
  return { config: website, loaded, error, watermarkHidden, refresh, published }
})
