<!-- 滞销菜品分析 -->
<template>
  <div class="art-card p-5 h-[27.8rem] mb-5 overflow-hidden">
    <div class="art-card-header">
      <div class="title">
        <h4>滞销菜品分析</h4>
        <p>识别近{{ defaultDays }}天销量低的菜品</p>
      </div>
    </div>

    <ElScrollbar style="height: 21.55rem; overflow-x: auto" class="w-full" v-loading="loading">
      <ArtTable
        :data="tableData"
        style="margin-top: 0 !important"
        :border="false"
        :stripe="false"
        :header-cell-style="{ background: 'transparent' }"
        height="21.55rem"
        :columns="tableColumns"
      >
        <template #tableColumnsSlot1="scope">
          <div class="flex-c">
            <img
              class="size-10 object-cover rounded-md flex-shrink-0"
              :src="scope.row.dishPic || defaultDishImage"
              @error="handleImageError"
            />
            <div class="flex flex-col ml-2 overflow-hidden">
              <div class="font-medium truncate">{{ scope.row.dishName }}</div>
              <div class="text-xs text-slate-500 truncate">{{ scope.row.categoryName }}</div>
            </div>
          </div>
        </template>
        <template #tableColumnsSlot2="scope">
          <span class="text-warning font-semibold">{{ scope.row.salesQuantity ?? 0 }}</span>
        </template>
        <template #tableColumnsSlot3="scope">
          <span class="text-g-600">¥{{ scope.row.salesAmount?.toFixed(2) || '0.00' }}</span>
        </template>
        <template #tableColumnsSlot4="scope">
          <span class="text-primary font-semibold">{{ scope.row.salesLast30Days ?? 0 }}</span>
        </template>
        <template #tableColumnsSlot5="scope">
          <span class="text-g-600"
            >¥{{ scope.row.salesAmountLast30Days?.toFixed(2) || '0.00' }}</span
          >
        </template>
        <template #tableColumnsSlot6="scope">
          <span class="text-g-500 text-sm">{{ scope.row.avgDailySales?.toFixed(1) || '0.0' }}</span>
        </template>
        <template #tableColumnsSlot7="scope">
          <span :class="getStockClass(scope.row.stock)">{{ scope.row.stock ?? '-' }}</span>
        </template>
        <template #tableColumnsSlot8="scope">
          <ElTag :type="getSlowMovingType(scope.row.slowMovingDays)" size="small">
            {{ scope.row.slowMovingDays }}天
          </ElTag>
        </template>
        <template #tableColumnsSlot9="scope">
          <span class="text-xs text-g-500">{{ formatDateTime(scope.row.lastSaleTime) }}</span>
        </template>
        <template #tableColumnsSlot10="scope">
          <ElTag
            :type="getSuggestionType(scope.row.suggestion)"
            size="small"
            class="suggestion-tag"
          >
            {{ scope.row.suggestion }}
          </ElTag>
        </template>
      </ArtTable>

      <div v-if="!loading && tableData.length === 0" class="flex-cc h-60 text-g-400">
        暂无滞销菜品
      </div>
    </ElScrollbar>
  </div>
</template>

<script setup lang="ts">
  import { useTable } from '@/hooks/core/useTable'
  // 使用默认头像作为占位图
  import defaultDishImg from '@/assets/images/avatar/avatar.webp'

  defineOptions({ name: 'SlowMovingDishes' })

  interface Props {
    /** 滞销菜品数据 */
    dishData: Api.RestaurantAnalysis.SlowMovingDishVO[]
    /** 加载状态 */
    loading?: boolean
    /** 默认天数 */
    defaultDays?: number
  }

  const props = withDefaults(defineProps<Props>(), {
    dishData: () => [],
    loading: false,
    defaultDays: 30
  })

  const defaultDishImage = defaultDishImg

  /**
   * 获取滞销天数标签类型
   */
  const getSlowMovingType = (days: number): import('element-plus').TagProps['type'] => {
    if (days >= 30) return 'danger'
    if (days >= 15) return 'warning'
    return 'info'
  }

  /**
   * 获取建议操作标签类型
   */
  const getSuggestionType = (suggestion: string): import('element-plus').TagProps['type'] => {
    if (!suggestion) return 'info'
    if (suggestion.includes('下架')) return 'danger'
    if (suggestion.includes('促销')) return 'warning'
    return 'info'
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
   * 格式化日期时间
   */
  const formatDateTime = (dateTimeStr: string): string => {
    if (!dateTimeStr) return '-'
    const date = new Date(dateTimeStr)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diff === 0) return '今天'
    if (diff === 1) return '昨天'
    if (diff < 7) return `${diff}天前`
    // 返回 MM-DD HH:mm 格式
    return dateTimeStr.substring(5, 16)
  }

  /**
   * 处理图片加载错误
   */
  const handleImageError = (e: Event) => {
    const target = e.target as HTMLImageElement
    target.src = defaultDishImage
  }

  const { data: tableData, columns: tableColumns } = useTable({
    core: {
      dataSource: () => props.dishData,
      columnsFactory: () => [
        {
          label: '菜品',
          prop: 'dishName',
          minWidth: '140px',
          fixed: 'left',
          useSlot: true,
          slotName: 'tableColumnsSlot1'
        },
        {
          label: '统计期销量',
          prop: 'salesQuantity',
          width: '90px',
          align: 'center',
          useSlot: true,
          slotName: 'tableColumnsSlot2'
        },
        {
          label: '统计期销售额',
          prop: 'salesAmount',
          width: '100px',
          align: 'right',
          useSlot: true,
          slotName: 'tableColumnsSlot3'
        },
        {
          label: '30天销量',
          prop: 'salesLast30Days',
          width: '90px',
          align: 'center',
          useSlot: true,
          slotName: 'tableColumnsSlot4'
        },
        {
          label: '30天销售额',
          prop: 'salesAmountLast30Days',
          width: '100px',
          align: 'right',
          useSlot: true,
          slotName: 'tableColumnsSlot5'
        },
        {
          label: '日均',
          prop: 'avgDailySales',
          width: '70px',
          align: 'center',
          useSlot: true,
          slotName: 'tableColumnsSlot6'
        },
        {
          label: '库存',
          prop: 'stock',
          width: '70px',
          align: 'center',
          useSlot: true,
          slotName: 'tableColumnsSlot7'
        },
        {
          label: '滞销天数',
          prop: 'slowMovingDays',
          width: '90px',
          align: 'center',
          useSlot: true,
          slotName: 'tableColumnsSlot8'
        },
        {
          label: '最后销售',
          prop: 'lastSaleTime',
          width: '110px',
          useSlot: true,
          slotName: 'tableColumnsSlot9'
        },
        {
          label: '建议',
          prop: 'suggestion',
          minWidth: '120px',
          fixed: 'right',
          useSlot: true,
          slotName: 'tableColumnsSlot10'
        }
      ]
    }
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

  .suggestion-tag {
    height: auto;
    padding: 4px 8px;
    line-height: 1.4;
    word-break: break-word;
    white-space: normal;
  }
</style>
