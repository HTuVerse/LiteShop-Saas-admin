<template>
  <section class="ai-analysis-page">
    <AnalysisHero
      :greeting="greeting"
      :date-text="dateText"
      :scope-label="currentScopeLabel"
      :period-label="currentPeriodLabel"
      :data-cutoff="dataCutoffText"
      :analyzed="hasAnalyzed"
      :loading="loading"
      :disabled-analyze="!canAnalyze"
      @analyze="runDiagnosis"
    >
      <template #controls>
        <span class="control-label">经营范围</span>
        <ElSelect
          v-model="scopeType"
          class="scope-select"
          aria-label="经营范围"
          :disabled="statusLoading"
          @change="handleScopeChange"
        >
          <template #prefix><ArtSvgIcon icon="ri:building-2-line" /></template>
          <ElOption v-if="scope?.tenantViewAvailable" label="租户总部" value="TENANT" />
          <ElOption label="单门店" value="STORE" />
        </ElSelect>
        <ElSelect
          v-if="scopeType === 'STORE'"
          v-model="storeId"
          class="store-select"
          aria-label="选择门店"
          placeholder="选择门店"
          :disabled="statusLoading"
        >
          <template #prefix><ArtSvgIcon icon="ri:store-2-line" /></template>
          <ElOption
            v-for="store in scope?.stores || []"
            :key="String(store.storeId)"
            :label="store.storeName"
            :value="store.storeId"
          />
        </ElSelect>
        <span class="control-label">诊断周期</span>
        <ElSelect
          v-model="timeRange"
          class="period-select"
          aria-label="诊断周期"
          :disabled="statusLoading"
        >
          <template #prefix><ArtSvgIcon icon="ri:calendar-2-line" /></template>
          <ElOption
            v-for="period in DIAGNOSIS_TIME_RANGES"
            :key="period.value"
            :label="period.label"
            :value="period.value"
          />
        </ElSelect>
        <div class="data-window-hint">
          <ArtSvgIcon icon="ri:magic-line" />AI 自动选取指标与图表
        </div>
        <ElButton class="history-button" :disabled="statusLoading" @click="historyVisible = true">
          <ArtSvgIcon icon="ri:history-line" />诊断记录
          <span v-if="records.length" class="history-count">{{ records.length }}</span>
        </ElButton>
      </template>
    </AnalysisHero>

    <ElAlert
      v-if="unavailableMessage && !statusLoading"
      :title="unavailableMessage"
      type="warning"
      :closable="false"
      show-icon
    >
      <template #default>
        <ElButton
          v-if="userStore.isSuperAdmin"
          link
          type="primary"
          @click="router.push('/platform/website#website-ai')"
          >去配置</ElButton
        >
      </template>
    </ElAlert>

    <div
      v-if="loading"
      class="dashboard-loading"
      v-loading="true"
      element-loading-text="AI 正在读取经营数据并生成诊断…"
    ></div>

    <DynamicDashboard
      v-else-if="dashboard"
      :result="dashboard"
      @evidence-click="openCardEvidence"
    />

    <ElAlert
      v-else-if="failureMessage"
      :title="failureMessage"
      type="error"
      :closable="false"
      show-icon
    >
      <template #default>
        <ElButton link type="primary" @click="runDiagnosis">重新诊断</ElButton>
      </template>
    </ElAlert>

    <ElEmpty
      v-else-if="!statusLoading && modelEnabled"
      description="点击右上角「开始经营诊断」，让 AI 自动分析当前经营状况"
    />

    <DiagnosisHistory
      v-model:visible="historyVisible"
      :records="records"
      :active-id="activeRequestId"
      @select="selectRecord"
    />
  </section>
</template>

<script setup lang="ts">
  import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
  import { ElMessage } from 'element-plus'
  import { useRouter } from 'vue-router'
  import {
    generateAiDashboard,
    getAiDiagnosisRecords,
    getAiManagerScope,
    getAiStatus,
    type AiDashboardCard,
    type AiDashboardResult,
    type AiManagerEvidence,
    type AiManagerRecord,
    type AiManagerRequest,
    type AiManagerScope
  } from '@/api/ai'
  import AnalysisHero from './modules/analysis-hero.vue'
  import DynamicDashboard from './modules/dynamic-dashboard.vue'
  import DiagnosisHistory from './modules/diagnosis-history.vue'
  import { useAiEvidenceNavigator, resolveAiStatusMessage } from '@/hooks'
  import { useUserStore } from '@/store/modules/user'
  import {
    DIAGNOSIS_TIME_RANGES,
    createDiagnosisContext,
    diagnosisTimeRangeLabel
  } from '@/utils/ai/diagnosis-dashboard'

  const router = useRouter()
  const userStore = useUserStore()

  const scope = ref<AiManagerScope>()
  const scopeType = ref<'TENANT' | 'STORE'>('TENANT')
  const storeId = ref<number | string>()
  // 诊断周期可切换，生成/历史/轮询共用同一上下文快照
  const timeRange = ref<AiManagerRequest['timeRange']>('TODAY')
  const dataCutoffText = ref('')
  const modelEnabled = ref(false)
  const unavailableMessage = ref('')
  const statusLoading = ref(true)
  const loading = ref(false)
  const hasAnalyzed = ref(false)
  const dashboard = ref<AiDashboardResult>()
  const records = ref<AiManagerRecord[]>([])
  const failureMessage = ref('')
  const historyVisible = ref(false)
  // 当前正在展示的记录ID，便于历史列表高亮
  const activeRequestId = ref('')

  let disposed = false
  let initVersion = 0
  let controller: AbortController | undefined

  // 生成、历史与轮询共用的不可变请求上下文快照
  const diagnosisContext = computed(() =>
    createDiagnosisContext(scopeType.value, storeId.value, timeRange.value)
  )

  const canLoad = () =>
    modelEnabled.value && Boolean(scope.value) && !disposed && Boolean(diagnosisContext.value)
  // 已取消调用次数额度限制：模型可用且范围就绪即可诊断
  const canAnalyze = computed(() => canLoad())

  const currentScopeLabel = computed(() => {
    if (scopeType.value === 'TENANT') return '租户总部'
    return (
      scope.value?.stores.find((item) => String(item.storeId) === String(storeId.value))
        ?.storeName || '单门店'
    )
  })

  const currentPeriodLabel = computed(() => diagnosisTimeRangeLabel(timeRange.value))

  const greeting = computed(() => {
    const hour = new Date().getHours()
    return hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好'
  })
  const dateText = computed(() =>
    new Intl.DateTimeFormat('zh-CN', { dateStyle: 'full' }).format(new Date())
  )

  // 证据下钻：复用传统分析页，默认回落到租户经营分析
  const openEvidence = useAiEvidenceNavigator(
    router,
    () => ({ scopeType: scopeType.value, storeId: storeId.value }),
    '/dashboard/tenantAnalyze'
  )
  function openCardEvidence(card: AiDashboardCard) {
    openEvidence({
      level: card.level,
      title: card.title,
      detail: card.body || '',
      metricCode: card.metricCode,
      sourcePage: card.sourcePage
    } as AiManagerEvidence)
  }

  function handleScopeChange() {
    if (scopeType.value === 'STORE' && !storeId.value)
      storeId.value = scope.value?.stores[0]?.storeId
  }

  function diagnosisParams(): Parameters<typeof getAiDiagnosisRecords>[0] {
    const context = diagnosisContext.value
    if (context) return context.params
    // 上下文无效（门店未选）时回落到原始选择，调用方已先行校验可用性
    return {
      scopeType: scopeType.value,
      storeId: scopeType.value === 'STORE' ? storeId.value : undefined,
      timeRange: timeRange.value
    }
  }

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  // 展示一条记录的快照（成功有仪表盘；失败显示失败原因）
  function applyRecord(record?: AiManagerRecord) {
    activeRequestId.value = record?.requestId || ''
    dataCutoffText.value = ''
    if (!record) {
      dashboard.value = undefined
      hasAnalyzed.value = false
      failureMessage.value = ''
      return
    }
    hasAnalyzed.value = true
    if (record.status === 'SUCCEEDED') {
      dashboard.value = record.result?.dashboard
      dataCutoffText.value = formatCutoff(record.result?.scope?.dataCutoffAt)
      failureMessage.value = record.result?.dashboard
        ? ''
        : 'AI 本次未返回可展示的诊断结果，请重新诊断。'
    } else if (record.status === 'FAILED') {
      dashboard.value = undefined
      failureMessage.value = record.failureMessage || '上次经营诊断生成失败，请重新诊断。'
    }
  }

  // 轮询诊断记录，直到目标请求完成或失败；进行中则持续等待
  async function pollUntilDone(requestId: string, signal: AbortSignal) {
    const deadline = Date.now() + 300_000
    for (;;) {
      if (signal.aborted || disposed) return
      let list: AiManagerRecord[]
      try {
        list = await getAiDiagnosisRecords(diagnosisParams())
      } catch {
        if (Date.now() > deadline) return
        await delay(3500)
        continue
      }
      if (signal.aborted || disposed) return
      records.value = list
      const row = list.find((item) => item.requestId === requestId)
      if (row && (row.status === 'SUCCEEDED' || row.status === 'FAILED')) {
        applyRecord(row)
        return
      }
      if (Date.now() > deadline) return
      await delay(3500)
    }
  }

  // 后台任务进行中时，前端自动进入加载态并轮询（支持离开后返回自动续传）
  function startTracking(requestId: string) {
    controller?.abort()
    controller = new AbortController()
    const signal = controller.signal
    loading.value = true
    hasAnalyzed.value = true
    failureMessage.value = ''
    activeRequestId.value = requestId
    pollUntilDone(requestId, signal)
      .catch(() => undefined)
      .finally(() => {
        if (!disposed && !signal.aborted) loading.value = false
      })
  }

  // 拉取当前范围的诊断记录：最新成功→展示；进行中→自动续传；失败→失败态
  async function loadRecords() {
    if (!modelEnabled.value || !scope.value || disposed || !diagnosisContext.value) return
    controller?.abort()
    controller = new AbortController()
    const signal = controller.signal
    try {
      const list = await getAiDiagnosisRecords(diagnosisParams())
      if (disposed || signal.aborted) return
      records.value = list
      const latest = list[0]
      if (!latest) {
        applyRecord(undefined)
        return
      }
      if (latest.status === 'PROCESSING') startTracking(latest.requestId)
      else applyRecord(latest)
    } catch {
      /* 读取记录失败时保持空态，不打断页面 */
    }
  }

  // 历史列表点击：展示该条快照（进行中则续传轮询）
  function selectRecord(record: AiManagerRecord) {
    historyVisible.value = false
    if (record.status === 'PROCESSING') startTracking(record.requestId)
    else applyRecord(record)
  }

  // 把数据截止时间格式化为简短文案，供 Hero 展示
  function formatCutoff(value?: unknown) {
    if (!value) return ''
    const date = new Date(String(value))
    if (Number.isNaN(date.getTime())) return ''
    return new Intl.DateTimeFormat('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  // 切换范围、门店或周期时，按新上下文重新拉取记录
  watch([scopeType, storeId, timeRange], () => {
    loadRecords()
  })

  function handleAiError(error: any, fallback: string) {
    const code = Number(error?.code)
    const rawMessage = String(error?.message || '')
    const reason = String(error?.reason || error?.data?.reason || '')
    let message = rawMessage || fallback
    if (code === 4602 || reason === 'QUOTA_EXCEEDED' || rawMessage.includes('QUOTA_EXCEEDED')) {
      message = 'AI 生成额度已用完，请升级套餐或购买次数包后重试。'
    } else if (code === 403 || reason === 'NOT_ENTITLED' || rawMessage.includes('NOT_ENTITLED')) {
      message = '当前账号或租户未开通 AI 店长，请联系管理员授权或升级套餐。'
    } else if (code === 429) {
      message = 'AI 服务请求过于频繁，请稍后再试。'
    }

    if (code === 503) {
      modelEnabled.value = false
      unavailableMessage.value = message
    } else if (code === 403 || code === 429 || code === 4602) ElMessage.warning(message)
    else ElMessage.error(message)
  }

  async function initialize() {
    const version = ++initVersion
    scope.value = undefined
    dashboard.value = undefined
    hasAnalyzed.value = false
    statusLoading.value = true
    modelEnabled.value = false
    unavailableMessage.value = ''
    try {
      const status = await getAiStatus()
      if (disposed || version !== initVersion) return
      modelEnabled.value = status.enabled
      unavailableMessage.value = resolveAiStatusMessage(status)
      if (!status.enabled && status.reason === 'NOT_ENTITLED') return
      const scopeData = await getAiManagerScope()
      if (disposed || version !== initVersion) return
      scope.value = scopeData
      scopeType.value = scopeData.defaultScopeType
      storeId.value = scopeData.defaultStoreId || scopeData.stores[0]?.storeId
      // 拉取诊断记录：自动显示最新结果，或自动续传进行中的任务
      await loadRecords()
    } catch (error: any) {
      if (!disposed && version === initVersion) handleAiError(error, 'AI 经营诊断初始化失败')
    } finally {
      if (!disposed && version === initVersion) statusLoading.value = false
    }
  }

  async function runDiagnosis() {
    if (!canAnalyze.value) return
    controller?.abort()
    controller = new AbortController()
    const signal = controller.signal
    loading.value = true
    hasAnalyzed.value = true
    failureMessage.value = ''
    dashboard.value = undefined
    let submission
    try {
      submission = await generateAiDashboard(diagnosisParams(), signal)
    } catch (error: any) {
      if (!disposed && !signal.aborted) {
        handleAiError(error, '经营诊断生成失败')
        loading.value = false
      }
      return
    }
    if (disposed || signal.aborted) return
    activeRequestId.value = submission.requestId
    try {
      // 后台已开始生成，轮询诊断记录直到成功或失败再渲染
      await pollUntilDone(submission.requestId, signal)
    } finally {
      if (!disposed && !signal.aborted) loading.value = false
    }
  }

  onMounted(initialize)
  // 商户/工作门店会话切换时重新初始化，避免跨账号串显示
  watch(() => userStore.sessionRevision, initialize)
  onUnmounted(() => {
    disposed = true
    controller?.abort()
  })
</script>

<style scoped lang="scss">
  .ai-analysis-page {
    max-width: 1400px;
    margin: 0 auto;

    :deep(.el-alert) {
      margin-top: 18px;
    }
  }

  .dashboard-loading {
    min-height: 260px;
    margin-top: 18px;
  }

  :deep(.el-empty) {
    margin-top: 18px;
  }

  .control-label {
    padding: 0 2px 0 4px;
    font-size: 12px;
    font-weight: 600;
    color: var(--el-text-color-secondary);
  }

  .scope-select {
    width: 148px;
  }

  .store-select {
    width: 160px;
  }

  .period-select {
    width: 140px;
  }

  :deep(.scope-select .el-select__wrapper),
  :deep(.store-select .el-select__wrapper),
  :deep(.period-select .el-select__wrapper) {
    min-height: 36px;
    border-radius: 8px;
  }

  .data-window-hint {
    display: inline-flex;
    gap: 5px;
    align-items: center;
    height: 36px;
    padding: 0 11px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    background: var(--el-fill-color-light);
    border-radius: 8px;

    .art-svg-icon {
      font-size: 15px;
    }
  }

  .history-button {
    display: inline-flex;
    gap: 4px;
    align-items: center;
    height: 36px;
    border-radius: 8px;

    .art-svg-icon {
      font-size: 15px;
    }
  }

  .history-count {
    min-width: 18px;
    padding: 0 5px;
    font-size: 11px;
    line-height: 18px;
    color: #fff;
    text-align: center;
    background: var(--el-color-primary);
    border-radius: 999px;
  }

  .dynamic-dashboard {
    margin-top: 18px;
  }

  @media (width <= 760px) {
    .control-label {
      width: 100%;
      padding-top: 2px;
    }

    .scope-select,
    .store-select,
    .period-select {
      flex: 1 1 140px;
      width: auto;
    }

    .data-window-hint {
      flex: 1 1 auto;
      justify-content: center;
    }
  }
</style>
