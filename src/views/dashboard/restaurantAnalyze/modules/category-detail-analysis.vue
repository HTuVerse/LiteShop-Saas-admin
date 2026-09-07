<!-- 分类详细分析 -->
<template>
  <div class="art-card p-5 h-[27.8rem] mb-5">
    <div class="art-card-header">
      <div class="title">
        <h4>分类详细对比</h4>
        <p>各分类销量、利润率、客单价对比</p>
      </div>
      <div class="flex-c gap-2">
        <ElSelect v-model="chartType" style="width: 100px">
          <ElOption label="销量对比" value="quantity" />
          <ElOption label="利润率对比" value="profitRate" />
          <ElOption label="客单价对比" value="avgOrder" />
        </ElSelect>
      </div>
    </div>

    <div class="chart-container" v-loading="loading">
      <!-- 销量对比 - 柱状图 -->
      <ArtBarChart
        v-if="chartType === 'quantity'"
        :data="quantityChartData"
        :x-axis-data="categoryNames"
        :height="'20rem'"
        :show-tooltip="true"
        :show-axis-label="true"
        :loading="loading"
      />

      <!-- 利润率对比 - 柱状图 -->
      <ArtBarChart
        v-else-if="chartType === 'profitRate'"
        :data="profitRateChartData"
        :x-axis-data="categoryNames"
        :height="'20rem'"
        :show-tooltip="true"
        :show-axis-label="true"
        :loading="loading"
        :bar-color="profitRateColors"
      />

      <!-- 客单价对比 - 柱状图 -->
      <ArtBarChart
        v-else
        :data="avgOrderChartData"
        :x-axis-data="categoryNames"
        :height="'20rem'"
        :show-tooltip="true"
        :show-axis-label="true"
        :loading="loading"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { useChartOps } from '@/hooks/core/useChart'

  defineOptions({ name: 'CategoryDetailAnalysis' })

  interface Props {
    /** 分类分析数据 */
    categoryData: Api.RestaurantAnalysis.CategoryAnalysisVO[]
    /** 加载状态 */
    loading?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    categoryData: () => [],
    loading: false
  })

  const { colors } = useChartOps()

  // 图表类型
  const chartType = ref<'quantity' | 'profitRate' | 'avgOrder'>('quantity')

  // 分类名称
  const categoryNames = computed(() => {
    return props.categoryData.map((item) => item.categoryName)
  })

  // 销量数据
  const quantityChartData = computed(() => {
    return props.categoryData.map((item) => Number(item.salesQuantity || 0))
  })

  // 利润率数据
  const profitRateChartData = computed(() => {
    return props.categoryData.map((item) => Number(item.profitRate || 0))
  })

  // 利润率颜色（根据利润率高低设置不同颜色）
  const profitRateColors = computed(() => {
    return props.categoryData.map((item) => {
      const rate = Number(item.profitRate || 0)
      if (rate >= 50) return '#67C23A' // 绿色 - 高利润
      if (rate >= 30) return '#409EFF' // 蓝色 - 中等利润
      if (rate >= 0) return '#E6A23C' // 橙色 - 低利润
      return '#F56C6C' // 红色 - 亏损
    })
  })

  // 客单价数据
  const avgOrderChartData = computed(() => {
    return props.categoryData.map((item) => Number(item.avgOrderAmount || 0))
  })
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
      }

      p {
        margin: 0.25rem 0 0;
        font-size: 0.875rem;
        color: var(--el-text-color-secondary);
      }
    }
  }

  .chart-container {
    height: calc(100% - 3rem);
  }
</style>
