import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  getMyEntitlements,
  type EffectiveEntitlementItem,
  type EffectiveEntitlements
} from '@/api/saas'

/** 当前租户的 SaaS 权益。切换租户时由 App.vue 自动刷新。 */
export const useEntitlementStore = defineStore('entitlementStore', () => {
  const current = ref<EffectiveEntitlements | null>(null)
  const loading = ref(false)
  let requestRevision = 0

  const features = computed(() => current.value?.features || {})

  const hasFeature = (featureCode: string) => features.value[featureCode]?.enabled === true

  const getFeature = (featureCode: string): EffectiveEntitlementItem | undefined =>
    features.value[featureCode]

  const getQuota = (featureCode: string) => {
    const feature = getFeature(featureCode)
    if (!feature || !feature.enabled) return null
    return {
      limit: feature.limit ?? null,
      used: feature.used ?? 0,
      remaining: feature.remaining ?? null,
      unlimited: feature.unlimited
    }
  }

  const clear = () => {
    requestRevision++
    current.value = null
    loading.value = false
  }

  const refresh = async () => {
    const revision = ++requestRevision
    loading.value = true
    try {
      const result = await getMyEntitlements()
      if (revision === requestRevision) current.value = result
      return result
    } finally {
      if (revision === requestRevision) loading.value = false
    }
  }

  return { current, features, loading, hasFeature, getFeature, getQuota, refresh, clear }
})
