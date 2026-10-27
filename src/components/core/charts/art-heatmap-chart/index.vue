<!-- 热力图：用于时段 × 星期/门店等二维分布分析 -->
<template>
  <div
    ref="chartRef"
    class="relative w-full"
    :style="{ height: props.height }"
    v-loading="props.loading"
  >
  </div>
</template>

<script setup lang="ts">
  import type { EChartsOption } from '@/plugins/echarts'
  import { useChartOps, useChartComponent } from '@/hooks/core/useChart'
  import type { HeatmapChartProps } from '@/types/component/chart'

  defineOptions({ name: 'ArtHeatmapChart' })

  const props = withDefaults(defineProps<HeatmapChartProps>(), {
    height: useChartOps().chartHeight,
    loading: false,
    isEmpty: false,
    colors: () => useChartOps().colors,
    xAxisData: () => [],
    yAxisData: () => [],
    data: () => [],
    showTooltip: true
  })

  const { chartRef, isDark, getAxisLabelStyle, getTooltipStyle } = useChartComponent({
    props,
    checkEmpty: () => !props.data?.length || !props.xAxisData?.length || !props.yAxisData?.length,
    watchSources: [() => props.data, () => props.xAxisData, () => props.yAxisData],
    generateOptions: (): EChartsOption => {
      const unit = props.unit || ''
      const values = props.data.map((item) => item[2] ?? 0)
      const max = values.length ? Math.max(...values) : 0
      return {
        grid: { top: 12, right: 12, bottom: 60, left: 60, containLabel: true },
        tooltip: props.showTooltip
          ? getTooltipStyle('item', {
              formatter: (params: any) => {
                const [x, y, value] = params.value
                return `${props.yAxisData[y]} · ${props.xAxisData[x]}：${value}${unit}`
              }
            })
          : undefined,
        xAxis: {
          type: 'category',
          data: props.xAxisData,
          splitArea: { show: true },
          axisLabel: getAxisLabelStyle(true)
        },
        yAxis: {
          type: 'category',
          data: props.yAxisData,
          splitArea: { show: true },
          axisLabel: getAxisLabelStyle(true)
        },
        visualMap: {
          min: 0,
          max: max || 1,
          calculable: true,
          orient: 'horizontal',
          left: 'center',
          bottom: 4,
          inRange: { color: ['#E0F2FE', '#60A5FA', '#2563EB'] },
          textStyle: { color: isDark.value ? '#ccc' : '#666' }
        },
        series: [
          {
            type: 'heatmap',
            data: props.data,
            label: { show: false },
            emphasis: {
              itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.3)' }
            }
          }
        ]
      }
    }
  })
</script>
