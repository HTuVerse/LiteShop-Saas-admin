// AI 经营诊断仪表盘的纯函数：请求上下文构造与动态结果的分区布局，供页面与测试复用。
import type {
  AiDashboardCard,
  AiDashboardResult,
  AiDashboardScore,
  AiManagerRequest
} from '@/api/ai'

export type DiagnosisScopeType = 'TENANT' | 'STORE'
export type DiagnosisTimeRange = AiManagerRequest['timeRange']

/** 诊断记录查询参数，与后端 /diagnosis-records 接口对齐。 */
export interface DiagnosisParams {
  scopeType: DiagnosisScopeType
  storeId: number | string | undefined
  timeRange: DiagnosisTimeRange
}

/** 不可变的诊断请求上下文，生成、历史与轮询共用同一份快照，避免串屏。 */
export interface DiagnosisContext {
  scopeType: DiagnosisScopeType
  storeId: number | string | undefined
  timeRange: DiagnosisTimeRange
  /** 直接用于请求的参数 */
  params: DiagnosisParams
  /** 上下文唯一 key，用于区分新旧请求 */
  key: string
}

/** 四种现有周期及其界面文案。 */
export const DIAGNOSIS_TIME_RANGES: { value: DiagnosisTimeRange; label: string }[] = [
  { value: 'TODAY', label: '今日' },
  { value: 'YESTERDAY', label: '昨日' },
  { value: 'WEEK', label: '本周至今' },
  { value: 'MONTH', label: '本月至今' }
]

/** 返回周期的中文标签，未知周期回落到“今日”。 */
export function diagnosisTimeRangeLabel(timeRange?: string): string {
  return DIAGNOSIS_TIME_RANGES.find((item) => item.value === timeRange)?.label || '今日'
}

/**
 * 构造诊断请求上下文；门店范围缺少门店 ID 时返回 null，表示无法发起有效请求。
 * 门店只在 STORE 范围保留，TENANT 范围忽略门店，避免跨范围串数据。
 */
export function createDiagnosisContext(
  scopeType: DiagnosisScopeType,
  storeId: number | string | undefined,
  timeRange: DiagnosisTimeRange
): DiagnosisContext | null {
  const normalizedStore = scopeType === 'STORE' ? storeId : undefined
  if (scopeType === 'STORE' && !normalizedStore) return null
  return {
    scopeType,
    storeId: normalizedStore,
    timeRange,
    params: { scopeType, storeId: normalizedStore, timeRange },
    key: `${scopeType}:${normalizedStore ?? ''}:${timeRange}`
  }
}

/** 判断某上下文是否仍是当前上下文，用于拦截迟到的旧请求结果。 */
export function isCurrentDiagnosis(
  context: DiagnosisContext | null | undefined,
  current: DiagnosisContext | null | undefined
): boolean {
  return Boolean(context && current && context.key === current.key)
}

export type DiagnosisSectionId =
  | 'metrics'
  | 'problems'
  | 'opportunities'
  | 'visuals'
  | 'suggestions'
  | 'narratives'

export interface DiagnosisSection {
  id: DiagnosisSectionId
  title: string
  cards: AiDashboardCard[]
}

/** 分区后的可展示布局，顶层顺序稳定，区域内容由有效卡片决定。 */
export interface DiagnosisLayout {
  headline: string
  report: string
  score?: AiDashboardScore
  sections: DiagnosisSection[]
  /** 是否包含真实数据块（指标/图表/表格） */
  hasData: boolean
}

const SECTION_META: { id: DiagnosisSectionId; title: string }[] = [
  { id: 'metrics', title: '关键指标' },
  { id: 'problems', title: '诊断问题' },
  { id: 'opportunities', title: '改善机会' },
  { id: 'visuals', title: '数据图表与明细' },
  { id: 'suggestions', title: '行动建议' },
  { id: 'narratives', title: '诊断说明' }
]

function sectionOf(card: AiDashboardCard): DiagnosisSectionId {
  switch (card.type) {
    case 'METRIC':
      return 'metrics'
    case 'RISK':
      return 'problems'
    case 'OPPORTUNITY':
      return 'opportunities'
    case 'CHART':
    case 'TABLE':
      return 'visuals'
    case 'SUGGESTION':
      return 'suggestions'
    default:
      // NARRATIVE 及旧快照未知类型统一归入说明区，保证不崩。
      return 'narratives'
  }
}

/** 判断卡片是否承载真实可核验数据块。 */
export function cardHasData(card: AiDashboardCard): boolean {
  if (card.type === 'METRIC') return Boolean(card.value)
  if (card.type === 'CHART') return Boolean(card.chart?.series?.length)
  if (card.type === 'TABLE') return Boolean(card.table?.rows?.length)
  return false
}

/**
 * 把模型诊断结果按经营价值分区并稳定排序，不修改事实或结论。
 * 兼容旧快照：无 score、未知卡片类型、缺字段均安全降级。
 */
export function buildDiagnosisLayout(result?: AiDashboardResult | null): DiagnosisLayout {
  const cards = Array.isArray(result?.cards) ? result!.cards : []
  // 稳定排序：先按 order，再保持原始下标，避免相同 order 时顺序抖动。
  const sorted = cards
    .map((card, index) => ({ card, index }))
    .sort((a, b) => {
      const orderA = Number.isFinite(a.card.order) ? a.card.order : Number.MAX_SAFE_INTEGER
      const orderB = Number.isFinite(b.card.order) ? b.card.order : Number.MAX_SAFE_INTEGER
      return orderA - orderB || a.index - b.index
    })
    .map((item) => item.card)

  const buckets = new Map<DiagnosisSectionId, AiDashboardCard[]>()
  for (const card of sorted) {
    const id = sectionOf(card)
    const list = buckets.get(id) || []
    list.push(card)
    buckets.set(id, list)
  }

  const sections = SECTION_META.map(({ id, title }) => ({
    id,
    title,
    cards: buckets.get(id) || []
  })).filter((section) => section.cards.length > 0)

  return {
    headline: result?.headline || '',
    report: result?.report || '',
    score: result?.score,
    sections,
    hasData: sorted.some(cardHasData)
  }
}
