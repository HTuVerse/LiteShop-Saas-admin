<template>
  <ElConfigProvider
    size="default"
    :locale="locales[language]"
    :z-index="3000"
    :card="{
      shadow: 'never'
    }"
  >
    <RouterView></RouterView>
  </ElConfigProvider>
</template>

<script setup lang="ts">
  import { useUserStore } from './store/modules/user'
  import { useEntitlementStore } from './store/modules/entitlement'
  import { useAnnouncementStore } from './store/modules/announcement'
  import zh from 'element-plus/es/locale/lang/zh-cn'
  import en from 'element-plus/es/locale/lang/en'
  import { systemUpgrade } from './utils/sys'
  import { toggleTransition } from './utils/ui/animation'
  import { checkStorageCompatibility } from './utils/storage'
  import { initializeTheme } from './hooks/core/useTheme'
  import { website } from '@/config/website'
  import { LanguageEnum } from '@/enums/appEnum'
  import { useI18n } from 'vue-i18n'
  import { useRoute } from 'vue-router'
  import { setPageTitle } from '@/utils/router'

  const userStore = useUserStore()
  const entitlementStore = useEntitlementStore()
  const announcementStore = useAnnouncementStore()
  const { language } = storeToRefs(userStore)
  const { locale } = useI18n()
  const route = useRoute()
  watchEffect(() => {
    if (!userStore.languageSelected) userStore.language = website.defaultLanguage as LanguageEnum
    locale.value = userStore.language
    document.documentElement.lang = userStore.language === 'zh' ? 'zh-CN' : 'en'
  })
  watchEffect(() => {
    const values = {
      description: website.seoDescription || website.description,
      keywords: website.seoKeywords,
      'application-name': website.systemName
    }
    for (const [name, content] of Object.entries(values)) {
      let meta = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
      if (!meta) {
        meta = document.createElement('meta')
        meta.name = name
        document.head.append(meta)
      }
      meta.content = content
    }
  })
  watch(
    () => [website.systemName, website.seoTitle],
    () => setPageTitle(route)
  )
  watch(
    () => [userStore.isLogin, userStore.scopeKey] as const,
    ([isLogin]) => {
      const tenantId = userStore.activeTenant?.id || userStore.info.tenantId
      if (!isLogin || !tenantId) {
        entitlementStore.clear()
        return
      }
      entitlementStore.refresh().catch(() => entitlementStore.clear())
    },
    { immediate: true }
  )
  watch(
    () => [userStore.isLogin, userStore.scopeKey, userStore.accessToken] as const,
    ([isLogin]) => {
      if (!isLogin) {
        announcementStore.clear()
        return
      }
      announcementStore.refresh().catch(() => undefined)
      announcementStore.connect()
    },
    { immediate: true }
  )

  const locales = {
    zh: zh,
    en: en
  }

  onBeforeMount(() => {
    toggleTransition(true)
    initializeTheme()
  })

  onMounted(() => {
    checkStorageCompatibility()
    toggleTransition(false)
    systemUpgrade()
  })
  onBeforeUnmount(() => announcementStore.disconnect())
</script>
