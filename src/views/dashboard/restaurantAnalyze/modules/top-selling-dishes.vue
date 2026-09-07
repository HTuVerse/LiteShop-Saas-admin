<!-- 热销菜品排行 -->
<template>
  <div class="art-card p-5 h-[27.8rem] mb-5 overflow-hidden max-sm:mb-4">
    <div class="art-card-header">
      <div class="title">
        <h4>热销菜品排行</h4>
        <p>按销量从高到低排序</p>
      </div>
      <div class="flex-c gap-2">
        <ElSelect v-model="topN" @change="handleTopNChange" style="width: 90px">
          <ElOption label="Top 5" :value="5" />
          <ElOption label="Top 10" :value="10" />
          <ElOption label="Top 20" :value="20" />
        </ElSelect>
      </div>
    </div>

    <ElScrollbar style="height: 21.55rem" class="w-full" v-loading="loading">
      <ArtTable
        :data="tableData"
        style="margin-top: 0 !important"
        :border="false"
        :stripe="false"
        :header-cell-style="{ background: 'transparent' }"
        :columns="tableColumns"
      >
        <template #tableColumnsSlot1="scope">
          <div
            class="size-7 flex-cc rounded-full text-sm font-semibold"
            :class="getRankClass(scope.row.ranking)"
          >
            {{ scope.row.ranking }}
          </div>
        </template>
        <template #tableColumnsSlot2="scope">
          <div class="flex-c">
            <!-- 图片容器：正常显示图片，加载失败或无图片时显示图标 -->
            <div class="size-10 flex-shrink-0 rounded-md overflow-hidden">
              <img
                v-if="scope.row.dishPic && !imageErrors.has(scope.row.dishId)"
                class="size-full object-cover"
                :src="scope.row.dishPic"
                @error="() => handleImageError(scope.row.dishId)"
              />
              <div v-else class="size-full bg-gray-100 flex-cc">
                <ArtSvgIcon icon="ri:image-line" class="text-xl text-gray-400" />
              </div>
            </div>
            <div class="flex flex-col ml-2 overflow-hidden">
              <div class="font-medium truncate">{{ scope.row.dishName }}</div>
              <div class="text-xs text-slate-500 truncate">{{ scope.row.categoryName }}</div>
            </div>
          </div>
        </template>
        <template #tableColumnsSlot3="scope">
          <span class="font-semibold text-primary">{{ scope.row.salesQuantity }}</span>
        </template>
        <template #tableColumnsSlot4="scope">
          <span class="font-semibold">¥{{ scope.row.salesAmount.toFixed(2) }}</span>
        </template>
        <template #tableColumnsSlot5="scope">
          <span class="text-g-500">¥{{ scope.row.costPrice?.toFixed(2) || '0.00' }}</span>
        </template>
        <template #tableColumnsSlot6="scope">
          <span class="font-semibold text-success"
            >¥{{ scope.row.profit?.toFixed(2) || '0.00' }}</span
          >
        </template>
        <template #tableColumnsSlot7="scope">
          <span :class="getStockClass(scope.row.stock)">{{ scope.row.stock ?? '-' }}</span>
        </template>
        <template #tableColumnsSlot8="scope">
          <ElProgress
            :percentage="calculateProfitRatePercentage(scope.row.profitRate)"
            :color="getProfitRateColor(scope.row.profitRate)"
            :stroke-width="4"
          >
            <template #default="{ percentage }">
              <span class="text-xs">{{ scope.row.profitRate?.toFixed(1) || '0' }}%</span>
            </template>
          </ElProgress>
        </template>
      </ArtTable>

      <div v-if="!loading && tableData.length === 0" class="flex-cc h-60 text-g-400">
        暂无数据
      </div>
    </ElScrollbar>
  </div>
</template>

<script setup lang="ts">
  import { useTable } from '@/hooks/core/useTable'
  import { ref, watch, reactive } from 'vue'

  defineOptions({ name: 'TopSellingDishes' })

  interface Props {
    /** 菜品排行数据 */
    dishData: Api.RestaurantAnalysis.DishSalesRankingVO[]
    /** 加载状态 */
    loading?: boolean
    /** 默认显示数量 */
    defaultTopN?: number
  }

  const props = withDefaults(defineProps<Props>(), {
    dishData: () => [],
    loading: false,
    defaultTopN: 10
  })

  const emit = defineEmits<{
    (e: 'topNChange', topN: number): void
  }>()

  // 状态
  const topN = ref(props.defaultTopN)
  // 记录图片加载失败的菜品ID
  const imageErrors = reactive(new Set<number>())

  /**
   * 获取排名样式类名
   */
  const getRankClass = (rank: number): string => {
    if (rank === 1) return 'bg-amber-500 text-white'
    if (rank === 2) return 'bg-slate-400 text-white'
    if (rank === 3) return 'bg-orange-600 text-white'
    return 'bg-gray-200 text-gray-600'
  }

  /**
   * 获取进度条颜色
   */
  const getProgressColor = (rank: number): string => {
    if (rank <= 3) return 'var(--art-primary)'
    if (rank <= 5) return 'var(--art-success)'
    if (rank <= 10) return 'var(--art-info)'
    return 'var(--art-warning)'
  }

  /**
   * 计算利润率百分比（用于进度条显示）
   * 将利润率转换为0-100的百分比值
   */
  const calculateProfitRatePercentage = (profitRate: number | undefined): number => {
    if (!profitRate) return 0
    // 利润率已经是百分比，直接返回，但限制在0-100之间
    return Math.min(Math.max(profitRate, 0), 100)
  }

  /**
   * 获取利润率进度条颜色
   */
  const getProfitRateColor = (profitRate: number | undefined): string => {
    if (!profitRate) return 'var(--art-danger)'
    if (profitRate >= 50) return 'var(--art-success)'
    if (profitRate >= 30) return 'var(--art-primary)'
    if (profitRate >= 10) return 'var(--art-warning)'
    return 'var(--art-danger)'
  }

  /**
   * 获取库存样式类名
   */
  const getStockClass = (stock: number | undefined): string => {
    if (stock === undefined || stock === null) return 'text-g-400'
    if (stock === 0) return 'text-danger font-semibold'
    if (stock < 10) return 'text-warning font-semibold'
    return 'text-g-600'
  }

  /**
   * 处理图片加载错误
   */
  const handleImageError = (dishId: number) => {
    imageErrors.add(dishId)
  }

  /**
   * 处理Top N变化
   */
  const handleTopNChange = () => {
    emit('topNChange', topN.value)
  }

  const { data: tableData, columns: tableColumns } = useTable({
    core: {
      dataSource: () => props.dishData,
      columnsFactory: () => [
        {
          label: '排名',
          prop: 'ranking',
          width: '60px',
          align: 'center',
          useSlot: true,
          slotName: 'tableColumnsSlot1'
        },
        {
          label: '菜品',
          prop: 'dishName',
          minWidth: '180px',
          useSlot: true,
          slotName: 'tableColumnsSlot2'
        },
        {
          label: '销量',
          prop: 'salesQuantity',
          width: '80px',
          align: 'center',
          useSlot: true,
          slotName: 'tableColumnsSlot3'
        },
        {
          label: '销售额',
          prop: 'salesAmount',
          width: '100px',
          align: 'right',
          useSlot: true,
          slotName: 'tableColumnsSlot4'
        },
        {
          label: '成本',
          prop: 'costPrice',
          width: '100px',
          align: 'right',
          useSlot: true,
          slotName: 'tableColumnsSlot5'
        },
        {
          label: '利润',
          prop: 'profit',
          width: '100px',
          align: 'right',
          useSlot: true,
          slotName: 'tableColumnsSlot6'
        },
        {
          label: '库存',
          prop: 'stock',
          width: '80px',
          align: 'center',
          useSlot: true,
          slotName: 'tableColumnsSlot7'
        },
        {
          prop: 'tableColumnsColumn8',
          label: '利润率',
          minWidth: '120px',
          useSlot: true,
          slotName: 'tableColumnsSlot8'
        }
      ]
    }
  })

  watch(
    () => props.dishData,
    () => {
      imageErrors.clear()
    },
    { immediate: true }
  )
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
</style>
