<!-- 时段销售分布组件 -->
<template>
  <div class="art-card p-5 mb-5 h-105 max-sm:mb-4">
    <div class="art-card-header">
      <div class="title">
        <h4>时段销售分布</h4>
        <p>各时段销售额对比</p>
      </div>
    </div>

    <!-- 空数据提示 -->
    <div
      v-if="!loading && (!periodData || periodData.length === 0)"
      class="flex-cc flex-col h-[calc(100%-56px)] text-g-400"
    >
      <ArtSvgIcon icon="ri:bar-chart-line" class="text-5xl mb-3 opacity-30" />
      <p class="text-sm">暂无时段销售数据</p>
    </div>

    <!-- 图表 -->
    <ArtBarChart
      v-else
      height="calc(100% - 56px)"
      :data="chartData"
      :xAxisData="xAxisData"
      :showAxisLine="false"
      :loading="loading"
      barWidth="45%"
    />
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'

  interface Props {
    /** 时段销售数据 */
    periodData: Api.RestaurantAnalysis.TimePeriodSalesVO[]
    /** 加载状态 */
    loading?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    periodData: () => [],
    loading: false
  })

  /** 图表数据 - 销售额数组 */
  const chartData = computed(() => {
    return props.periodData.map((item) => Number(item.sales) || 0)
  })

  /** X轴数据 - 时段名称 */
  const xAxisData = computed(() => {
    return props.periodData.map((item) => item.periodName)
  })
</script>
