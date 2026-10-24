<template>
  <div class="monitor-page">
    <div class="monitor-heading">
      <div>
        <h2>{{ title }}</h2>
        <p>{{ description }} · 在线指最近 5 分钟有活动</p>
      </div>
      <ElButton :loading="overviewLoading || loading" @click="refreshAll">刷新数据</ElButton>
    </div>

    <ArtSearchBar v-model="searchForm" :items="searchItems" @search="search" @reset="reset" />
    <p class="monitor-filter-note">账号、昵称和 IP 仅筛选在线会话；租户 ID 同时作用于统计看板。</p>
    <ElAlert v-if="overviewError" :title="overviewError" type="error" show-icon :closable="false" />

    <div class="monitor-stats" v-loading="overviewLoading">
      <div v-for="card in cards" :key="card.label" class="monitor-stat art-card">
        <span>{{ card.label }}</span>
        <strong>{{ card.value.toLocaleString('zh-CN') }}</strong>
      </div>
    </div>

    <div class="monitor-charts">
      <ElCard shadow="never" class="monitor-chart">
        <template #header>
          <div class="chart-heading">
            <strong>近 7 日访问趋势</strong>
            <small>访问次数与每日独立访问人数</small>
          </div>
        </template>
        <ArtLineChart
          height="290px"
          :data="trendData"
          :x-axis-data="trendLabels"
          :show-legend="true"
          :loading="overviewLoading"
          :is-empty="!overview?.trend.some((item) => item.visits)"
        />
      </ElCard>
      <ElCard shadow="never" class="monitor-chart">
        <template #header>
          <div class="chart-heading">
            <strong>高活跃时段</strong>
            <small>近 7 日按小时累计访问次数</small>
          </div>
        </template>
        <ArtBarChart
          height="290px"
          :data="hourData"
          :x-axis-data="hourLabels"
          :loading="overviewLoading"
          :is-empty="!overview?.hours.some((item) => item.visits)"
          :show-axis-line="false"
        />
      </ElCard>
    </div>

    <ElCard shadow="never" class="art-table-card monitor-table">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshAll">
        <template #left>
          <strong>在线会话</strong>
        </template>
      </ArtTableHeader>
      <ArtTable
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, reactive, ref, watch } from 'vue'
  import { ElMessage } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import { useUserStore } from '@/store/modules/user'
  import {
    fetchMonitorOnline,
    fetchMonitorOverview,
    type MonitorClient,
    type MonitorOverview,
    type MonitorQuery,
    type OnlineSession
  } from '@/api/system-monitor'

  const props = defineProps<{ client: MonitorClient; title: string; description: string }>()
  const userStore = useUserStore()
  const emptySearch = () => ({ tenantId: '', keyword: '', ip: '' })
  const searchForm = reactive(emptySearch())
  const overview = ref<MonitorOverview>()
  const overviewLoading = ref(false)
  const overviewError = ref('')
  let overviewRequestId = 0

  const searchItems = computed(() => [
    ...(userStore.isSuperAdmin
      ? [{ label: '租户 ID', key: 'tenantId', type: 'input', props: { placeholder: '全部租户' } }]
      : []),
    {
      label: '账号或昵称',
      key: 'keyword',
      type: 'input',
      props: { placeholder: '请输入账号或昵称' }
    },
    { label: 'IP 地址', key: 'ip', type: 'input', props: { placeholder: '请输入 IP 地址' } }
  ])

  const cards = computed(() => [
    { label: '当前在线用户', value: overview.value?.onlineUsers || 0 },
    { label: '当前在线会话', value: overview.value?.onlineSessions || 0 },
    { label: '今日访问次数', value: overview.value?.todayVisits || 0 },
    { label: '近 7 日访问次数', value: overview.value?.sevenDayVisits || 0 }
  ])
  const trendLabels = computed(() => overview.value?.trend.map((item) => item.date.slice(5)) || [])
  const trendData = computed(() => [
    { name: '访问次数', data: overview.value?.trend.map((item) => item.visits) || [] },
    { name: '独立访问人数', data: overview.value?.trend.map((item) => item.visitors) || [] }
  ])
  const hourLabels = computed(
    () => overview.value?.hours.map((item) => `${String(item.hour).padStart(2, '0')}:00`) || []
  )
  const hourData = computed(() => overview.value?.hours.map((item) => item.visits) || [])
  const formatTime = (value: number) =>
    value
      ? new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })
      : '-'

  const filters = (): MonitorQuery | null => {
    const tenantId = searchForm.tenantId.trim()
    if (tenantId && !/^[1-9]\d*$/.test(tenantId)) {
      ElMessage.warning('租户 ID 请输入正整数')
      return null
    }
    return {
      tenantId: userStore.isSuperAdmin && tenantId ? tenantId : undefined,
      keyword: searchForm.keyword.trim() || undefined,
      ip: searchForm.ip.trim() || undefined
    }
  }

  const {
    columns,
    columnChecks,
    data,
    loading,
    pagination,
    searchParams,
    getData,
    replaceSearchParams,
    resetSearchParams,
    refreshData,
    handleSizeChange,
    handleCurrentChange
  } = useTable({
    core: {
      apiFn: (params: MonitorQuery) => fetchMonitorOnline(props.client, params),
      apiParams: { currentPage: 1, pageSize: 20 },
      paginationKey: { current: 'currentPage', size: 'pageSize' },
      columnsFactory: () => [
        { prop: 'account', label: '账号', minWidth: 140 },
        { prop: 'nickname', label: '昵称', minWidth: 130 },
        {
          prop: 'tenantId',
          label: '租户 ID',
          minWidth: 110,
          formatter: (row: OnlineSession) => row.tenantId || '平台'
        },
        { prop: 'ip', label: 'IP 地址', minWidth: 135 },
        {
          prop: 'firstSeen',
          label: '本次首次活动',
          minWidth: 170,
          formatter: (row: OnlineSession) => formatTime(row.firstSeen)
        },
        {
          prop: 'lastSeen',
          label: '最后活动',
          minWidth: 170,
          formatter: (row: OnlineSession) => formatTime(row.lastSeen)
        }
      ]
    }
  })

  const loadOverview = async (tenantId?: MonitorQuery['tenantId']) => {
    const requestId = ++overviewRequestId
    overviewLoading.value = true
    overviewError.value = ''
    try {
      const result = await fetchMonitorOverview(props.client, tenantId)
      if (requestId === overviewRequestId) overview.value = result
    } catch (error) {
      if (requestId === overviewRequestId) {
        overview.value = undefined
        overviewError.value = (error as Error)?.message || '统计数据加载失败，请刷新重试'
      }
    } finally {
      if (requestId === overviewRequestId) overviewLoading.value = false
    }
  }
  const search = () => {
    const query = filters()
    if (!query) return
    replaceSearchParams(query)
    void getData()
    void loadOverview(query.tenantId)
  }
  const reset = () => {
    Object.assign(searchForm, emptySearch())
    void resetSearchParams()
    void loadOverview()
  }
  const refreshAll = () => {
    void refreshData()
    void loadOverview(searchParams.tenantId)
  }

  onMounted(() => {
    void loadOverview()
  })
  watch(
    () => userStore.scopeKey,
    () => {
      Object.assign(searchForm, emptySearch())
      void resetSearchParams()
      void loadOverview()
    }
  )
</script>

<style scoped>
  .monitor-page {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .monitor-heading,
  .chart-heading {
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
  }

  .monitor-heading h2 {
    margin: 0 0 5px;
    font-size: 22px;
    font-weight: 700;
  }

  .monitor-heading p,
  .chart-heading small,
  .monitor-filter-note {
    margin: 0;
    color: var(--el-text-color-secondary);
  }

  .monitor-stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
  }

  .monitor-stat {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 20px;
  }

  .monitor-stat span {
    color: var(--el-text-color-secondary);
  }

  .monitor-stat strong {
    font-size: 28px;
    line-height: 1;
  }

  .monitor-charts {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  .monitor-chart {
    min-width: 0;
  }

  .monitor-table {
    min-height: 360px;
  }

  @media (width <= 900px) {
    .monitor-stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .monitor-charts {
      grid-template-columns: 1fr;
    }
  }

  @media (width <= 520px) {
    .monitor-stats {
      grid-template-columns: 1fr;
    }
  }
</style>
