<!-- 销售趋势图组件 -->
<template>
  <div class="art-card p-5 mb-5 h-105 max-sm:mb-4">
    <div class="art-card-header">
      <div class="title">
        <h4>销售趋势</h4>
        <p>近{{ days }}天销售额、订单数、利润、客单价趋势</p>
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
    <ArtLineChart
      v-else
      height="calc(100% - 56px)"
      :data="chartData"
      :xAxisData="xAxisData"
      :loading="loading"
      :showLegend="true"
      legendPosition="top"
    />
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'

  interface Props {
    /** 销售趋势数据 */
    trendData: Api.RestaurantAnalysis.DailySalesTrendVO[]
    /** 天数 */
    days: number
    /** 加载状态 */
    loading?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    trendData: () => [],
    days: 7,
    loading: false
  })

  /** 空数据提示 */
  const emptyTip = computed(() => {
    if (props.days === 1) {
      return '今日还没有出单，加油！💪'
    }
    return `近${props.days}天暂无销售数据`
  })

  /** 图表数据 - 包含销售额、订单数、利润、客单价 */
  const chartData = computed(() => {
    return [
      {
        name: '销售额',
        data: props.trendData.map((item) => Number(item.sales) || 0)
      },
      {
        name: '利润',
        data: props.trendData.map((item) => Number(item.profit) || 0)
      },
      {
        name: '订单数',
        data: props.trendData.map((item) => Number(item.orderCount) || 0)
      },
      {
        name: '客单价',
        data: props.trendData.map((item) => Number(item.avgOrderAmount) || 0)
      }
    ]
  })

  /** X轴数据 - 日期数组 */
  const xAxisData = computed(() => {
    return props.trendData.map((item) => {
      // 格式化日期为 MM-DD
      const date = new Date(item.date)
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${month}-${day}`
    })
  })
</script>
