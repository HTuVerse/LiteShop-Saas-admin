<!-- 月度销售利润图表组件 -->
<template>
  <div class="art-card p-5 mb-5 h-105 max-sm:mb-4">
    <div class="art-card-header">
      <div class="title">
        <h4>月度销售与利润</h4>
        <p>{{ selectedYear }}年每月销售额和利润趋势</p>
      </div>
      <div class="actions">
        <ElDatePicker
          v-model="selectedYear"
          type="year"
          placeholder="选择年份"
          format="YYYY年"
          value-format="YYYY"
          :clearable="false"
          :disabled-date="disabledDate"
          style="width: 100px"
          @change="handleYearChange"
        />
      </div>
    </div>

    <!-- 空数据提示 -->
    <div
      v-if="!loading && (!monthlyData || monthlyData.length === 0)"
      class="flex-cc flex-col h-[calc(100%-56px)] text-g-400"
    >
      <ArtSvgIcon icon="ri:line-chart-line" class="text-5xl mb-3 opacity-30" />
      <p class="text-sm">{{ selectedYear }}年暂无销售数据</p>
    </div>

    <!-- 图表 -->
    <ArtLineChart
      v-else
      height="calc(100% - 56px)"
      :data="chartData"
      :xAxisData="xAxisData"
      :loading="loading"
      :showLegend="true"
      legendPosition="top"
    />
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch, onMounted } from 'vue'
  import { fetchMonthlySalesProfit } from '@/api/restaurant-analysis'
  import { ElMessage } from 'element-plus'

  interface Props {
    /** 门店ID */
    storeId: number
  }

  const props = defineProps<Props>()

  // 当前选中的年份，默认为当前年份
  const selectedYear = ref<string>(new Date().getFullYear().toString())
  const loading = ref(false)
  const monthlyData = ref<Api.RestaurantAnalysis.MonthlySalesProfitVO[]>([])

  /** 禁用未来的年份 */
  const disabledDate = (date: Date) => {
    return date.getFullYear() > new Date().getFullYear()
  }

  /** 加载月度销售利润数据 */
  const loadMonthlyData = async () => {
    if (!props.storeId || props.storeId === 0) {
      return
    }

    try {
      loading.value = true
      const year = parseInt(selectedYear.value)
      const data = await fetchMonthlySalesProfit(props.storeId, year)
      monthlyData.value = data || []
    } catch (error: any) {
      console.error('加载月度销售利润数据失败:', error)
      ElMessage.error(error.message || '加载月度销售利润数据失败')
      monthlyData.value = []
    } finally {
      loading.value = false
    }
  }

  /** 年份变化处理 */
  const handleYearChange = () => {
    loadMonthlyData()
  }

  /** 图表数据 - 包含销售额和利润 */
  const chartData = computed(() => {
    return [
      {
        name: '销售额',
        data: monthlyData.value.map((item) => Number(item.sales) || 0)
      },
      {
        name: '利润',
        data: monthlyData.value.map((item) => Number(item.profit) || 0)
      }
    ]
  })

  /** X轴数据 - 月份数组 */
  const xAxisData = computed(() => {
    return monthlyData.value.map((item) => `${item.month}月`)
  })

  /** 监听门店ID变化 */
  watch(
    () => props.storeId,
    (newStoreId) => {
      if (newStoreId && newStoreId > 0) {
        loadMonthlyData()
      }
    }
  )

  /** 组件挂载时加载数据 */
  onMounted(() => {
    if (props.storeId && props.storeId > 0) {
      loadMonthlyData()
    }
  })
</script>

<style scoped lang="scss">
  .art-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;

    .title {
      h4 {
        margin: 0 0 4px;
        font-size: 16px;
        font-weight: 600;
        color: var(--art-text-color-primary);
      }

      p {
        margin: 0;
        font-size: 12px;
        color: var(--art-text-color-secondary);
      }
    }

    .actions {
      display: flex;
      gap: 10px;
      align-items: center;
    }
  }
</style>
