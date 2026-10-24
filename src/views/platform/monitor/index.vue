<template>
  <div class="monitor-page art-full-height">
    <div class="monitor-heading">
      <div>
        <h1>服务器监控</h1>
        <p>自动发现已注册服务及其所在主机，查看数据库和中间件采集状态</p>
      </div>
      <div class="monitor-heading-actions">
        <span v-if="lastUpdated">最近刷新：{{ lastUpdated }}</span>
        <ElButton :loading="loading" @click="loadAll">刷新</ElButton>
      </div>
    </div>

    <ElAlert v-if="loadError" type="error" :title="loadError" :closable="false" show-icon />

    <div class="monitor-stats">
      <ElCard v-for="card in summaryCards" :key="card.label" shadow="never">
        <span>{{ card.label }}</span>
        <strong :class="card.tone">{{ card.value }}</strong>
      </ElCard>
    </div>

    <ArtSearchBar
      :model-value="filters"
      @update:model-value="(value) => Object.assign(filters, value)"
      :items="filterItems"
      :showExpand="false"
      @reset="resetFilters"
      @search="applyFilters"
    />

    <ElCard class="art-table-card" shadow="never">
      <ArtTableHeader :loading="loading" @refresh="loadAll">
        <template #left><strong>监控目标</strong></template>
      </ArtTableHeader>
      <ArtTable :data="tableData" :columns="columns" :loading="loading" height="360">
        <template #kind="scope">{{ kindLabels[scope.row.kind as MonitorKind] }}</template>
        <template #service="scope">{{ scope.row.dbCluster || scope.row.service || '—' }}</template>
        <template #state="scope">
          <ElTag
            :type="scope.row.up === true ? 'success' : scope.row.up === false ? 'danger' : 'info'"
          >
            {{ scope.row.up === true ? '正常' : scope.row.up === false ? '异常' : '待采集' }}
          </ElTag>
        </template>
        <template #action="scope">
          <ElButton
            link
            type="primary"
            :disabled="!scope.row.instance"
            @click="selectTarget(scope.row)"
          >
            查看趋势
          </ElButton>
        </template>
      </ArtTable>
    </ElCard>

    <div class="monitor-bottom">
      <ElCard shadow="never" class="trend-card">
        <div class="panel-title">
          <div>
            <h2>指标趋势</h2>
            <p>{{
              selectedTarget
                ? `${selectedTarget.service || kindLabels[selectedTarget.kind]} · ${selectedTarget.instance}`
                : '选择上方目标查看趋势'
            }}</p>
          </div>
          <div v-if="selectedTarget" class="range-actions">
            <ElButton
              v-for="item in metricOptions"
              :key="item.key"
              size="small"
              :type="metric === item.key ? 'primary' : 'default'"
              @click="
                metric = item.key
                loadTrend()
              "
            >
              {{ item.label }}
            </ElButton>
            <ElButton
              v-for="minutes in [60, 360, 1440]"
              :key="minutes"
              size="small"
              :type="rangeMinutes === minutes ? 'primary' : 'default'"
              @click="
                rangeMinutes = minutes
                loadTrend()
              "
              >{{ minutes === 60 ? '1小时' : minutes === 360 ? '6小时' : '24小时' }}</ElButton
            >
          </div>
        </div>
        <ArtLineChart
          v-if="trendPoints.length"
          :data="trendValues"
          :xAxisData="trendLabels"
          :loading="trendLoading"
          height="280px"
        />
        <ElEmpty
          v-else
          :description="trendLoading ? '正在加载指标' : '暂无趋势数据'"
          :image-size="72"
        />
      </ElCard>

      <ElCard shadow="never" class="alert-card">
        <div class="panel-title"
          ><div><h2>当前告警</h2><p>由 Prometheus 告警规则产生</p></div></div
        >
        <ArtTable :data="alertRows" :columns="alertColumns" :loading="loading" height="280">
          <template #severity="scope">
            <ElTag :type="scope.row.severity === 'critical' ? 'danger' : 'warning'">
              {{ scope.row.severity === 'critical' ? '严重' : '警告' }}
            </ElTag>
          </template>
        </ArtTable>
      </ElCard>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
  import { useTable } from '@/hooks/core/useTable'
  import {
    fetchMonitorAlerts,
    fetchMonitorOverview,
    fetchMonitorTargets,
    fetchMonitorTrend,
    type MonitorAlert,
    type MonitorKind,
    type MonitorOverview,
    type MonitorTarget
  } from '@/api/monitor'

  defineOptions({ name: 'PlatformMonitor' })

  const kindLabels: Record<MonitorKind, string> = {
    application: '应用服务',
    host: '服务器',
    mysql: 'MySQL',
    redis: 'Redis',
    rabbitmq: 'RabbitMQ'
  }
  const metricByKind: Record<MonitorKind, Array<{ key: string; label: string }>> = {
    application: [
      { key: 'heap', label: '堆内存' },
      { key: 'requests', label: '每秒请求' }
    ],
    host: [
      { key: 'cpu', label: 'CPU %' },
      { key: 'memory', label: '内存 %' },
      { key: 'disk', label: '磁盘 %' }
    ],
    mysql: [{ key: 'connections', label: '连接数' }],
    redis: [{ key: 'memory', label: '内存字节' }],
    rabbitmq: [{ key: 'messages', label: '消息积压' }]
  }
  const loading = ref(false)
  const trendLoading = ref(false)
  const loadError = ref('')
  const lastUpdated = ref('')
  const overview = ref<MonitorOverview>()
  const targets = ref<MonitorTarget[]>([])
  const alerts = ref<MonitorAlert[]>([])
  const selectedTarget = ref<MonitorTarget>()
  const metric = ref('cpu')
  const rangeMinutes = ref(60)
  const trendPoints = ref<Array<{ time: number; value: number }>>([])
  const filters = reactive({ kind: '', keyword: '' })
  const appliedFilters = reactive({ kind: '', keyword: '' })
  let refreshTimer: ReturnType<typeof setInterval> | undefined
  let trendVersion = 0

  const filterItems = computed(() => [
    {
      label: '目标类型',
      key: 'kind',
      type: 'select',
      props: {
        clearable: true,
        options: [
          { label: '全部', value: '' },
          ...Object.entries(kindLabels).map(([value, label]) => ({ label, value }))
        ]
      }
    },
    { label: '名称或地址', key: 'keyword', type: 'input', props: { clearable: true } }
  ])
  const filteredTargets = computed(() =>
    targets.value.filter(
      (target) =>
        (!appliedFilters.kind || target.kind === appliedFilters.kind) &&
        (!appliedFilters.keyword ||
          `${target.service} ${target.host} ${target.instance} ${target.dbCluster}`
            .toLowerCase()
            .includes(appliedFilters.keyword.toLowerCase()))
    )
  )
  const { data: tableData, columns } = useTable({
    core: {
      dataSource: () => filteredTargets.value,
      columnsFactory: () => [
        { label: '类型', prop: 'kind', minWidth: 105, useSlot: true, slotName: 'kind' },
        {
          label: '服务 / 集群',
          prop: 'service',
          minWidth: 190,
          useSlot: true,
          slotName: 'service'
        },
        { label: '主机', prop: 'host', minWidth: 145 },
        { label: '实例地址', prop: 'instance', minWidth: 170 },
        { label: '状态', prop: 'up', minWidth: 90, useSlot: true, slotName: 'state' },
        { label: '操作', prop: 'action', width: 100, useSlot: true, slotName: 'action' }
      ]
    }
  })
  const { data: alertRows, columns: alertColumns } = useTable({
    core: {
      dataSource: () => alerts.value,
      columnsFactory: () => [
        { label: '级别', prop: 'severity', width: 82, useSlot: true, slotName: 'severity' },
        { label: '告警', prop: 'summary', minWidth: 230 },
        { label: '实例', prop: 'instance', minWidth: 140 }
      ]
    }
  })
  const summaryCards = computed(() => [
    { label: '监控目标', value: overview.value?.total ?? '--', tone: '' },
    { label: '正常', value: overview.value?.up ?? '--', tone: 'healthy' },
    { label: '异常', value: overview.value?.down ?? '--', tone: 'unhealthy' },
    { label: '当前告警', value: overview.value?.alertCount ?? '--', tone: 'unhealthy' }
  ])
  const metricOptions = computed(() =>
    selectedTarget.value ? metricByKind[selectedTarget.value.kind] : []
  )
  const trendValues = computed(() => trendPoints.value.map((point) => point.value))
  const trendLabels = computed(() =>
    trendPoints.value.map((point) =>
      new Date(point.time * 1000).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      })
    )
  )

  function applyFilters() {
    Object.assign(appliedFilters, filters)
  }
  function resetFilters() {
    Object.assign(filters, { kind: '', keyword: '' })
    applyFilters()
  }
  function selectTarget(target: MonitorTarget) {
    selectedTarget.value = target
    metric.value = metricByKind[target.kind][0].key
    trendPoints.value = []
    void loadTrend()
  }
  async function loadTrend() {
    if (!selectedTarget.value?.instance) return
    const version = ++trendVersion
    trendLoading.value = true
    try {
      const result = await fetchMonitorTrend({
        kind: selectedTarget.value.kind,
        instance: selectedTarget.value.instance,
        metric: metric.value,
        rangeMinutes: rangeMinutes.value
      })
      if (version === trendVersion) trendPoints.value = result.points
    } catch {
      if (version === trendVersion) trendPoints.value = []
    } finally {
      if (version === trendVersion) trendLoading.value = false
    }
  }
  async function loadAll() {
    if (loading.value) return
    loading.value = true
    try {
      const [nextOverview, nextTargets, nextAlerts] = await Promise.all([
        fetchMonitorOverview(),
        fetchMonitorTargets(),
        fetchMonitorAlerts()
      ])
      overview.value = nextOverview
      targets.value = nextTargets
      alerts.value = nextAlerts
      loadError.value = ''
      lastUpdated.value = new Date().toLocaleTimeString('zh-CN')
      if (selectedTarget.value) {
        const stillPresent = nextTargets.find(
          (target) =>
            target.kind === selectedTarget.value?.kind &&
            target.instance === selectedTarget.value?.instance
        )
        selectedTarget.value = stillPresent
        if (stillPresent) {
          void loadTrend()
        } else {
          trendVersion++
          trendLoading.value = false
          trendPoints.value = []
        }
      }
    } catch {
      loadError.value = '监控数据暂不可用，请检查 Prometheus 地址与采集状态。'
    } finally {
      loading.value = false
    }
  }
  onMounted(() => {
    void loadAll()
    refreshTimer = setInterval(() => void loadAll(), 30_000)
  })
  onBeforeUnmount(() => {
    if (refreshTimer) clearInterval(refreshTimer)
    trendVersion++
  })
</script>

<style scoped lang="scss">
  .monitor-page {
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding-bottom: 20px;
  }

  .monitor-heading,
  .monitor-heading-actions,
  .panel-title,
  .range-actions {
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
  }

  .monitor-heading h1 {
    margin: 0 0 6px;
    font-size: 24px;
  }

  .monitor-heading p,
  .panel-title p,
  .monitor-heading-actions span {
    margin: 0;
    font-size: 13px;
    color: var(--art-text-gray-600);
  }

  .monitor-stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
  }

  .monitor-stats :deep(.el-card__body) {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .monitor-stats strong {
    font-size: 28px;
  }

  .monitor-stats .healthy {
    color: var(--el-color-success);
  }

  .monitor-stats .unhealthy {
    color: var(--el-color-danger);
  }

  .monitor-bottom {
    display: grid;
    grid-template-columns: 1.6fr 1fr;
    gap: 16px;
  }

  .panel-title {
    min-height: 45px;
    margin-bottom: 12px;
  }

  .panel-title h2 {
    margin: 0 0 5px;
    font-size: 17px;
  }

  .range-actions {
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  @media (width <= 1100px) {
    .monitor-bottom {
      grid-template-columns: 1fr;
    }
  }

  @media (width <= 700px) {
    .monitor-stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .monitor-heading,
    .panel-title {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
