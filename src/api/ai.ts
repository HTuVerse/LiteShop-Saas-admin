import request from '@/utils/http'

export interface AiManagerStoreOption {
  storeId: number | string
  storeName: string
  status?: number | string
}

export interface AiStatus {
  enabled: boolean
  reason: string
  message: string
  canConfigure: boolean
}

export interface AiManagerScope {
  tenantViewAvailable: boolean
  restricted: boolean
  defaultScopeType: 'TENANT' | 'STORE'
  defaultStoreId?: number | string
  stores: AiManagerStoreOption[]
}

export interface AiManagerCapabilities {
  salesOverview: boolean
  dishPerformance: boolean
  storeComparison: boolean
  memberAnalysis: boolean
  inventoryAnalysis: boolean
  marketingPrediction?: boolean
}

export interface AiManagerRequest {
  /** 网络重试复用同一个 ID。 */
  requestId?: string
  scopeType: 'TENANT' | 'STORE'
  storeId?: number | string
  timeRange: 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH'
  message?: string
  budget?: number
  history?: { role: 'user' | 'assistant'; content: string }[]
  sessionId?: number | string
  referenceRequestId?: string
}

export interface AiAdvisorSession {
  id: number | string
  title: string
  initialRequestId?: string
  scopeType: 'TENANT' | 'STORE'
  storeId?: number | string
  status: 'ACTIVE' | 'ARCHIVED'
  diagnosisRequestId?: string
  lastMessageAt: string
  createdAt: string
  updatedAt: string
}

export interface AiAdvisorMessageRound {
  requestId: string
  sessionId: number | string
  question: string
  responseJson?: string
  status: 'PROCESSING' | 'SUCCEEDED' | 'FAILED'
  failureMessage?: string
  feedback?: AiFeedback
  createdAt: string
  updatedAt: string
}

export type AiFeedback = 'USEFUL' | 'NOT_USEFUL' | 'IGNORED'

export interface AiAdvisorReply {
  /** 本轮问答的请求ID，直接用于提交反馈。 */
  requestId: string
  session: AiAdvisorSession
  result: AiManagerResult
}

export interface AiPage<T> {
  records: T[]
  total: number
  current: number
  size: number
}

export interface AiManagerEvidence {
  level: 'INFO' | 'WARNING' | 'OPPORTUNITY'
  title: string
  detail: string
  metricCode?: string
  metricName?: string
  value?: number | string
  unit?: string
  periodStart?: string
  periodEnd?: string
  comparisonValue?: number | string
  changeRate?: number
  sampleSize?: number
  sourceUpdatedAt?: string
  sourcePage?: string
}

export interface AiManagerAction {
  title: string
  description: string
  risk: string
  requiresConfirmation: boolean
}

export interface AiManagerKeyPoint {
  title: string
  detail: string
}

/** 仪表盘图表的一组数据序列。 */
export interface AiDashboardChartSeries {
  name: string
  data: number[]
}

/** AI 自适应图表定义，数据点来自后端工具返回的真实序列。 */
export interface AiDashboardChart {
  /** 图表类型：折线、柱状、条形、环形、漏斗、热力 */
  chartType: 'LINE' | 'BAR' | 'HBAR' | 'RING' | 'FUNNEL' | 'HEATMAP'
  /** 维度或 X 轴分类 */
  categories?: string[]
  series: AiDashboardChartSeries[]
  unit?: string
}

/** 仪表盘表格列定义，列由模型按数据字段决定，后端限制数量并校验。 */
export interface AiDashboardTableColumn {
  key?: string
  label: string
  /** 对齐方式 */
  align?: 'left' | 'center' | 'right'
  /** 是否数值列 */
  numeric?: boolean
}

/** AI 自适应表格定义，单元格来自后端工具返回的真实数据。 */
export interface AiDashboardTable {
  columns: AiDashboardTableColumn[]
  /** 数据行，单元格顺序与列一致 */
  rows: string[][]
}

/** AI 自适应仪表盘卡片，类型/数量/顺序/尺寸均由模型决定。 */
export interface AiDashboardCard {
  id: string
  /** 卡片类型：指标、风险、机会、建议、叙述、图表、表格 */
  type: 'METRIC' | 'RISK' | 'OPPORTUNITY' | 'SUGGESTION' | 'NARRATIVE' | 'CHART' | 'TABLE'
  level: 'INFO' | 'WARNING' | 'OPPORTUNITY'
  /** 展示顺序，越小越靠前 */
  order: number
  /** 布局尺寸 */
  size: 'SM' | 'MD' | 'LG' | 'XL'
  title: string
  body?: string
  metricCode?: string
  metricName?: string
  value?: string
  unit?: string
  changeRate?: number
  /** 证据下钻来源页 */
  sourcePage?: string
  /** 关联的其它卡片 id，实现结论与证据关联 */
  evidenceRefs?: string[]
  chart?: AiDashboardChart
  table?: AiDashboardTable
}

/** AI 诊断评分的维度子项。 */
export interface AiDashboardScoreDimension {
  name: string
  /** 维度得分 0-100 */
  score: number
  comment?: string
}

/** AI 经营诊断综合评分，属 AI 整体判断标签。 */
export interface AiDashboardScore {
  /** 总分 0-100 */
  overall: number
  /** 等级，如 优秀/良好/一般/较差 */
  grade: string
  comment?: string
  dimensions?: AiDashboardScoreDimension[]
}

/** AI 经营诊断仪表盘结果。 */
export interface AiDashboardResult {
  headline: string
  report: string
  /** 综合诊断评分，旧快照可能没有 */
  score?: AiDashboardScore
  cards: AiDashboardCard[]
}

/** 智能问数回复中的紧凑排行卡。 */
export interface AiChatRankingCard {
  type: 'RANKING'
  title: string
  period?: string
  metricCode?: string
  items: { name: string; value: string; unit?: string; percent?: number }[]
}

/** 智能问数回复中的原因说明卡。 */
export interface AiChatInsightCard {
  type: 'INSIGHT_LIST'
  title: string
  period?: string
  items: { icon?: string; title: string; detail: string }[]
}

/** 智能问数回复中的数据图表卡。 */
export interface AiChatChartCard {
  type: 'CHART'
  title: string
  period?: string
  metricCode?: string
  chart: AiDashboardChart
}

export type AiChatCard = AiChatRankingCard | AiChatInsightCard | AiChatChartCard

export interface AiChatView {
  tip?: string
  cards?: AiChatCard[]
  followUps?: string[]
}

export interface AiManagerResult {
  type: 'BRIEFING' | 'DISH_ADVICE' | 'MARKETING_DRAFT' | 'CHAT' | 'DIAGNOSIS_DASHBOARD'
  title: string
  content: string
  /** 新版简报和菜品顾问使用结构化要点；旧历史记录仍可能只有 content。 */
  keyPoints?: AiManagerKeyPoint[]
  scope: Record<string, unknown>
  evidence: AiManagerEvidence[]
  actions: AiManagerAction[]
  modelGenerated: boolean
  generatedAt: string
  /** AI 经营诊断自适应仪表盘，仅动态诊断结果填充。 */
  dashboard?: AiDashboardResult
  /** 智能问数的可选富回复，旧会话可能没有。 */
  chatView?: AiChatView
}

export interface AiManagerRecord {
  requestId: string
  operation: 'BRIEFING' | 'DISH_ADVICE' | 'DIAGNOSIS_DASHBOARD'
  status: 'PROCESSING' | 'SUCCEEDED' | 'FAILED'
  scopeType: 'TENANT' | 'STORE'
  storeId?: number | string
  timeRange: AiManagerRequest['timeRange']
  periodKey: string
  createdAt: string
  updatedAt: string
  failureCode?: string
  failureMessage?: string
  retryable?: boolean
  result?: AiManagerResult
}

export interface AiInsightSubmission {
  requestId: string
  briefingRequestId: string
  dishAdviceRequestId: string
  status: 'PROCESSING'
}

/** AI 经营诊断后台生成的提交结果，前端据此轮询诊断记录。 */
export interface AiDashboardSubmission {
  requestId: string
  status: 'PROCESSING' | 'SUCCEEDED' | 'FAILED'
}

export const getAiStatus = () =>
  request.get<AiStatus>({ url: '/ai/manager/status', rawResponse: true, showErrorMessage: false })

export const getAiManagerScope = () =>
  request.get<AiManagerScope>({
    url: '/ai/manager/scope',
    rawResponse: true,
    showErrorMessage: false
  })

export const getAiManagerCapabilities = () =>
  request.get<AiManagerCapabilities>({
    url: '/ai/manager/capabilities',
    rawResponse: true,
    showErrorMessage: false
  })

const pendingRequests = new Map<string, { id: string; expiresAt: number }>()

const postManager = async <T = AiManagerResult>(
  url: string,
  data: AiManagerRequest,
  signal?: AbortSignal
) => {
  for (const [pendingKey, item] of pendingRequests)
    if (item.expiresAt <= Date.now()) pendingRequests.delete(pendingKey)
  const { requestId: explicitId, ...payload } = data
  const key = `${url}:${JSON.stringify(payload)}`
  const pending = pendingRequests.get(key)
  const requestId =
    explicitId || (pending && pending.expiresAt > Date.now() ? pending.id : crypto.randomUUID())
  if (!explicitId) pendingRequests.set(key, { id: requestId, expiresAt: Date.now() + 5 * 60_000 })
  try {
    const result = await request.post<T>({
      url,
      data: { ...payload, requestId },
      rawResponse: true,
      timeout: 90000,
      showErrorMessage: false,
      signal
    })
    pendingRequests.delete(key)
    return result
  } catch (error: any) {
    const code = Number(error?.code || error?.response?.status)
    const processing = code === 409 && /(?:正在生成|仍在生成)/.test(String(error?.message || ''))
    // 超时或中断时，服务端可能已生成；短期重试沿用原 ID 读取已保存结果。
    if (!signal?.aborted && !processing && Number.isFinite(code) && code > 0)
      pendingRequests.delete(key)
    throw error
  }
}

export const getAiManagerBriefing = (data: AiManagerRequest, signal?: AbortSignal) =>
  postManager('/ai/manager/briefing', data, signal)

export const getAiManagerDishAdvice = (data: AiManagerRequest, signal?: AbortSignal) =>
  postManager('/ai/manager/dish-advice', data, signal)

/** 提交 AI 经营诊断后台生成任务，立即返回请求ID；离开页面后仍会继续生成并落库快照。 */
export const generateAiDashboard = (data: AiManagerRequest, signal?: AbortSignal) =>
  postManager<AiDashboardSubmission>('/ai/manager/diagnosis-dashboard', data, signal)

/** 查询当前范围和周期的经营诊断记录（含成功、失败与进行中），用于自动恢复与历史回看。 */
export const getAiDiagnosisRecords = (params: {
  scopeType: AiManagerRequest['scopeType']
  storeId?: number | string
  timeRange: AiManagerRequest['timeRange']
}) =>
  request.get<AiManagerRecord[]>({
    url: '/ai/manager/diagnosis-records',
    params,
    rawResponse: true,
    showErrorMessage: false
  })

export const startAiManagerInsights = (data: AiManagerRequest) =>
  request.post<AiInsightSubmission>({
    url: '/ai/manager/insights',
    data: { ...data, requestId: data.requestId || crypto.randomUUID() },
    rawResponse: true,
    showErrorMessage: false
  })

export const getAiManagerRecords = (params: {
  scopeType: AiManagerRequest['scopeType']
  storeId?: number | string
  timeRange: AiManagerRequest['timeRange']
}) =>
  request.get<AiManagerRecord[]>({
    url: '/ai/manager/records',
    params,
    rawResponse: true,
    showErrorMessage: false
  })

export const createAiMarketingDraft = (data: AiManagerRequest, signal?: AbortSignal) =>
  postManager('/ai/manager/marketing-draft', data, signal)

export const askAiManager = (data: AiManagerRequest, signal?: AbortSignal) =>
  postManager<AiAdvisorReply>('/ai/manager/chat', data, signal)

export const createAiAdvisorSession = (data: Partial<AiAdvisorSession>) =>
  request.post<AiAdvisorSession>({
    url: '/ai/manager/advisor/sessions',
    data,
    rawResponse: true,
    showErrorMessage: false
  })

export const getAiAdvisorSessions = (params: {
  currentPage: number
  pageSize: number
  status?: 'ACTIVE' | 'ARCHIVED'
}) =>
  request.get<AiPage<AiAdvisorSession>>({
    url: '/ai/manager/advisor/sessions',
    params,
    rawResponse: true,
    showErrorMessage: false
  })

export const updateAiAdvisorSession = (
  id: number | string,
  data: Pick<Partial<AiAdvisorSession>, 'title' | 'status'>
) =>
  request.post<AiAdvisorSession>({
    url: `/ai/manager/advisor/sessions/${id}`,
    data,
    rawResponse: true,
    showErrorMessage: false
  })

export const getAiAdvisorMessages = (id: number | string) =>
  request.get<AiAdvisorMessageRound[]>({
    url: `/ai/manager/advisor/sessions/${id}/messages`,
    rawResponse: true,
    showErrorMessage: false
  })

export const feedbackAiManagerRecord = (requestId: string, feedback: AiFeedback) =>
  request.post<{ requestId: string; feedback: AiFeedback }>({
    url: `/ai/manager/records/${requestId}/feedback`,
    data: { feedback },
    rawResponse: true,
    showErrorMessage: false
  })
