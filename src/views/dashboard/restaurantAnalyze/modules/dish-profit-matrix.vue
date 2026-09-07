<!-- 菜品利润矩阵分析 -->
<template>
  <div class="art-card p-5 h-auto mb-5">
    <div class="art-card-header mb-5">
      <div class="title">
        <h4 class="text-lg font-bold">菜品利润矩阵</h4>
        <p class="text-sm text-g-500">基于"销量"与"利润率"的四象限经营分析</p>
      </div>
    </div>

    <div class="matrix-layout" v-loading="loading">
      <!-- 左侧：菜品列表区域 -->
      <div class="dish-list-wrapper">
        <div class="art-card p-5">
          <div class="pb-3.5">
            <p class="text-lg font-medium">{{ selectedQuadrant?.name || '全部菜品' }}</p>
            <p class="text-sm text-g-600">共 {{ displayData.length }} 个菜品</p>
          </div>
          <ElScrollbar style="height: 400px">
            <div v-for="item in displayData" :key="item.dishId" class="flex-c py-3 dish-item">
              <!-- 菜品图片 -->
              <div class="dish-image mr-3">
                <ElImage
                  :src="item.dishPic || '/default-dish.png'"
                  fit="cover"
                  class="w-full h-full"
                  lazy
                >
                  <template #error>
                    <div class="image-error">
                      <ArtSvgIcon icon="ri:restaurant-line" class="text-2xl" />
                    </div>
                  </template>
                </ElImage>
                <!-- 象限标签 -->
                <div
                  class="quadrant-badge"
                  :style="{ backgroundColor: getQuadrantColor(item.quadrantType) }"
                >
                  {{ getQuadrantName(item.quadrantType) }}
                </div>
              </div>

              <!-- 菜品信息 -->
              <div class="flex-4">
                <div class="mb-1 text-sm font-medium">{{ item.dishName }}</div>
                <div class="text-xs text-g-500 mb-1">
                  销量: {{ item.salesQuantity }} | 利润率: {{ item.profitRate.toFixed(2) }}%
                </div>
                <div class="text-xs text-g-500">
                  利润: ¥{{ ((item.salesAmount * item.profitRate) / 100).toFixed(2) }}
                </div>
              </div>

              <!-- 销售额 -->
              <div class="flex-1">
                <div class="text-base font-bold text-primary"
                  >¥{{ item.salesAmount.toFixed(2) }}</div
                >
                <div class="text-xs ml-4.5 text-g-500 mt-1">销售额</div>
              </div>
            </div>

            <div v-if="!loading && displayData.length === 0" class="flex-cc h-60 text-g-400">
              <div class="text-center">
                <ArtSvgIcon icon="ri:inbox-line" class="text-5xl mb-3 opacity-30" />
                <p class="text-sm">{{
                  selectedQuadrantType ? '该象限暂无菜品' : '暂无菜品数据'
                }}</p>
              </div>
            </div>
          </ElScrollbar>
          <ElButton
            class="mt-[25px] w-full text-center"
            v-if="selectedQuadrantType !== null"
            v-ripple
            @click="selectedQuadrantType = null"
          >
            查看全部
          </ElButton>
        </div>
      </div>
      <!-- 右侧：象限统计卡片 -->
      <div class="quadrant-section">
        <div class="grid grid-cols-2 gap-4">
          <div
            v-for="(quadrant, index) in quadrants"
            :key="index"
            class="quadrant-card-wrapper"
            :class="{ active: selectedQuadrantType === quadrant.type }"
            @click="handleQuadrantClick(quadrant.type)"
          >
            <div class="art-card p-6 h-full quadrant-card-content">
              <!-- 数量徽章 - 右上角 -->
              <div
                class="count-badge"
                :style="{ backgroundColor: quadrant.tagBg, color: quadrant.color }"
              >
                {{ getQuadrantCount(quadrant.type) }}
              </div>

              <!-- 卡片头部 -->
              <div class="card-top flex-c mb-5">
                <div class="icon-box mr-3.5" :class="quadrant.iconStyle">
                  <ArtSvgIcon :icon="quadrant.icon" class="text-2xl" />
                </div>
                <div class="flex-1">
                  <div class="text-base font-semibold mb-1.5 leading-tight">{{
                    quadrant.name
                  }}</div>
                  <div class="text-xs text-g-500 leading-relaxed">{{ quadrant.description }}</div>
                </div>
              </div>

              <!-- 建议标签 -->
              <div
                class="suggestion-tag mb-5"
                :style="{ backgroundColor: quadrant.tagBg, color: quadrant.color }"
              >
                <ArtSvgIcon icon="ri:lightbulb-line" class="mr-1.5 text-sm" />
                <span class="text-xs">{{ quadrant.suggestion }}</span>
              </div>

              <!-- Top菜品 -->
              <div class="top-dishes">
                <div class="text-xs text-g-500 mb-3 font-medium">热门菜品</div>
                <div class="dishes-list">
                  <div
                    v-for="dish in getTopDishesInQuadrant(quadrant.type, 2)"
                    :key="dish.dishId"
                    class="dish-tag"
                    :title="dish.dishName"
                  >
                    {{ dish.dishName }}
                  </div>
                  <div v-if="getQuadrantCount(quadrant.type) === 0" class="empty-tag">
                    暂无菜品
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { useChartOps } from '@/hooks/core/useChart'
  import ArtStatsCard from '@/components/core/cards/art-stats-card/index.vue'

  defineOptions({ name: 'DishProfitMatrix' })

  interface Props {
    /** 利润矩阵数据 */
    matrixData: Api.RestaurantAnalysis.DishProfitMatrixVO[]
    /** 加载状态 */
    loading?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    matrixData: () => [],
    loading: false
  })

  const { colors } = useChartOps()

  // 当前选中的象限类型
  const selectedQuadrantType = ref<string | null>(null)

  // 象限类型映射（后端英文常量 -> 前端中文显示）
  const quadrantTypeMap: Record<string, string> = {
    GOLDEN_COW: '金牛产品',
    STAR: '明星产品',
    CASH_COW: '引流产品',
    DOG: '瘦狗产品'
  }

  // 象限配置
  const quadrants = [
    {
      name: '金牛产品',
      type: 'GOLDEN_COW',
      description: '高销量 · 高利润',
      suggestion: '核心护城河，重点维护',
      color: '#ff9c6e', // 温暖的金橙色
      tagBg: 'rgba(255, 156, 110, 0.1)',
      icon: 'solar:cup-first-outline',
      iconStyle: 'bg-gradient-to-br from-[#ff9c6e] to-[#ff7a45]'
    },
    {
      name: '明星产品',
      type: 'STAR',
      description: '低销量 · 高利润',
      suggestion: '高质潜力股，加强推广',
      color: '#69c0ff', // 明亮的蓝色
      tagBg: 'rgba(105, 192, 255, 0.1)',
      icon: 'material-symbols:star-shine-outline',
      iconStyle: 'bg-gradient-to-br from-[#69c0ff] to-[#40a9ff]'
    },
    {
      name: '引流产品',
      type: 'CASH_COW',
      description: '高销量 · 低利润',
      suggestion: '人气保障，严控成本',
      color: '#95de64', // 生机的绿色
      tagBg: 'rgba(149, 222, 100, 0.1)',
      icon: 'arcticons:emoji-fire',
      iconStyle: 'bg-gradient-to-br from-[#95de64] to-[#73d13d]'
    },
    {
      name: '瘦狗产品',
      type: 'DOG',
      description: '低销量 · 低利润',
      suggestion: '边缘化菜品，考虑淘汰',
      color: '#bfbfbf', // 沉稳的灰色
      tagBg: 'rgba(191, 191, 191, 0.1)',
      icon: 'ri:delete-bin-4-fill',
      iconStyle: 'bg-gradient-to-br from-[#bfbfbf] to-[#8c8c8c]'
    }
  ]

  // 当前选中的象限对象
  const selectedQuadrant = computed(() => {
    if (!selectedQuadrantType.value) return null
    return quadrants.find((q) => q.type === selectedQuadrantType.value)
  })

  // 显示数据（根据选中的象限过滤）
  const displayData = computed(() => {
    if (!selectedQuadrantType.value) {
      return props.matrixData
    }
    return props.matrixData.filter((item) => item.quadrantType === selectedQuadrantType.value)
  })

  /**
   * 获取象限中文名称
   */
  const getQuadrantName = (quadrantType: string): string => {
    return quadrantTypeMap[quadrantType] || quadrantType
  }

  /**
   * 获取象限颜色
   */
  const getQuadrantColor = (quadrantType: string): string => {
    const quadrant = quadrants.find((q) => q.type === quadrantType)
    return quadrant?.color || colors[0]
  }

  /**
   * 获取象限菜品数量
   */
  const getQuadrantCount = (quadrantType: string): number => {
    if (!props.matrixData || props.matrixData.length === 0) {
      return 0
    }
    return props.matrixData.filter((item) => item.quadrantType === quadrantType).length
  }

  /**
   * 获取象限内Top菜品
   */
  const getTopDishesInQuadrant = (quadrantType: string, limit: number) => {
    return props.matrixData
      .filter((item) => item.quadrantType === quadrantType)
      .sort((a, b) => b.salesAmount - a.salesAmount)
      .slice(0, limit)
  }

  /**
   * 处理象限卡片点击
   */
  const handleQuadrantClick = (quadrantType: string) => {
    // 如果点击的是当前选中的象限，则取消选中（显示全部）
    if (selectedQuadrantType.value === quadrantType) {
      selectedQuadrantType.value = null
    } else {
      selectedQuadrantType.value = quadrantType
    }
  }
</script>

<style scoped lang="scss">
  .art-card-header {
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

  .matrix-layout {
    display: grid;
    grid-template-columns: 1.3fr 1fr;
    gap: 1.5rem;

    @media (width <= 1200px) {
      grid-template-columns: 1fr;
    }
  }

  // 左侧菜品列表区域
  .dish-list-wrapper {
    :deep(.art-card) {
      height: 100%;
    }

    .dish-item {
      border-bottom: 1px solid var(--el-border-color-lighter);
      transition: all 0.3s ease;

      &:hover {
        padding-right: 0.5rem;
        padding-left: 0.5rem;
        margin-right: -0.5rem;
        margin-left: -0.5rem;
        background: var(--el-fill-color-light);
        border-radius: 8px;
      }

      &:last-child {
        border-bottom: none;
      }
    }

    .dish-image {
      position: relative;
      flex-shrink: 0;
      width: 60px;
      height: 60px;
      overflow: hidden;
      background: var(--el-fill-color-light);
      border-radius: 8px;

      .image-error {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        color: var(--el-text-color-placeholder);
        background: var(--el-fill-color);
      }

      .quadrant-badge {
        position: absolute;
        right: 0;
        bottom: 0;
        left: 0;
        padding: 2px 4px;
        font-size: 10px;
        font-weight: 500;
        color: white;
        text-align: center;
        backdrop-filter: blur(4px);
      }
    }
  }

  // 右侧象限卡片区域
  .quadrant-section {
    .quadrant-card-wrapper {
      cursor: pointer;
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-4px);

        :deep(.art-card) {
          box-shadow: 0 12px 24px -8px rgb(0 0 0 / 15%);
        }
      }

      &.active {
        :deep(.art-card) {
          border: 2px solid var(--el-color-primary);
          box-shadow: 0 8px 20px -6px var(--el-color-primary);
        }
      }

      .quadrant-card-content {
        position: relative;
        display: flex;
        flex-direction: column;
        min-height: 220px;
      }

      .count-badge {
        position: absolute;
        top: 16px;
        right: 16px;
        padding: 2px 4px;
        font-family: 'DIN Alternate', sans-serif;
        font-size: 1.5rem;
        font-weight: 800;
        line-height: 0.5;
        border-radius: 20px;
        box-shadow: 0 2px 8px rgb(0 0 0 / 8%);
        transition: all 0.3s ease;

        &:hover {
          transform: scale(1.1);
        }
      }

      .card-top {
        .icon-box {
          display: flex;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          color: white;
          border-radius: 12px;
        }
      }

      .suggestion-tag {
        display: flex;
        align-items: center;
        padding: 8px 12px;
        font-size: 0.8125rem;
        font-weight: 500;
        line-height: 1.5;
        border-radius: 8px;
      }

      .top-dishes {
        display: flex;
        flex: 1;
        flex-direction: column;

        .dishes-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          min-height: 32px;
        }

        .dish-tag {
          max-width: 100%;
          padding: 5px 10px;
          overflow: hidden;
          font-size: 0.75rem;
          line-height: 1.4;
          color: var(--el-text-color-regular);
          text-overflow: ellipsis;
          white-space: nowrap;
          background: var(--el-fill-color-light);
          border: 1px solid var(--el-border-color-lighter);
          border-radius: 12px;
          transition: all 0.2s ease;

          &:hover {
            background: var(--el-fill-color);
            transform: translateY(-1px);
          }
        }

        .empty-tag {
          font-size: 0.75rem;
          font-style: italic;
          line-height: 1.5;
          color: var(--el-text-color-placeholder);
        }
      }
    }
  }
</style>
