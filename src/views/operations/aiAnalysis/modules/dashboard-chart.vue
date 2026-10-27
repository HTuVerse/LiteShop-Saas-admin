<!-- 动态图表渲染：按 AI 返回的 chartType 自动选择图表组件并绑定真实数据 -->
<template>
  <div class="dashboard-chart">
    <ArtLineChart
      v-if="chart.chartType === 'LINE'"
      :data="seriesData"
      :x-axis-data="categories"
      :show-legend="multiSeries"
      :height="height"
    />
    <ArtBarChart
      v-else-if="chart.chartType === 'BAR'"
      :data="seriesData"
      :x-axis-data="categories"
      :show-legend="multiSeries"
      :height="height"
    />
    <ArtHBarChart
      v-else-if="chart.chartType === 'HBAR'"
      :data="seriesData"
      :x-axis-data="categories"
      :show-legend="multiSeries"
      :height="height"
    />
    <ArtRingChart
      v-else-if="chart.chartType === 'RING'"
      :data="pieData"
      :show-legend="true"
      legend-position="right"
      :height="height"
    />
    <ArtFunnelChart
      v-else-if="chart.chartType === 'FUNNEL'"
      :data="funnelData"
      :unit="chart.unit"
      :height="height"
    />
    <ArtHeatmapChart
      v-else-if="chart.chartType === 'HEATMAP'"
      :x-axis-data="heatmap.x"
      :y-axis-data="heatmap.y"
      :data="heatmap.data"
      :unit="chart.unit"
      :height="height"
    />
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import type { AiDashboardChart } from '@/api/ai'
  import type {
    BarDataItem,
    LineDataItem,
    PieDataItem,
    FunnelDataItem
  } from '@/types/component/chart'

  defineOptions({ name: 'DashboardChart' })

  const props = withDefaults(defineProps<{ chart: AiDashboardChart; height?: string }>(), {
    height: '240px'
  })

  const categories = computed(() => props.chart.categories || [])
  const multiSeries = computed(() => (props.chart.series?.length || 0) > 1)

  // 折线/柱状/条形图直接按序列渲染
  const seriesData = computed<LineDataItem[] | BarDataItem[]>(() =>
    (props.chart.series || []).map((item) => ({ name: item.name, data: item.data || [] }))
  )

  // 环形/漏斗图取首个序列，维度名来自 categories
  const pieData = computed<PieDataItem[]>(() => pointList())
  const funnelData = computed<FunnelDataItem[]>(() => pointList())

  function pointList() {
    const series = props.chart.series?.[0]
    const values = series?.data || []
    const names = categories.value
    return values.map((value, index) => ({
      name: names[index] || series?.name || `#${index + 1}`,
      value
    }))
  }

  // 热力图：x 为 categories，y 为各序列名，值展开为 [xIndex, yIndex, value]
  const heatmap = computed(() => {
    const x = categories.value
    const y = (props.chart.series || []).map((item) => item.name)
    const data: number[][] = []
    ;(props.chart.series || []).forEach((item, yi) => {
      ;(item.data || []).forEach((value, xi) => data.push([xi, yi, value]))
    })
    return { x, y, data }
  })
</script>

<style scoped lang="scss">
  .dashboard-chart {
    width: 100%;
  }
</style>
