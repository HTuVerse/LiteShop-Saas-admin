<!-- 抽奖记录查看弹窗 -->
<template>
  <ElDialog
    v-model="dialogVisible"
    :title="`抽奖记录 - ${activityData?.name || ''}`"
    width="800px"
    align-center
    destroy-on-close
  >
    <div class="record-container">
      <div class="section-title">
        <span>抽奖记录</span>
        <div class="record-summary">
          <ElTag type="info" size="small">总记录: {{ pagination.total }}</ElTag>
          <ElTag type="success" size="small">中奖: {{ winCount }}</ElTag>
          <ElTag type="warning" size="small">未中奖: {{ notWinCount }}</ElTag>
          <ElButton
            v-auth="'marketing:lottery:clear-records'"
            type="danger"
            size="small"
            @click="handleClearRecords"
            :loading="clearLoading"
          >
            清空记录
          </ElButton>
        </div>
      </div>

      <!-- 筛选栏 -->
      <div class="filter-bar">
        <ElInput
          v-model="filterUserId"
          placeholder="用户ID"
          clearable
          size="small"
          style="width: 120px"
          @keyup.enter="handleFilterChange"
          @clear="handleFilterChange"
        />
        <ElSelect
          v-model="filterType"
          placeholder="奖品类型"
          clearable
          size="small"
          style="width: 110px"
          @change="handleFilterChange"
        >
          <ElOption label="全部" :value="''" />
          <ElOption label="优惠券" :value="0" />
          <ElOption label="积分" :value="1" />
          <ElOption label="实物" :value="2" />
          <ElOption label="谢谢参与" :value="3" />
        </ElSelect>
        <ElSelect
          v-model="filterReceived"
          placeholder="领取状态"
          clearable
          size="small"
          style="width: 110px"
          @change="handleFilterChange"
        >
          <ElOption label="全部" :value="''" />
          <ElOption label="已领取" :value="1" />
          <ElOption label="未领取" :value="0" />
        </ElSelect>
        <ElButton type="primary" size="small" @click="handleFilterChange">搜索</ElButton>
      </div>

      <!-- 记录列表 -->
      <ArtTable
        :data="records"
        v-loading="loading"
        max-height="450px"
        size="small"
        :columns="tableColumns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      >
        <template #tableColumnsSlot3="{ row }">
          <span :style="{ color: row.prizeType === 3 ? '#909399' : '#303133' }">
            {{ row.prizeName || '-' }}
          </span>
        </template>
        <template #tableColumnsSlot4="{ row }">
          <ElTag :type="getPrizeTypeConfig(row.prizeType).type" size="small">
            {{ getPrizeTypeConfig(row.prizeType).text }}
          </ElTag>
        </template>
        <template #tableColumnsSlot5="{ row }">
          <ElTag v-if="row.prizeType === 3" type="info" size="small">-</ElTag>
          <ElTag v-else-if="row.isReceived === 1" type="success" size="small">已领</ElTag>
          <ElTag v-else type="warning" size="small">未领</ElTag>
        </template>
        <template #tableColumnsSlot6="{ row }">
          {{ row.createTime ? row.createTime.substring(0, 19).replace('T', ' ') : '-' }}
        </template>
      </ArtTable>
    </div>

    <template #footer>
      <ElButton @click="dialogVisible = false">关闭</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { useTable } from '@/hooks/core/useTable'
  import { ref, computed, watch } from 'vue'
  import {
    ElDialog,
    ElButton,
    ElSelect,
    ElOption,
    ElTag,
    ElMessage,
    ElMessageBox,
    ElInput
  } from 'element-plus'
  import { fetchGetActivityAllRecords, fetchClearActivityRecords } from '@/api/lottery-manage'
  import {
    PrizeTypeEnumMap,
    BooleanEnumMap,
    convertListToNumber,
    getEnumNumber,
    getEnumText
  } from '@/utils/enum'

  interface Props {
    visible: boolean
    activityData?: Partial<Api.Lottery.ActivityListItem>
  }

  interface Emits {
    (e: 'update:visible', value: boolean): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  // 对话框显示控制
  const dialogVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
  })

  const clearLoading = ref(false)

  // 筛选条件
  const filterUserId = ref<string>('')
  const filterType = ref<Api.Lottery.PrizeType | undefined>(undefined)
  const filterReceived = ref<number | undefined>(undefined)

  // 奖品类型配置（基于数值枚举）
  const getPrizeTypeConfig = (type: Api.Lottery.PrizeType | string | undefined) => {
    const num = getEnumNumber(type as any, PrizeTypeEnumMap)
    const text = getEnumText(type as any, PrizeTypeEnumMap) || '未知'
    let tagType: 'success' | 'warning' | 'info' | 'danger' = 'info'

    if (num === 0) {
      tagType = 'success'
    } else if (num === 1) {
      tagType = 'warning'
    } else if (num === 2) {
      tagType = 'info'
    } else if (num === 3) {
      tagType = 'danger'
    }

    return { type: tagType, text }
  }

  // 中奖数量（排除"谢谢参与"）
  const winCount = computed(() => {
    return records.value.filter((item) => item.prizeType !== 3).length
  })

  // 未中奖数量（谢谢参与）
  const notWinCount = computed(() => {
    return records.value.filter((item) => item.prizeType === 3).length
  })

  // 筛选条件变化时重新加载（请求后端）
  const handleFilterChange = async () => {
    const userId = filterUserId.value.trim()
    replaceSearchParams({
      activityId: props.activityData?.id,
      userId: userId && /^[1-9]\d*$/.test(userId) ? userId : undefined,
      prizeType: filterType.value,
      isReceived: filterReceived.value
    })
    await getData()
  }

  // 清空记录
  const handleClearRecords = async () => {
    if (!props.activityData?.id) return

    try {
      await ElMessageBox.confirm('确定要清空该活动的所有抽奖记录吗？此操作不可恢复！', '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })

      clearLoading.value = true
      await fetchClearActivityRecords(props.activityData.id)
      ElMessage.success('清空成功')
      await refreshRemove()
    } catch (error: any) {
      if (error !== 'cancel') {
        ElMessage.error(error.message || '清空失败')
      }
    } finally {
      clearLoading.value = false
    }
  }

  // 监听对话框显示
  watch(
    () => props.visible,
    (visible) => {
      if (visible) {
        filterUserId.value = ''
        filterType.value = undefined
        filterReceived.value = undefined
        replaceSearchParams({ activityId: props.activityData?.id })
        void getData()
      }
    },
    { immediate: true }
  )

  const fetchRecordPage = (params: {
    activityId?: number
    currentPage?: number
    pageSize?: number
    userId?: string
    prizeType?: number
    isReceived?: number
  }) =>
    params.activityId
      ? fetchGetActivityAllRecords(
          params.activityId,
          params.currentPage || 1,
          params.pageSize || 10,
          params.userId,
          params.prizeType,
          params.isReceived
        )
      : Promise.resolve({ records: [], total: 0, current: 1, size: 10, pages: 0 })

  const {
    data: records,
    columns: tableColumns,
    loading,
    pagination,
    getData,
    replaceSearchParams,
    handleSizeChange,
    handleCurrentChange,
    refreshRemove
  } = useTable({
    core: {
      apiFn: fetchRecordPage,
      apiParams: { currentPage: 1, pageSize: 10 },
      paginationKey: { current: 'currentPage', size: 'pageSize' },
      immediate: false,
      columnsFactory: () => [
        { prop: 'id', label: 'ID', width: 60 },
        { prop: 'userId', label: '用户ID', width: 80 },
        {
          prop: 'prizeName',
          label: '奖品名称',
          minWidth: 120,
          useSlot: true,
          slotName: 'tableColumnsSlot3'
        },
        {
          prop: 'prizeType',
          label: '类型',
          width: 90,
          useSlot: true,
          slotName: 'tableColumnsSlot4'
        },
        {
          prop: 'isReceived',
          label: '领取',
          width: 70,
          align: 'center',
          useSlot: true,
          slotName: 'tableColumnsSlot5'
        },
        {
          prop: 'createTime',
          label: '抽奖时间',
          width: 160,
          useSlot: true,
          slotName: 'tableColumnsSlot6'
        }
      ]
    },
    transform: {
      dataTransformer: (data) =>
        convertListToNumber(data, {
          prizeType: PrizeTypeEnumMap,
          isReceived: BooleanEnumMap
        }) as Api.Lottery.LotteryRecord[]
    }
  })
</script>

<style lang="scss" scoped>
  .record-container {
    min-height: 400px;
  }

  .section-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    font-size: 15px;
    font-weight: 600;
    color: #303133;

    .record-summary {
      display: flex;
      gap: 8px;
      align-items: center;
    }
  }

  .filter-bar {
    display: flex;
    gap: 10px;
    margin-bottom: 12px;
  }

  .pagination-wrapper {
    display: flex;
    justify-content: flex-end;
    margin-top: 12px;
  }
</style>
