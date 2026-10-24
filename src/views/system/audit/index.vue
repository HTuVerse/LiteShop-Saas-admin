<template>
  <div class="art-full-height">
    <AuditSearch
      :model-value="searchForm"
      :show-tenant="userStore.isSuperAdmin && !userStore.activeTenant"
      @update:model-value="(value) => Object.assign(searchForm, value)"
      @search="search"
      @reset="reset"
    />
    <p class="mb-3 text-sm text-gray-500">
      未选择时间时查询近 7 天；单次查询或导出最多跨 31 天，导出上限为 10,000 条。
    </p>

    <ElCard class="art-table-card" shadow="never">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElButton v-if="userStore.isSuperAdmin" @click="integrityVisible = true">
            完整性校验
          </ElButton>
          <ElButton
            v-if="hasAuth('system:audit:export')"
            :loading="exporting"
            @click="exportCurrent"
          >
            导出当前筛选结果
          </ElButton>
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

    <ElDialog v-model="detailVisible" title="操作日志详情" width="760px" destroy-on-close>
      <div v-loading="detailLoading">
        <ElDescriptions v-if="detail" :column="2" border>
          <ElDescriptionsItem label="日志 ID">{{ detail.id }}</ElDescriptionsItem>
          <ElDescriptionsItem label="操作账号">{{ detail.actorAccount }}</ElDescriptionsItem>
          <ElDescriptionsItem label="操作时间">{{
            formatTime(detail.occurredAt)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="所属租户">{{
            detail.actorTenantId ?? '平台账号'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="操作范围">{{
            detail.scopeTenantId ?? '平台全局'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="日志租户">{{
            detail.tenantId || '平台全局'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="门店 ID">{{ detail.storeId || '-' }}</ElDescriptionsItem>
          <ElDescriptionsItem label="IP 地址">{{ detail.clientIp }}</ElDescriptionsItem>
          <ElDescriptionsItem label="IP 归属地">{{ detail.ipLocation }}</ElDescriptionsItem>
          <ElDescriptionsItem label="操作模块">{{ detail.moduleCode }}</ElDescriptionsItem>
          <ElDescriptionsItem label="操作类型">{{ detail.operationType }}</ElDescriptionsItem>
          <ElDescriptionsItem label="操作对象"
            >{{ detail.objectType || '-' }} {{ detail.objectId || '' }}</ElDescriptionsItem
          >
          <ElDescriptionsItem label="执行结果">{{ resultLabel(detail.result) }}</ElDescriptionsItem>
          <ElDescriptionsItem label="操作内容" :span="2">{{ detail.summary }}</ElDescriptionsItem>
          <ElDescriptionsItem v-if="detail.resultMessage" label="结果说明" :span="2">
            {{ detail.resultMessage }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="请求路径" :span="2">{{
            detail.requestPath
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="请求 ID" :span="2">{{ detail.requestId }}</ElDescriptionsItem>
          <ElDescriptionsItem label="校验链序号">{{ detail.chainSequence }}</ElDescriptionsItem>
          <ElDescriptionsItem label="签名密钥版本">{{ detail.keyVersion }}</ElDescriptionsItem>
          <ElDescriptionsItem label="日志摘要" :span="2">
            <span class="break-all">{{ detail.entryHash }}</span>
          </ElDescriptionsItem>
        </ElDescriptions>

        <div v-if="diffEntries.length" class="mt-5">
          <h3 class="mb-3 text-base font-semibold">数据变更</h3>
          <div
            v-for="[field, change] in diffEntries"
            :key="field"
            class="mb-3 rounded-lg border p-3"
          >
            <div class="mb-2 font-medium">{{ field }}</div>
            <div class="grid grid-cols-2 gap-3">
              <div
                ><span class="text-sm text-gray-500">修改前</span
                ><pre class="audit-value">{{ formatValue(change.before) }}</pre>
              </div>
              <div
                ><span class="text-sm text-gray-500">修改后</span
                ><pre class="audit-value">{{ formatValue(change.after) }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ElDialog>
    <AuditIntegrityDialog
      v-if="userStore.isSuperAdmin"
      v-model="integrityVisible"
      :default-scope="userStore.activeTenant?.id ? String(userStore.activeTenant.id) : '0'"
    />
  </div>
</template>

<script setup lang="ts">
  import { computed, h, reactive, ref } from 'vue'
  import { ElButton, ElMessage, ElTag } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import { useAuth } from '@/hooks/core/useAuth'
  import { useUserStore } from '@/store/modules/user'
  import { exportAuditLogs, fetchAuditDetail, fetchAuditPage } from '@/api/system-audit'
  import type { AuditDetail, AuditQuery, AuditRow, AuditSearchModel } from '@/api/system-audit'
  import AuditSearch from './modules/audit-search.vue'
  import AuditIntegrityDialog from './modules/audit-integrity-dialog.vue'

  defineOptions({ name: 'SystemAudit' })
  const userStore = useUserStore()
  const { hasAuth } = useAuth()
  const emptySearch = (): AuditSearchModel => ({
    tenantId: '',
    account: '',
    ip: '',
    module: '',
    type: '',
    result: '',
    dateRange: []
  })
  const searchForm = reactive<AuditSearchModel>(emptySearch())
  const detailVisible = ref(false)
  const detailLoading = ref(false)
  const detail = ref<AuditDetail | null>(null)
  const exporting = ref(false)
  const integrityVisible = ref(false)

  const filters = (): AuditQuery => ({
    tenantId:
      userStore.isSuperAdmin && !userStore.activeTenant
        ? searchForm.tenantId || undefined
        : undefined,
    account: searchForm.account.trim() || undefined,
    ip: searchForm.ip.trim() || undefined,
    module: searchForm.module || undefined,
    type: searchForm.type || undefined,
    result: searchForm.result || undefined,
    startTime: searchForm.dateRange?.[0]
      ? new Date(Number(searchForm.dateRange[0])).toISOString()
      : undefined,
    endTime: searchForm.dateRange?.[1]
      ? new Date(Number(searchForm.dateRange[1])).toISOString()
      : undefined
  })
  const validFilters = (): AuditQuery | null => {
    const query = filters()
    if (query.tenantId && !/^[1-9]\d*$/.test(String(query.tenantId))) {
      ElMessage.warning('租户 ID 请输入正整数')
      return null
    }
    if (query.startTime && query.endTime) {
      const span = Date.parse(query.endTime) - Date.parse(query.startTime)
      if (span < 0 || span > 31 * 24 * 60 * 60 * 1000) {
        ElMessage.warning('操作时间范围不能超过 31 天')
        return null
      }
    }
    return query
  }
  const formatTime = (value?: string) =>
    value
      ? new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })
      : '-'
  const resultLabel = (value: string) =>
    (({ SUCCESS: '成功', FAILURE: '失败', DENIED: '拒绝' }) as Record<string, string>)[value] ||
    value
  const formatValue = (value: unknown) =>
    value == null ? '-' : typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  const diffEntries = computed<[string, { before?: unknown; after?: unknown }][]>(() => {
    if (!detail.value?.diffJson) return []
    try {
      return Object.entries(JSON.parse(detail.value.diffJson))
    } catch {
      return []
    }
  })

  const openDetail = async (row: AuditRow) => {
    detailVisible.value = true
    detailLoading.value = true
    detail.value = null
    try {
      detail.value = await fetchAuditDetail(row.id)
    } catch {
      detailVisible.value = false
    } finally {
      detailLoading.value = false
    }
  }

  const {
    columns,
    columnChecks,
    data,
    loading,
    pagination,
    getData,
    resetSearchParams,
    refreshData,
    handleSizeChange,
    handleCurrentChange
  } = useTable({
    core: {
      apiFn: fetchAuditPage,
      apiParams: { currentPage: 1, pageSize: 20 },
      paginationKey: { current: 'currentPage', size: 'pageSize' },
      columnsFactory: () => [
        {
          prop: 'occurredAt',
          label: '操作时间',
          minWidth: 175,
          formatter: (row: AuditRow) => formatTime(row.occurredAt)
        },
        { prop: 'actorAccount', label: '操作账号', minWidth: 125 },
        {
          prop: 'tenantId',
          label: '租户 ID',
          minWidth: 110,
          formatter: (row: AuditRow) => row.tenantId || '平台'
        },
        { prop: 'clientIp', label: 'IP 地址', minWidth: 135 },
        { prop: 'ipLocation', label: '归属地', minWidth: 150 },
        { prop: 'moduleCode', label: '操作模块', minWidth: 150 },
        { prop: 'operationType', label: '操作类型', minWidth: 125 },
        { prop: 'summary', label: '操作内容', minWidth: 230, showOverflowTooltip: true },
        {
          prop: 'result',
          label: '结果',
          width: 90,
          formatter: (row: AuditRow) =>
            h(
              ElTag,
              { type: row.result === 'SUCCESS' ? 'success' : 'danger', effect: 'plain' },
              () => resultLabel(row.result)
            )
        },
        {
          prop: 'actions',
          label: '操作',
          width: 95,
          fixed: 'right',
          formatter: (row: AuditRow) =>
            hasAuth('system:audit:detail')
              ? h(
                  ElButton,
                  { link: true, type: 'primary', onClick: () => openDetail(row) },
                  () => '详情'
                )
              : null
        }
      ]
    }
  })

  const search = () => {
    const query = validFilters()
    if (query) void getData(query)
  }
  const reset = async () => {
    Object.assign(searchForm, emptySearch())
    await resetSearchParams()
  }
  const exportCurrent = async () => {
    const query = validFilters()
    if (!query) return
    exporting.value = true
    try {
      const blob = await exportAuditLogs(query)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `系统操作审计日志_${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
      ElMessage.success('审计日志已导出')
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '导出失败')
    } finally {
      exporting.value = false
    }
  }
</script>

<style scoped>
  .audit-value {
    min-height: 52px;
    margin-top: 4px;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }
</style>
