<!-- 漏斗图：用于转化/流失环节分析 -->
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
  import type { FunnelChartProps } from '@/types/component/chart'

  defineOptions({ name: 'ArtFunnelChart' })

  const props = withDefaults(defineProps<FunnelChartProps>(), {
    height: useChartOps().chartHeight,
    loading: false,
    isEmpty: false,
    colors: () => useChartOps().colors,
    data: () => [],
    showLabel: true,
    showTooltip: true,
    showLegend: false,
    legendPosition: 'bottom'
  })

  const { chartRef, getTooltipStyle, getLegendStyle, getAnimationConfig } = useChartComponent({
    props,
    checkEmpty: () => !props.data?.length || props.data.every((item) => item.value === 0),
    watchSources: [() => props.data, () => props.colors],
    generateOptions: (): EChartsOption => {
      const unit = props.unit || ''
      return {
        tooltip: props.showTooltip
          ? getTooltipStyle('item', { formatter: `{b}: {c}${unit} ({d}%)` })
          : undefined,
        legend: props.showLegend ? getLegendStyle(props.legendPosition) : undefined,
        series: [
          {
            type: 'funnel',
            left: '8%',
            right: '8%',
            top: props.showLegend ? 32 : 12,
            bottom: 12,
            minSize: '14%',
            maxSize: '100%',
            sort: 'descending',
            gap: 2,
            label: {
              show: props.showLabel,
              position: 'inside',
              formatter: `{b}`
            },
            itemStyle: {
              borderColor: '#fff',
              borderWidth: 1
            },
            emphasis: {
              label: { fontSize: 14, fontWeight: 'bold' }
            },
            data: props.data,
            color: props.colors,
            ...getAnimationConfig()
          }
        ]
      }
    }
  })
</script>
