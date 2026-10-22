<template>
  <ElDialog
    v-model="dialogVisible"
    :title="`${detailTitle}明细`"
    width="min(960px, 95vw)"
    align-center
  >
    <div class="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
      <span>用户：{{ userData?.nickname || userData?.username || '-' }}</span>
      <span>当前{{ detailTitle }}：{{ currentValue }}</span>
    </div>
    <ArtTable
      row-key="id"
      :data="data"
      :columns="columns"
      :loading="loading"
      :pagination="pagination"
      @pagination:size-change="handleSizeChange"
      @pagination:current-change="handleCurrentChange"
    />
  </ElDialog>
</template>

<script setup lang="ts">
  import { computed, h, watch } from 'vue'
  import { ElMessage } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import { fetchUserAccountRecords } from '@/api/user-account-records'
  import type { UserAccountRecord, UserAccountRecordKind } from '@/api/user-account-records'

  const dialogVisible = defineModel<boolean>('visible', { default: false })
  const props = defineProps<{
    kind: UserAccountRecordKind
    userData?: Partial<Api.SystemManage.UserListItem>
  }>()

  const detailTitle = computed(
    () =>
      ({
        experience: '经验',
        balance: '余额',
        points: '积分'
      })[props.kind]
  )
  const currentValue = computed(() => {
    const user = props.userData
    if (!user) return '-'
    if (props.kind === 'balance') return formatNumber(user.surplusMoney, true)
    return formatNumber(props.kind === 'experience' ? user.exp : user.points)
  })
  const formatNumber = (value: number | undefined, money = false) =>
    value == null ? '-' : money ? Number(value).toFixed(2) : String(value)
  const formatChange = (row: UserAccountRecord) => {
    const value = Number(row.change)
    const text = `${value > 0 ? '+' : ''}${formatNumber(value, props.kind === 'balance')}`
    return h('span', { style: { color: value > 0 ? '#67c23a' : value < 0 ? '#f56c6c' : '' } }, text)
  }

  const {
    data,
    columns,
    loading,
    pagination,
    getData,
    clearData,
    replaceSearchParams,
    handleSizeChange,
    handleCurrentChange
  } = useTable({
    core: {
      apiFn: fetchUserAccountRecords,
      apiParams: {
        userId: 0,
        kind: 'experience' as UserAccountRecordKind,
        currentPage: 1,
        pageSize: 10
      },
      immediate: false,
      paginationKey: { current: 'currentPage', size: 'pageSize' },
      columnsFactory: () => [
        { prop: 'time', label: '时间', minWidth: 170 },
        { prop: 'source', label: '来源/类型', minWidth: 130 },
        { prop: 'change', label: '变动', minWidth: 110, formatter: formatChange },
        {
          prop: 'before',
          label: '变动前',
          minWidth: 110,
          formatter: (row: UserAccountRecord) => formatNumber(row.before, props.kind === 'balance')
        },
        {
          prop: 'after',
          label: '变动后',
          minWidth: 110,
          formatter: (row: UserAccountRecord) => formatNumber(row.after, props.kind === 'balance')
        },
        {
          prop: 'orderNo',
          label: '关联订单',
          minWidth: 170,
          showOverflowTooltip: true,
          formatter: (row: UserAccountRecord) => row.orderNo || '-'
        },
        {
          prop: 'remark',
          label: '备注',
          minWidth: 180,
          showOverflowTooltip: true,
          formatter: (row: UserAccountRecord) =>
            row.remark ||
            (row.giftAmount ? `含赠送余额 ${formatNumber(row.giftAmount, true)}` : '-')
        }
      ]
    },
    hooks: { onError: (error) => ElMessage.error(error.message || '明细加载失败') }
  })

  watch(
    () => [dialogVisible.value, props.userData?.id, props.kind] as const,
    ([visible, userId, kind]) => {
      if (!visible || userId == null) return
      clearData()
      replaceSearchParams({ userId, kind })
      void getData()
    }
  )
</script>
