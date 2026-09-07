<!-- 菜品利润率排行 -->
<template>
  <div class="art-card p-5 h-[27.8rem] mb-5 overflow-hidden">
    <div class="art-card-header">
      <div class="title">
        <h4>菜品利润率排行</h4>
        <p>按利润率从高到低排序</p>
      </div>
    </div>

    <ElScrollbar style="height: 21.55rem" class="w-full" v-loading="loading">
      <div class="profit-list">
        <div
          v-for="(item, index) in displayData"
          :key="item.dishId"
          class="profit-item"
          :class="{ 'top-three': index < 3 }"
        >
          <div class="rank-badge" :class="getRankClass(index + 1)">
            {{ index + 1 }}
          </div>
          <div class="dish-info">
            <div class="dish-name">{{ item.dishName }}</div>
            <div class="category-name">{{ item.categoryName }}</div>
          </div>
          <div class="profit-info">
            <div class="profit-rate">{{ item.profitRate.toFixed(2) }}%</div>
            <div class="profit-amount">利润: ¥{{ item.profit.toFixed(2) }}</div>
          </div>
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{
                width: `${item.profitRate}%`,
                backgroundColor: getProgressColor(index + 1)
              }"
            ></div>
          </div>
        </div>
      </div>

      <div v-if="!loading && displayData.length === 0" class="flex-cc h-60 text-g-400">
        暂无数据
      </div>
    </ElScrollbar>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'

  defineOptions({ name: 'DishProfitRanking' })

  interface Props {
    /** 菜品利润率排行数据 */
    dishData: Api.RestaurantAnalysis.DishSalesRankingVO[]
    /** 加载状态 */
    loading?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    dishData: () => [],
    loading: false
  })

  // 显示数据
  const displayData = computed(() => {
    return props.dishData.slice(0, 10)
  })

  /**
   * 获取排名样式类名
   */
  const getRankClass = (rank: number): string => {
    if (rank === 1) return 'rank-1'
    if (rank === 2) return 'rank-2'
    if (rank === 3) return 'rank-3'
    return 'rank-default'
  }

  /**
   * 获取进度条颜色
   */
  const getProgressColor = (rank: number): string => {
    if (rank === 1) return '#f59e0b'
    if (rank === 2) return '#94a3b8'
    if (rank === 3) return '#ea580c'
    return 'var(--el-color-primary)'
  }
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

  .profit-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .profit-item {
    display: grid;
    grid-template-rows: auto auto;
    grid-template-columns: 40px 1fr auto;
    gap: 0.5rem;
    padding: 1rem;
    background-color: var(--el-fill-color-light);
    border-radius: 0.5rem;
    transition: all 0.3s ease;

    &:hover {
      background-color: var(--el-fill-color);
      transform: translateX(4px);
    }

    &.top-three {
      background: linear-gradient(135deg, var(--el-color-primary-light-9) 0%, transparent 100%);
    }

    .rank-badge {
      display: flex;
      grid-row: 1 / 3;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      font-size: 0.875rem;
      font-weight: 600;
      border-radius: 50%;

      &.rank-1 {
        color: white;
        background-color: #f59e0b;
      }

      &.rank-2 {
        color: white;
        background-color: #94a3b8;
      }

      &.rank-3 {
        color: white;
        background-color: #ea580c;
      }

      &.rank-default {
        color: var(--el-text-color-secondary);
        background-color: var(--el-fill-color);
      }
    }

    .dish-info {
      display: flex;
      flex-direction: column;
      grid-row: 1;
      grid-column: 2;
      gap: 0.25rem;

      .dish-name {
        font-size: 0.9375rem;
        font-weight: 500;
      }

      .category-name {
        font-size: 0.75rem;
        color: var(--el-text-color-secondary);
      }
    }

    .profit-info {
      display: flex;
      flex-direction: column;
      grid-row: 1;
      grid-column: 3;
      gap: 0.25rem;
      align-items: flex-end;

      .profit-rate {
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--el-color-success);
      }

      .profit-amount {
        font-size: 0.75rem;
        color: var(--el-text-color-secondary);
      }
    }

    .progress-bar {
      grid-row: 2;
      grid-column: 2 / 4;
      height: 6px;
      overflow: hidden;
      background-color: var(--el-fill-color);
      border-radius: 3px;

      .progress-fill {
        height: 100%;
        border-radius: 3px;
        transition: width 0.6s ease;
      }
    }
  }
</style>
