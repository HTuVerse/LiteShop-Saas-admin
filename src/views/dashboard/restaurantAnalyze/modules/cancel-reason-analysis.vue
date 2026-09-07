<!-- 订单取消原因分析组件 -->
<template>
  <div class="art-card p-5 mb-5 h-105 max-sm:mb-4">
    <div class="art-card-header">
      <div class="title">
        <h4>取消原因分析</h4>
        <p>订单取消原因统计</p>
      </div>
    </div>

    <div v-if="hasData" class="mt-4">
      <div v-for="(item, index) in reasonData" :key="index" class="mb-4 last:mb-0">
        <div class="flex justify-between mb-2">
          <span class="text-sm text-g-700">{{ item.cancelReason }}</span>
          <span class="text-sm font-medium"
            >{{ item.cancelCount }}次 ({{ item.percentage.toFixed(2) }}%)</span
          >
        </div>
        <ElProgress
          :percentage="item.percentage"
          :color="getProgressColor(index)"
          :stroke-width="8"
          :show-text="false"
        />
      </div>
    </div>

    <div v-else class="flex-cc h-64">
      <ElEmpty description="暂无取消数据" :image-size="100" />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'

  interface Props {
    /** 取消原因分析数据 */
    reasonData: Api.RestaurantAnalysis.CancelReasonAnalysisVO[]
    /** 加载状态 */
    loading?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    reasonData: () => [],
    loading: false
  })

  /** 是否有数据 */
  const hasData = computed(() => {
    return props.reasonData && props.reasonData.length > 0
  })

  /** 进度条颜色映射 */
  const progressColors = ['#5D87FF', '#49BEFF', '#13DEB9', '#FFAE1F', '#FA896B']

  /** 获取进度条颜色 */
  const getProgressColor = (index: number): string => {
    return progressColors[index % progressColors.length]
  }
</script>
