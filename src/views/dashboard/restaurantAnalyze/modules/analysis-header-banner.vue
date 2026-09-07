<!-- 餐饮分析页头横幅组件 - 紧凑设计 -->
<template>
  <div class="art-card p-5 flex flex-col justify-between mb-5 max-sm:mb-4">
    <!-- 标题区域 -->
    <div class="flex items-center mb-5">
      <div>
        <h3 class="text-xl font-semibold mb-0.5">餐饮数据分析</h3>
        <p class="text-xs text-g-500">实时监控业务数据</p>
      </div>
    </div>

    <!-- 筛选区域 -->
    <div class="flex flex-col space-y-3">
      <!-- 门店选择 -->
      <div class="flex items-center">
        <div class="flex-cc size-9 rounded bg-blue-500/10 mr-2.5">
          <ArtSvgIcon icon="ri:store-2-line" class="text-sm text-blue-500" />
        </div>
        <ElSelect
          v-model="selectedStoreId"
          @change="handleStoreChange"
          placeholder="选择门店"
          class="flex-1"
          :loading="storeLoading"
        >
          <ElOption
            v-for="store in storeList"
            :key="store.id"
            :label="store.storeName"
            :value="store.id"
          />
        </ElSelect>
      </div>

      <!-- 查询模式切换 -->
      <div class="flex items-center">
        <div class="flex-cc size-9 rounded bg-green-500/10 mr-2.5">
          <ArtSvgIcon icon="ri:time-line" class="text-sm text-green-500" />
        </div>
        <ElRadioGroup
          v-model="queryMode"
          @change="(value) => handleQueryModeChange(value as 'preset' | 'dateRange')"
        >
          <ElRadioButton label="preset">快捷选择</ElRadioButton>
          <ElRadioButton label="dateRange">日期范围</ElRadioButton>
        </ElRadioGroup>
      </div>

      <!-- 快捷时间范围选择 -->
      <div v-if="queryMode === 'preset'" class="flex flex-col">
        <div class="flex items-center">
          <div class="flex-cc size-9 rounded bg-purple-500/10 mr-2.5">
            <ArtSvgIcon icon="ri:calendar-line" class="text-sm text-purple-500" />
          </div>
          <ElRadioGroup
            v-model="selectedTimeRange"
            @change="(value) => handleTimeRangeChange(String(value))"
            class="flex"
          >
            <ElRadioButton label="TODAY" class="flex-1 text-center">今日</ElRadioButton>
            <ElRadioButton label="WEEK" class="flex-1 text-center">本周</ElRadioButton>
            <ElRadioButton label="MONTH" class="flex-1 text-center">本月</ElRadioButton>
            <ElRadioButton label="YEAR" class="flex-1 text-center">本年</ElRadioButton>
          </ElRadioGroup>
        </div>
        <div class="text-xs text-g-400 ml-11 mt-1">
          {{ getTimeRangeTip(selectedTimeRange) }}
        </div>
      </div>

      <!-- 日期范围选择器 -->
      <div v-else class="flex flex-col">
        <div class="flex items-center">
          <div class="flex-cc size-9 rounded bg-purple-500/10 mr-2.5">
            <ArtSvgIcon icon="ri:calendar-2-line" class="text-sm text-purple-500" />
          </div>
          <ElDatePicker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            :disabled-date="disabledDate"
            @change="handleDateRangeChange"
            class="flex-1"
          />
        </div>
        <div class="text-xs text-g-400 ml-11 mt-1">
          {{ dateRangeTip }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, watch, onMounted, computed } from 'vue'
  import { ElMessage } from 'element-plus'
  import { fetchGetStoreList } from '@/api/dish-manage'

  interface Props {
    /** 当前门店ID */
    storeId: number
    /** 当前时间范围 */
    timeRangeType: string
    /** 日期范围 */
    dateRange?: [string, string] | null
  }

  const props = withDefaults(defineProps<Props>(), {
    storeId: 0,
    timeRangeType: 'WEEK',
    dateRange: null
  })

  const emit = defineEmits<{
    (e: 'storeChange', storeId: number): void
    (e: 'timeRangeChange', timeRange: string): void
    (e: 'dateRangeChange', dateRange: [string, string] | null): void
  }>()

  const selectedStoreId = ref<number>(props.storeId)
  const selectedTimeRange = ref<string>(props.timeRangeType)
  const queryMode = ref<'preset' | 'dateRange'>('preset') // 查询模式：快捷选择或日期范围
  const dateRange = ref<[string, string] | null>(props.dateRange)
  const storeList = ref<Api.Store.StoreListItem[]>([])
  const storeLoading = ref(false)

  /** 日期范围提示 */
  const dateRangeTip = computed(() => {
    if (!dateRange.value || dateRange.value.length !== 2) {
      return '请选择日期范围'
    }
    const [start, end] = dateRange.value
    const startDate = new Date(start)
    const endDate = new Date(end)
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    return `统计 ${days} 天数据（${start} 至 ${end}）`
  })

  /** 禁用未来日期 */
  const disabledDate = (time: Date) => {
    return time.getTime() > Date.now()
  }

  /** 加载门店列表 */
  const loadStoreList = async () => {
    try {
      storeLoading.value = true
      const response: any = await fetchGetStoreList()

      // 处理分页数据格式
      if (response && response.records) {
        storeList.value = response.records
      } else if (Array.isArray(response)) {
        storeList.value = response
      } else {
        storeList.value = []
      }

      // 如果没有选中门店且有门店列表，默认选择第一个
      if (!selectedStoreId.value && storeList.value.length > 0) {
        selectedStoreId.value = storeList.value[0].id
        emit('storeChange', selectedStoreId.value)
      }
    } catch (error: any) {
      console.error('加载门店列表失败:', error)
      ElMessage.error(error.message || '加载门店列表失败')
    } finally {
      storeLoading.value = false
    }
  }

  /** 处理门店变化 */
  const handleStoreChange = (storeId: number) => {
    emit('storeChange', storeId)
  }

  /** 处理查询模式变化 */
  const handleQueryModeChange = (mode: 'preset' | 'dateRange') => {
    if (mode === 'preset') {
      // 切换到快捷选择模式，清空日期范围
      dateRange.value = null
      emit('dateRangeChange', null)
      emit('timeRangeChange', selectedTimeRange.value)
    } else {
      // 切换到日期范围模式
      if (!dateRange.value) {
        // 如果没有日期范围，设置默认值为最近7天
        const end = new Date()
        const start = new Date()
        start.setDate(start.getDate() - 6)
        dateRange.value = [start.toISOString().split('T')[0], end.toISOString().split('T')[0]]
      }
      emit('dateRangeChange', dateRange.value)
    }
  }

  /** 处理时间范围变化 */
  const handleTimeRangeChange = (timeRange: string) => {
    emit('timeRangeChange', timeRange)
  }

  /** 处理日期范围变化 */
  const handleDateRangeChange = (value: [string, string] | null) => {
    if (value && value.length === 2) {
      const [start, end] = value
      const startDate = new Date(start)
      const endDate = new Date(end)
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

      // 验证日期范围不超过365天
      if (days > 365) {
        ElMessage.warning('日期范围不能超过365天')
        return
      }

      emit('dateRangeChange', value)
    } else {
      emit('dateRangeChange', null)
    }
  }

  /** 获取时间范围提示 */
  const getTimeRangeTip = (timeRange: string): string => {
    const tipsMap: Record<string, string> = {
      TODAY: '统计近1天数据',
      WEEK: '统计近7天数据',
      MONTH: '统计近30天数据',
      YEAR: '统计近365天数据'
    }
    return tipsMap[timeRange] || ''
  }

  // 监听外部props变化
  watch(
    () => props.storeId,
    (newId) => {
      selectedStoreId.value = newId
    }
  )

  watch(
    () => props.timeRangeType,
    (newType) => {
      selectedTimeRange.value = newType
    }
  )

  watch(
    () => props.dateRange,
    (newRange) => {
      dateRange.value = newRange
      if (newRange) {
        queryMode.value = 'dateRange'
      }
    }
  )

  onMounted(() => {
    loadStoreList()
  })
</script>

<style scoped lang="scss">
  // 响应式样式已在模板中使用 Tailwind 类实现
</style>
