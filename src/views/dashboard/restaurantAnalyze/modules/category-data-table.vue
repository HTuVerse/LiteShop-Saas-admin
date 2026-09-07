<!-- 分类数据详情表 -->
<template>
  <div class="art-card p-5 h-[27.8rem] mb-5 overflow-hidden">
    <div class="art-card-header">
      <div class="title">
        <h4>分类数据详情</h4>
        <p>各分类完整数据一览</p>
      </div>
    </div>

    <ElScrollbar style="height: 21.55rem" class="w-full" v-loading="loading">
      <ArtTable
        :data="tableData"
        style="margin-top: 0 !important"
        :border="false"
        :stripe="true"
        height="21.55rem"
        :header-cell-style="{ background: 'transparent' }"
        :columns="tableColumns"
      >
        <template #tableColumnsSlot1="scope">
          <span class="font-semibold text-base">{{ scope.row.categoryName }}</span>
        </template>
        <template #tableColumnsSlot2="scope">
          <div class="flex flex-col items-center">
            <span class="text-primary font-bold text-lg">{{ scope.row.salesQuantity }}</span>
            <span class="text-xs text-g-400"
              >{{ scope.row.salesQuantityPercent?.toFixed(1) || 0 }}%</span
            >
          </div>
        </template>
        <template #tableColumnsSlot3="scope">
          <div class="flex flex-col items-end">
            <span class="font-bold text-base">¥{{ scope.row.salesAmount.toFixed(2) }}</span>
            <span class="text-xs text-g-400"
              >{{ scope.row.salesAmountPercent?.toFixed(1) || 0 }}%</span
            >
          </div>
        </template>
        <template #tableColumnsSlot4="scope">
          <span class="text-g-500">¥{{ scope.row.totalCost.toFixed(2) }}</span>
        </template>
        <template #tableColumnsSlot5="scope">
          <span
            class="font-bold text-base"
            :class="scope.row.totalProfit >= 0 ? 'text-success' : 'text-danger'"
          >
            ¥{{ scope.row.totalProfit.toFixed(2) }}
          </span>
        </template>
        <template #tableColumnsSlot6="scope">
          <ElTag :type="getProfitRateType(scope.row.profitRate)" size="default" class="font-bold">
            {{ scope.row.profitRate.toFixed(1) }}%
          </ElTag>
        </template>
        <template #tableColumnsSlot7="scope">
          <span class="text-g-600 font-semibold">{{ scope.row.orderCount }}</span>
        </template>
        <template #tableColumnsSlot8="scope">
          <span class="text-g-600 font-semibold">¥{{ scope.row.avgOrderAmount.toFixed(2) }}</span>
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

  defineOptions({ name: 'CategoryDataTable' })

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

  /**
   * 获取利润率标签类型
   */
  const getProfitRateType = (profitRate: number): import('element-plus').TagProps['type'] => {
    if (profitRate >= 50) return 'success'
    if (profitRate >= 30) return 'info'
    if (profitRate >= 0) return 'warning'
    return 'danger'
  }

  const { data: tableData, columns: tableColumns } = useTable({
    core: {
      dataSource: () => props.categoryData,
      columnsFactory: () => [
        {
          label: '分类',
          prop: 'categoryName',
          minWidth: '120px',
          align: 'center',
          useSlot: true,
          slotName: 'tableColumnsSlot1'
        },
        {
          label: '销量',
          prop: 'salesQuantity',
          minWidth: '100px',
          align: 'center',
          useSlot: true,
          slotName: 'tableColumnsSlot2'
        },
        {
          label: '销售额',
          prop: 'salesAmount',
          minWidth: '130px',
          align: 'center',
          useSlot: true,
          slotName: 'tableColumnsSlot3'
        },
        {
          label: '成本',
          prop: 'totalCost',
          minWidth: '120px',
          align: 'right',
          useSlot: true,
          slotName: 'tableColumnsSlot4'
        },
        {
          label: '利润',
          prop: 'totalProfit',
          minWidth: '120px',
          align: 'right',
          useSlot: true,
          slotName: 'tableColumnsSlot5'
        },
        {
          label: '利润率',
          prop: 'profitRate',
          minWidth: '100px',
          align: 'center',
          useSlot: true,
          slotName: 'tableColumnsSlot6'
        },
        {
          label: '订单数',
          prop: 'orderCount',
          minWidth: '100px',
          align: 'center',
          useSlot: true,
          slotName: 'tableColumnsSlot7'
        },
        {
          label: '客单价',
          prop: 'avgOrderAmount',
          minWidth: '120px',
          align: 'right',
          useSlot: true,
          slotName: 'tableColumnsSlot8'
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
</style>
