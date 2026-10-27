import { computed } from 'vue'
import type { Router } from 'vue-router'
import { useEntitlementStore } from '@/store/modules/entitlement'
import type { AiManagerEvidence, AiStatus } from '@/api/ai'

/** AI 店长调用次数额度，剩余不足 1 次时视为无额度。 */
export function useAiQuota() {
  const entitlementStore = useEntitlementStore()
  const callQuota = computed(() => entitlementStore.getFeature('ai_manager_calls'))
  const hasQuota = computed(
    () =>
      callQuota.value?.unlimited || (callQuota.value?.remaining ?? Number.POSITIVE_INFINITY) >= 1
  )
  return { callQuota, hasQuota }
}

/** 将 AI 店长状态原因转换为面向用户的统一提示文案，模型可用时返回空串。 */
export function resolveAiStatusMessage(
  status: Pick<AiStatus, 'enabled' | 'reason' | 'message'>
): string {
  if (status.enabled) return ''
  switch (status.reason) {
    case 'NOT_ENTITLED':
      return '当前租户暂未开通 AI 店长，请升级套餐或联系平台管理员加购。'
    case 'QUOTA_EXCEEDED':
      return 'AI 生成额度已用完，请升级套餐或购买次数包后重试。'
    case 'RATE_LIMITED':
      return 'AI 服务请求过于频繁，请稍后再试。'
    default:
      return status.message || 'AI 店长暂不可用，请联系平台管理员。'
  }
}

interface EvidenceScope {
  scopeType: 'TENANT' | 'STORE'
  storeId?: number | string
}

/**
 * 经营证据跳转到对应分析页。
 *
 * @param fallbackPath 证据未带来源页时的兜底路径；不传则无来源页不跳转。
 */
export function useAiEvidenceNavigator(
  router: Router,
  context: () => EvidenceScope,
  fallbackPath?: string
) {
  return function openEvidence(evidence: AiManagerEvidence) {
    const path = evidence.sourcePage?.startsWith('/') ? evidence.sourcePage : fallbackPath
    if (!path) return
    const { scopeType, storeId } = context()
    router.push({
      path,
      query: {
        scopeType,
        storeId: scopeType === 'STORE' ? String(storeId || '') : undefined,
        metricCode: evidence.metricCode,
        periodStart: evidence.periodStart,
        periodEnd: evidence.periodEnd
      }
    })
  }
}
