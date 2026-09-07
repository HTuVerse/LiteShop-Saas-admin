<!-- 菜品销售额排行 -->
<template>
  <div class="art-card p-5 h-[27.8rem] mb-5">
    <div class="art-card-header">
      <div class="title">
        <h4>菜品销售额排行</h4>
        <p>按销售额从高到低排序</p>
      </div>
    </div>

    <div class="chart-container" v-loading="loading">
      <ArtHBarChart
        :data="chartData"
        :x-axis-data="xAxisData"
        :height="'22rem'"
        :show-tooltip="true"
        :show-axis-label="true"
        :loading="loading"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'

  defineOptions({ name: 'DishSalesRanking' })

  interface Props {
    /** 菜品排行数据 */
    dishData: Api.RestaurantAnalysis.DishSalesRankingVO[]
    /** 加载状态 */
    loading?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    dishData: () => [],
    loading: false
  })

  // X轴数据（菜品名称）
  const xAxisData = computed(() => {
    return props.dishData.map((item) => item.dishName).reverse()
  })

  // 图表数据（销售额）
  const chartData = computed(() => {
    return props.dishData.map((item) => item.salesAmount).reverse()
  })
</script>

<style scoped lang="scss">
  .art-card-header {
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
