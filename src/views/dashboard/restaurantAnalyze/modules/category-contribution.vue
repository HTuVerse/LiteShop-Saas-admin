<!-- 菜品分类贡献分析 -->
<template>
  <div class="art-card p-5 h-[27.8rem] mb-5">
    <div class="art-card-header">
      <div class="title">
        <h4>分类贡献分析</h4>
        <p>各分类的销售额、销量、利润占比</p>
      </div>
      <div class="flex-c gap-2">
        <ElSelect v-model="chartType" style="width: 120px">
          <ElOption label="销售额占比" value="salesAmount" />
          <ElOption label="销量占比" value="salesQuantity" />
          <ElOption label="利润占比" value="profit" />
        </ElSelect>
      </div>
    </div>

    <div class="flex flex-col h-[22rem]" v-loading="loading">
      <!-- 环形图 -->
      <div class="flex-1">
        <ArtRingChart
          :data="chartData"
          :height="'16rem'"
          :radius="['45%', '75%']"
          :show-legend="true"
          legend-position="right"
          :show-tooltip="true"
          :loading="loading"
        />
      </div>

      <!-- 统计卡片 -->
      <div class="grid grid-cols-4 gap-2 mt-4">
        <div
          v-for="(item, index) in statsCards"
          :key="index"
          class="flex flex-col items-center justify-center p-2 rounded-lg"
          :style="{ backgroundColor: item.bgColor }"
        >
          <div class="text-lg font-bold" :style="{ color: item.color }">
            {{ item.value }}
          </div>
          <div class="text-xs text-g-500 mt-1">{{ item.label }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { useChartOps } from '@/hooks/core/useChart'

  defineOptions({ name: 'CategoryContribution' })

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
  const chartType = ref<'salesAmount' | 'salesQuantity' | 'profit'>('salesAmount')

  // 图表数据
  const chartData = computed(() => {
    const typeMap = {
      salesAmount: 'salesAmount',
      salesQuantity: 'salesQuantity',
      profit: 'totalProfit'
    }
    const field = typeMap[chartType.value] as keyof Api.RestaurantAnalysis.CategoryAnalysisVO

    return props.categoryData.map((item) => ({
      name: item.categoryName,
      value: Number(item[field]) || 0
    }))
  })

  // 统计卡片数据
  const statsCards = computed(() => {
    const totalSales = props.categoryData.reduce(
      (sum, item) => sum + Number(item.salesAmount || 0),
      0
    )
    const totalQuantity = props.categoryData.reduce(
      (sum, item) => sum + Number(item.salesQuantity || 0),
      0
    )
    const totalProfit = props.categoryData.reduce(
      (sum, item) => sum + Number(item.totalProfit || 0),
      0
    )
    const totalCost = props.categoryData.reduce((sum, item) => sum + Number(item.totalCost || 0), 0)
    // const avgProfitRate = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0

    return [
      {
        label: '总销售额',
        value: `¥${totalSales.toFixed(0)}`,
        color: colors[0],
        bgColor: `${colors[0]}15`
      },
      {
        label: '总销量',
        value: totalQuantity,
        color: colors[1],
        bgColor: `${colors[1]}15`
      },
      {
        label: '总利润',
        value: `¥${totalProfit.toFixed(0)}`,
        color: colors[4],
        bgColor: `${colors[4]}15`
      },
      {
        label: '总成本',
        value: `¥${totalCost.toFixed(0)}`,
        color: colors[3],
        bgColor: `${colors[3]}15`
      }
    ]
  })
</script>

<style scoped lang="scss">
  .art-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

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
</style>
