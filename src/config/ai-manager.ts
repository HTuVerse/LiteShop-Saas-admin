export interface AiManagerQuestionPreset {
  label: string
  question: string
  capability:
    | 'salesOverview'
    | 'dishPerformance'
    | 'storeComparison'
    | 'memberAnalysis'
    | 'inventoryAnalysis'
}

/**
 * AI 智能问数预设问题。
 *
 * 页面只负责渲染与回填，运营文案统一在这里维护。
 */
export const AI_MANAGER_QUESTION_PRESETS: AiManagerQuestionPreset[] = [
  {
    label: '今天的营业情况怎么样？',
    question: '今天的营业情况怎么样？',
    capability: 'salesOverview'
  },
  {
    label: '最近30天菜品有什么风险？',
    question: '最近30天菜品有什么风险？',
    capability: 'dishPerformance'
  },
  {
    label: '哪些门店需要重点关注？',
    question: '请对比当前授权门店，找出需要重点关注的门店并说明原因。',
    capability: 'storeComparison'
  },
  {
    label: '近30天哪些菜品表现最好？',
    question: '近30天哪些菜品表现最好？请结合销量和可用的利润数据说明。',
    capability: 'dishPerformance'
  },
  {
    label: '今天需要做哪些经营动作？',
    question: '今天需要做哪些经营动作？',
    capability: 'salesOverview'
  },
  {
    label: '会员复购和沉睡情况如何？',
    question: '请分析近180天会员复购、活跃和沉睡情况，只使用匿名聚合数据，并给出改善建议。',
    capability: 'memberAnalysis'
  },
  {
    label: '哪些菜品有库存或售罄风险？',
    question: '请检查当前低库存和售罄菜品，按紧急程度给出补货或菜单调整建议。',
    capability: 'inventoryAnalysis'
  }
]
