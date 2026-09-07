<!-- 订单分析统计卡片组件 -->
<template>
  <div class="art-card h-auto p-5 mb-5 overflow-hidden max-sm:mb-4">
    <div class="art-card-header">
      <div class="title">
        <h4>订单分析</h4>
        <p>{{ timeRangeLabel }}订单统计</p>
      </div>
    </div>

    <div class="mt-4">
      <!-- 第一行：订单总数、总销售额 -->
      <ElRow :gutter="20">
        <ElCol :span="12" :xs="24" v-for="(item, index) in firstRowStats" :key="'first-' + index">
          <div
            class="flex px-5 flex-col justify-center h-40 border border-g-300/85 rounded-xl mb-4 max-sm:flex-row max-sm:justify-between max-sm:items-center max-sm:h-24"
          >
            <div class="size-11 rounded-lg flex-cc" :class="item.iconBg">
              <ArtSvgIcon :icon="item.icon" class="text-xl" :class="item.iconColor" />
            </div>

            <div class="max-sm:ml-4 mt-3 max-sm:mt-0 max-sm:text-end">
              <ArtCountTo
                class="text-2xl font-medium"
                :target="item.value"
                :duration="1500"
                :decimals="item.decimals"
                :prefix="item.prefix"
                :suffix="item.suffix"
              />
              <p class="mt-1.5 text-sm text-g-600 max-sm:mt-1">{{ item.label }}</p>
            </div>
          </div>
        </ElCol>
      </ElRow>

      <!-- 第二行：完成率、取消率、进行率 -->
      <ElRow :gutter="20">
        <ElCol :span="8" :xs="24" v-for="(item, index) in secondRowStats" :key="'second-' + index">
          <div
            class="flex px-4 flex-col justify-center h-40 border border-g-300/85 rounded-xl mb-4 max-sm:flex-row max-sm:justify-between max-sm:items-center max-sm:h-20"
          >
            <div class="size-10 rounded-lg flex-cc" :class="item.iconBg">
              <ArtSvgIcon :icon="item.icon" class="text-lg" :class="item.iconColor" />
            </div>

            <div class="max-sm:ml-4 mt-2.5 max-sm:mt-0 max-sm:text-end">
              <ArtCountTo
                class="text-xl font-medium"
                :target="item.value"
                :duration="1500"
                :decimals="item.decimals"
                :suffix="item.suffix"
              />
              <p class="mt-1 text-sm text-g-600 max-sm:mt-1">{{ item.label }}</p>
            </div>
          </div>
        </ElCol>
      </ElRow>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'

  interface Props {
    /** 订单分析数据 */
    analysisData: Api.RestaurantAnalysis.OrderAnalysisVO | null
    /** 时间范围类型 */
    timeRangeType?: string
    /** 加载状态 */
    loading?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    analysisData: null,
    timeRangeType: 'TODAY',
    loading: false
  })

  /** 时间范围标签 */
  const timeRangeLabel = computed(() => {
    const labels: Record<string, string> = {
      TODAY: '今日',
      WEEK: '本周',
      MONTH: '本月',
      YEAR: '本年'
    }
    return labels[props.timeRangeType] || '今日'
  })

  /** 第一行统计数据：订单总数、总销售额 */
  const firstRowStats = computed(() => {
    const data = props.analysisData
    return [
      {
        label: '订单总数',
        value: data?.totalOrderCount || 0,
        decimals: 0,
        prefix: '',
        suffix: ' 单',
        icon: 'ri:file-list-3-line',
        iconBg: 'bg-blue-500/10',
        iconColor: 'text-blue-500'
      },
      {
        label: '总销售额',
        value: data?.totalSales || 0,
        decimals: 2,
        prefix: '¥',
        suffix: '',
        icon: 'ri:money-cny-circle-line',
        iconBg: 'bg-green-500/10',
        iconColor: 'text-green-500'
      }
    ]
  })

  /** 第二行统计数据：完成率、取消率、进行率 */
  const secondRowStats = computed(() => {
    const data = props.analysisData
    return [
      {
        label: '完成率',
        value: data?.completionRate || 0,
        decimals: 2,
        suffix: '%',
        icon: 'ri:checkbox-circle-line',
        iconBg: 'bg-emerald-500/10',
        iconColor: 'text-emerald-500'
      },
      {
        label: '取消率',
        value: data?.cancellationRate || 0,
        decimals: 2,
        suffix: '%',
        icon: 'ri:close-circle-line',
        iconBg: 'bg-red-500/10',
        iconColor: 'text-red-500'
      },
      {
        label: '进行率',
        value: data?.processingRate || 0,
        decimals: 2,
        suffix: '%',
        icon: 'ri:loader-4-line',
        iconBg: 'bg-orange-500/10',
        iconColor: 'text-orange-500'
      }
    ]
  })
</script>
