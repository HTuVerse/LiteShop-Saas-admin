<!-- 订单状态分布组件 -->
<template>
  <div class="art-card p-5 mb-5 h-116 max-sm:mb-4">
    <div class="art-card-header">
      <div class="title">
        <h4>订单状态分布</h4>
        <p>各状态订单占比</p>
      </div>
    </div>

    <ArtRingChart
      :data="chartData"
      :colors="chartColors"
      :radius="['56%', '76%']"
      height="16rem"
      :showLabel="false"
      :borderRadius="8"
      :centerText="centerText"
      :loading="loading"
    />

    <div class="flex justify-around mt-2">
      <div v-for="(item, index) in distributionList" :key="index" class="flex-c">
        <div
          class="flex-cc size-10.5 mr-2.5 rounded-lg"
          :style="{ backgroundColor: chartColors[index] + '20', color: chartColors[index] }"
        >
          <ArtSvgIcon :icon="getStatusIcon(item.statusName)" class="text-xl" />
        </div>
        <div>
          <p class="text-lg font-medium">{{ item.orderCount }}</p>
          <span class="text-sm text-g-600">{{ item.statusName }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'

  interface Props {
    /** 订单状态分布数据 */
    distributionData: Api.RestaurantAnalysis.OrderStatusDistributionVO[]
    /** 加载状态 */
    loading?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    distributionData: () => [],
    loading: false
  })

  /** 图表颜色 */
  const chartColors = ['#4C87F3', '#93F1B4', '#FFB547', '#FF6B6B', '#A78BFA']

  /** 图表数据 */
  const chartData = computed(() => {
    return props.distributionData.map((item) => ({
      value: item.orderCount,
      name: item.statusName
    }))
  })

  /** 订单状态列表 */
  const distributionList = computed(() => {
    return props.distributionData
  })

  /** 中心文本 - 显示总订单数 */
  const centerText = computed(() => {
    const total = props.distributionData.reduce((sum, item) => sum + item.orderCount, 0)
    return total > 0 ? `${total}单` : '暂无数据'
  })

  /** 根据状态名称获取图标 */
  const getStatusIcon = (statusName: string): string => {
    const iconMap: Record<string, string> = {
      已完成: 'ri:checkbox-circle-line',
      已取消: 'ri:close-circle-line',
      进行中: 'ri:loader-4-line',
      待支付: 'ri:time-line',
      已接单: 'ri:file-check-line',
      制作中: 'ri:restaurant-line'
    }
    return iconMap[statusName] || 'ri:file-list-line'
  }
</script>
