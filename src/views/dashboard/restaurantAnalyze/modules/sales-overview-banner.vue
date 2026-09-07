<!-- 销售概览横幅组件 - 响应式优化版 -->
<template>
  <ArtBasicBanner
    class="sales-overview-banner justify-center !h-64.5 mb-5 max-md:!h-56 max-sm:!pt-6 max-sm:!h-auto max-sm:!min-h-48 max-sm:mb-4"
    :title="`${timeRangeLabel}销售数据`"
    titleColor="white"
    :decoration="true"
    :meteorConfig="{
      enabled: true,
      count: isMobile ? 4 : 8
    }"
    :buttonConfig="{
      show: false,
      text: ''
    }"
    :image-config="imageConfig"
  >
    <div
      class="stats-grid grid grid-cols-2 gap-x-12 gap-y-4 mt-4 max-w-sm max-md:gap-x-8 max-md:gap-y-3 max-md:mt-3 max-sm:flex max-sm:flex-col max-sm:space-y-3 max-sm:mt-3 max-sm:max-w-full relative z-10"
    >
      <!-- 总销售额 -->
      <div
        class="stat-item pr-8 border-r border-white/30 max-sm:border-r-0 max-sm:pr-0 max-sm:pb-3 max-sm:border-b max-sm:border-white/20"
      >
        <p
          class="stat-value text-2xl text-white flex items-center max-md:text-xl max-sm:text-lg font-bold"
        >
          <ArtCountTo
            class="number box-title"
            :target="currentSales"
            :duration="1500"
            prefix="¥"
            separator=","
            :decimals="2"
          />
          <ArtSvgIcon
            v-if="periodOnPeriodGrowthRate >= 0"
            icon="ri:arrow-right-up-line"
            class="text-lg max-sm:text-base text-green-300 relative -top-1 ml-1.5 max-sm:ml-1"
          />
          <ArtSvgIcon
            v-else
            icon="ri:arrow-right-down-line"
            class="text-lg max-sm:text-base text-red-300 relative -top-1 ml-1.5 max-sm:ml-1"
          />
        </p>
        <p class="stat-label mt-1 text-xs text-white/80 max-sm:text-[11px]">总销售额</p>
      </div>

      <!-- 环比增长 -->
      <div
        class="stat-item max-sm:border-r-0 max-sm:pr-0 max-sm:pb-3 max-sm:border-b max-sm:border-white/20"
      >
        <p
          class="stat-value text-2xl text-white flex items-center max-md:text-xl max-sm:text-lg font-bold"
        >
          <ArtCountTo
            class="number box-title"
            :target="Math.abs(periodOnPeriodGrowthRate)"
            :duration="1500"
            suffix="%"
            :decimals="2"
          />
          <ArtSvgIcon
            v-if="periodOnPeriodGrowthRate >= 0"
            icon="ri:arrow-right-up-line"
            class="text-lg max-sm:text-base text-green-300 relative -top-1 ml-1.5 max-sm:ml-1"
          />
          <ArtSvgIcon
            v-else
            icon="ri:arrow-right-down-line"
            class="text-lg max-sm:text-base text-red-300 relative -top-1 ml-1.5 max-sm:ml-1"
          />
        </p>
        <p class="stat-label mt-1 text-xs text-white/80 max-sm:text-[11px]">环比增长</p>
      </div>

      <!-- 订单数量 -->
      <div
        class="stat-item pr-8 border-r border-white/30 max-sm:border-r-0 max-sm:pr-0 max-sm:pb-3 max-sm:border-b max-sm:border-white/20"
      >
        <p class="stat-value text-2xl text-white max-md:text-xl max-sm:text-lg font-bold">
          <ArtCountTo
            class="number box-title"
            :target="currentOrderCount"
            :duration="1500"
            separator=","
          />
        </p>
        <p class="stat-label mt-1 text-xs text-white/80 max-sm:text-[11px]">订单数量</p>
      </div>

      <!-- 客单价 -->
      <div class="stat-item">
        <p class="stat-value text-2xl text-white max-md:text-xl max-sm:text-lg font-bold">
          <ArtCountTo
            class="number box-title"
            :target="avgOrderAmount"
            :duration="1500"
            prefix="¥"
            separator=","
            :decimals="2"
          />
        </p>
        <p class="stat-label mt-1 text-xs text-white/80 max-sm:text-[11px]">客单价</p>
      </div>
    </div>
  </ArtBasicBanner>
</template>

<script setup lang="ts">
  import { computed, ref, onMounted, onUnmounted } from 'vue'
  import analyzeBannerCover from '@imgs/system/analyze.png'
  interface Props {
    /** 时间范围类型 */
    timeRangeType: string
    /** 当前周期销售额 */
    currentSales: number
    /** 环比增长率 */
    periodOnPeriodGrowthRate: number
    /** 当前周期订单数 */
    currentOrderCount: number
    /** 平均客单价 */
    avgOrderAmount: number
  }

  const props = withDefaults(defineProps<Props>(), {
    timeRangeType: 'TODAY',
    currentSales: 0,
    periodOnPeriodGrowthRate: 0,
    currentOrderCount: 0,
    avgOrderAmount: 0
  })

  // 响应式屏幕宽度
  const screenWidth = ref(window.innerWidth)

  // 判断是否为移动设备
  const isMobile = computed(() => screenWidth.value < 640)

  // 判断是否为平板设备
  const isTablet = computed(() => screenWidth.value >= 640 && screenWidth.value < 1024)

  // 动态计算图片配置
  const imageConfig = computed(() => {
    if (isMobile.value) {
      return {
        src: analyzeBannerCover,
        width: '16rem',
        bottom: '-2rem',
        right: '-4rem',
        opacity: 0.3
      }
    } else if (isTablet.value) {
      return {
        src: analyzeBannerCover,
        width: '22rem',
        bottom: '-2.5rem',
        right: '-6rem',
        opacity: 0.5
      }
    } else {
      return {
        src: analyzeBannerCover,
        width: '30rem',
        bottom: '-3rem',
        right: '-8rem'
      }
    }
  })

  // 监听窗口大小变化
  const handleResize = () => {
    screenWidth.value = window.innerWidth
  }

  onMounted(() => {
    window.addEventListener('resize', handleResize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
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
</script>

<style scoped lang="scss">
  .sales-overview-banner {
    // 确保在小屏幕上内容不会被遮挡
    :deep(.art-banner-content) {
      @media (width <= 640px) {
        padding-bottom: 1rem;
      }
    }
  }

  .stats-grid {
    // 在小屏幕上优化间距
    @media (width <= 640px) {
      width: 100%;
      padding: 0 0.5rem;
    }
  }

  .stat-item {
    // 确保统计项在小屏幕上有足够的点击区域
    @media (width <= 640px) {
      min-height: 3rem;
    }
  }

  .stat-value {
    // 确保数字不会换行
    white-space: nowrap;

    // 在极小屏幕上自适应
    @media (width <= 375px) {
      font-size: 1rem !important;
    }
  }

  .stat-label {
    // 确保标签文字清晰可读
    @media (width <= 640px) {
      white-space: nowrap;
    }
  }
</style>
