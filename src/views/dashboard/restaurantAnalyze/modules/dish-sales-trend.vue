<!-- 菜品销售趋势组件 -->
<template>
  <div class="art-card p-5 mb-5 h-[30rem] max-sm:mb-4">
    <div class="art-card-header">
      <div class="title">
        <h4>菜品销售趋势</h4>
        <p>{{ dishName || '选择菜品查看销售趋势' }}</p>
      </div>
      <div class="actions">
        <!-- 菜品选择器 -->
        <ElSelect
          v-model="selectedDishId"
          placeholder="选择菜品"
          filterable
          clearable
          style="width: 160px"
          @change="handleDishChange"
        >
          <ElOption
            v-for="dish in dishList"
            :key="dish.dishId"
            :label="dish.dishName"
            :value="dish.dishId"
          >
            <div class="flex items-center justify-between">
              <span>{{ dish.dishName }}</span>
              <span class="text-xs text-slate-400 ml-2">{{ dish.categoryName }}</span>
            </div>
          </ElOption>
        </ElSelect>
      </div>
    </div>

    <!-- 空数据提示 -->
    <div
      v-if="!loading && (!trendData || trendData.length === 0)"
      class="flex-cc flex-col h-[calc(100%-56px)] text-g-400"
    >
      <ArtSvgIcon icon="ri:line-chart-line" class="text-5xl mb-3 opacity-30" />
      <p class="text-sm">{{ emptyTip }}</p>
    </div>

    <!-- 图表 -->
    <ArtMixedChart
      v-else
      height="calc(100% - 56px)"
      :data="chartData"
      :xAxisData="xAxisData"
      :showLegend="true"
      :showAxisLine="false"
      :loading="loading"
      legendPosition="top"
    />
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import { fetchDishSalesTrend } from '@/api/restaurant-analysis'
  import { ElMessage } from 'element-plus'

  interface Props {
    /** 门店ID */
    storeId: number
    /** 菜品列表（用于选择器） */
    dishList: Api.RestaurantAnalysis.DishSalesRankingVO[]
    /** 统计天数 */
    days?: number
    /** 开始日期 */
    startDate?: string
    /** 结束日期 */
    endDate?: string
  }

  const props = withDefaults(defineProps<Props>(), {
    dishList: () => [],
    days: 30
  })

  const emit = defineEmits<{
    dishChange: [dishId: number | null]
  }>()

  // 状态管理
  const selectedDishId = ref<number | null>(null)
  const trendData = ref<Api.RestaurantAnalysis.DishSalesTrendVO[]>([])
  const loading = ref(false)

  // 当前选中的菜品名称
  const dishName = computed(() => {
    if (!selectedDishId.value) return ''
    const dish = props.dishList.find((d) => d.dishId === selectedDishId.value)
    return dish ? dish.dishName : ''
  })

  /** 空数据提示 */
  const emptyTip = computed(() => {
    if (!selectedDishId.value) {
      return '请选择菜品查看销售趋势'
    }
    if (props.days === 1) {
      return '今日该菜品还没有销售数据'
    }
    return `近${props.days}天该菜品暂无销售数据`
  })

  /** 图表数据 */
  const chartData = computed(() => {
    const salesAmountData = trendData.value.map((item) => Number(item.salesAmount) || 0)
    const salesQuantityData = trendData.value.map((item) => Number(item.salesQuantity) || 0)

    return [
      {
        name: '销售额',
        type: 'bar' as const,
        data: salesAmountData,
        yAxisIndex: 0
      },
      {
        name: '销量',
        type: 'line' as const,
        data: salesQuantityData,
        yAxisIndex: 1,
        showAreaColor: true,
        smooth: true,
        lineWidth: 2.5
      }
    ]
  })

  /** X轴数据 - 日期数组 */
  const xAxisData = computed(() => {
    return trendData.value.map((item) => {
      // 格式化日期为 MM-DD
      const date = new Date(item.date)
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${month}-${day}`
    })
  })

  /** 加载菜品销售趋势 */
  const loadDishSalesTrend = async (dishId: number) => {
    if (!dishId || !props.storeId) return

    try {
      loading.value = true
      const params: any = { storeId: props.storeId, dishId }

      if (props.startDate && props.endDate) {
        params.startDate = props.startDate
        params.endDate = props.endDate
      } else if (props.days) {
        params.days = props.days
      }

      const data = await fetchDishSalesTrend(
        props.storeId,
        dishId,
        params.days,
        params.startDate,
        params.endDate
      )
      trendData.value = data || []
    } catch (error: any) {
      console.error('加载菜品销售趋势失败:', error)
      ElMessage.error(error.message || '加载菜品销售趋势失败')
      trendData.value = []
    } finally {
      loading.value = false
    }
  }

  /** 处理菜品变化 */
  const handleDishChange = (dishId: number | null) => {
    if (dishId) {
      loadDishSalesTrend(dishId)
    } else {
      trendData.value = []
    }
    emit('dishChange', dishId)
  }

  /** 监听门店、时间范围变化，重新加载数据 */
  watch(
    () => [props.storeId, props.days, props.startDate, props.endDate],
    () => {
      if (selectedDishId.value) {
        loadDishSalesTrend(selectedDishId.value)
      }
    }
  )

  /** 监听菜品列表变化，自动选择第一个菜品 */
  watch(
    () => props.dishList,
    (newList) => {
      if (newList && newList.length > 0 && !selectedDishId.value) {
        selectedDishId.value = newList[0].dishId
        loadDishSalesTrend(newList[0].dishId)
      }
    },
    { immediate: true }
  )
</script>

<style scoped lang="scss">
  .art-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;

    .title {
      h4 {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--el-text-color-primary);
      }

      p {
        margin: 0.25rem 0 0;
        font-size: 0.875rem;
        color: var(--el-text-color-secondary);
      }
    }

    .actions {
      display: flex;
      gap: 0.5rem;
    }
  }
</style>
