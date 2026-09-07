<!-- 餐饮数据分析页面 -->
<template>
  <div class="restaurant-analysis">
    <!-- 顶部横幅区：销售概览 + 筛选控制 -->
    <ElRow :gutter="20">
      <ElCol :sm="24" :md="16" :lg="16">
        <!-- 销售概览横幅 -->
        <SalesOverviewBanner
          :timeRangeType="timeRangeType"
          :currentSales="salesOverview?.currentSales || 0"
          :periodOnPeriodGrowthRate="salesOverview?.periodOnPeriodGrowthRate || 0"
          :currentOrderCount="salesOverview?.currentOrderCount || 0"
          :avgOrderAmount="salesOverview?.avgOrderAmount || 0"
        />
      </ElCol>
      <ElCol :sm="24" :md="8" :lg="8">
        <!-- 筛选控制横幅 -->
        <AnalysisHeaderBanner
          :storeId="storeId"
          :timeRangeType="timeRangeType"
          :dateRange="dateRange"
          @storeChange="handleStoreChange"
          @timeRangeChange="handleTimeRangeChange"
          @dateRangeChange="handleDateRangeChange"
        />
      </ElCol>
    </ElRow>

    <!--销售趋势 + 时段销售分布 -->
    <ElRow :gutter="20">
      <ElCol :sm="24" :md="12" :lg="12">
        <SalesTrend :trendData="salesTrendList" :days="queryDays" :loading="trendLoading" />
      </ElCol>
      <ElCol :sm="24" :md="12" :lg="12">
        <TimePeriodSales :periodData="timePeriodList" :loading="periodLoading" />
      </ElCol>
    </ElRow>

    <!--月度销售与利润趋势 -->
    <ElRow :gutter="20">
      <ElCol :sm="24" :md="24" :lg="24">
        <MonthlySalesProfit :storeId="storeId" />
      </ElCol>
    </ElRow>

    <!--订单分析统计 + 订单状态分布 -->
    <ElRow :gutter="20">
      <ElCol :sm="24" :md="12" :lg="14">
        <OrderAnalysisStats
          :analysisData="orderAnalysis"
          :timeRangeType="timeRangeType"
          :loading="analysisLoading"
        />
      </ElCol>
      <ElCol :sm="24" :md="12" :lg="10">
        <OrderStatusDistribution
          :distributionData="statusDistributionList"
          :loading="statusLoading"
        />
      </ElCol>
    </ElRow>

    <!-- 取消原因分析 -->
    <ElRow :gutter="20">
      <ElCol :sm="24" :md="24" :lg="24">
        <CancelReasonAnalysis :reasonData="cancelReasonList" :loading="cancelLoading" />
      </ElCol>
    </ElRow>

    <!-- 分隔标题：菜品与分类分析 -->
    <ElRow :gutter="20">
      <ElCol :span="24">
        <ArtBasicBanner
          height="12rem"
          title="菜品与分类分析"
          subtitle="深入分析菜品销售数据，洞察分类贡献与趋势"
          :buttonConfig="{ show: false, text: '' }"
          :decoration="true"
          :image-config="{
            src: analyze_2BannerCover,
            width: '14rem',
            bottom: '-3.5rem',
            right: '3rem'
          }"
        />
      </ElCol>
    </ElRow>

    <!--菜品销售趋势 -->
    <ElRow :gutter="20">
      <ElCol :sm="24" :md="24" :lg="24">
        <DishSalesTrend
          :storeId="storeId"
          :dishList="topSellingList"
          :days="queryDays"
          :startDate="dateRange?.[0]"
          :endDate="dateRange?.[1]"
        />
      </ElCol>
    </ElRow>
    <!--分类贡献分析 + 分类详细对比 -->
    <ElRow :gutter="20">
      <ElCol :sm="24" :md="12" :lg="12">
        <CategoryContribution :categoryData="categoryAnalysisList" :loading="categoryLoading" />
      </ElCol>
      <ElCol :sm="24" :md="12" :lg="12">
        <CategoryDetailAnalysis :categoryData="categoryAnalysisList" :loading="categoryLoading" />
      </ElCol>
    </ElRow>

    <!-- 分类数据详情 -->
    <ElRow :gutter="20">
      <ElCol :sm="24" :md="24" :lg="24">
        <CategoryDataTable :categoryData="categoryAnalysisList" :loading="categoryLoading" />
      </ElCol>
    </ElRow>

    <!--热销菜品排行 -->
    <ElRow :gutter="20">
      <ElCol :sm="24" :md="24" :lg="24">
        <TopSellingDishes
          :dishData="topSellingList"
          :loading="topSellingLoading"
          :defaultTopN="topN"
          @topNChange="handleTopNChange"
        />
      </ElCol>
    </ElRow>

    <!--滞销菜品分析 -->
    <ElRow :gutter="20">
      <ElCol :sm="24" :md="24" :lg="24">
        <SlowMovingDishes
          :dishData="slowMovingList"
          :loading="slowMovingLoading"
          :defaultDays="queryDays"
        />
      </ElCol>
    </ElRow>

    <!--菜品销售额排行 + 菜品利润率排行 -->
    <ElRow :gutter="20">
      <ElCol :sm="24" :md="12" :lg="12">
        <DishSalesRanking :dishData="salesAmountRankingList" :loading="salesRankingLoading" />
      </ElCol>
      <ElCol :sm="24" :md="12" :lg="12">
        <DishProfitRanking :dishData="profitRateRankingList" :loading="profitRankingLoading" />
      </ElCol>
    </ElRow>

    <!-- 菜品利润矩阵 -->
    <ElRow :gutter="20">
      <ElCol :sm="24" :md="24" :lg="24">
        <DishProfitMatrix :matrixData="profitMatrixList" :loading="matrixLoading" />
      </ElCol>
    </ElRow>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, computed } from 'vue'
  import { ElMessage } from 'element-plus'
  import ArtBasicBanner from '@/components/core/banners/art-basic-banner/index.vue'
  import AnalysisHeaderBanner from './modules/analysis-header-banner.vue'
  import SalesOverviewBanner from './modules/sales-overview-banner.vue'
  import SalesTrend from './modules/sales-trend.vue'
  import MonthlySalesProfit from './modules/monthly-sales-profit.vue'
  import TimePeriodSales from './modules/time-period-sales.vue'
  import OrderAnalysisStats from './modules/order-analysis-stats.vue'
  import analyze_2BannerCover from '@imgs/system/analyze_2.png'
  import OrderStatusDistribution from './modules/order-status-distribution.vue'
  import CancelReasonAnalysis from './modules/cancel-reason-analysis.vue'
  import TopSellingDishes from './modules/top-selling-dishes.vue'
  import CategoryContribution from './modules/category-contribution.vue'
  import CategoryDetailAnalysis from './modules/category-detail-analysis.vue'
  import CategoryDataTable from './modules/category-data-table.vue'
  import DishSalesRanking from './modules/dish-sales-ranking.vue'
  import DishProfitRanking from './modules/dish-profit-ranking.vue'
  import DishProfitMatrix from './modules/dish-profit-matrix.vue'
  import SlowMovingDishes from './modules/slow-moving-dishes.vue'
  import DishSalesTrend from './modules/dish-sales-trend.vue'
  import {
    fetchSalesOverview,
    fetchSalesTrend,
    fetchTimePeriodSales,
    fetchOrderAnalysis,
    fetchOrderStatusDistribution,
    fetchCancelReasonAnalysis,
    fetchTopSellingDishes,
    fetchDishSalesAmountRanking,
    fetchCategoryAnalysis,
    fetchDishProfitRateRanking,
    fetchDishProfitMatrix,
    fetchSlowMovingDishes
  } from '@/api/restaurant-analysis'
  import analyzeBannerCover from '@imgs/system/analyze.png'

  defineOptions({ name: 'RestaurantAnalysis' })

  // ========== 状态管理 ==========
  const timeRangeType = ref<string>('WEEK') // 默认本周（7天）
  const storeId = ref<number>(0) // 门店ID，初始为0，由页头组件加载后设置
  const dateRange = ref<[string, string] | null>(null) // 日期范围

  const topN = ref<number>(10) // 热销菜品Top N，默认10

  /**
   * 根据时间范围类型自动计算统一的查询天数
   * 这个天数将应用于所有需要天数参数的接口
   */
  const queryDays = computed(() => {
    const daysMap: Record<string, number> = {
      TODAY: 1, // 今日：查询近1天数据
      WEEK: 7, // 本周：查询近7天数据
      MONTH: 30, // 本月：查询近30天数据
      YEAR: 365 // 本年：查询近365天数据
    }
    return daysMap[timeRangeType.value] || 7
  })

  /**
   * 获取查询参数：日期范围或天数
   */
  const getQueryParams = () => {
    if (dateRange.value && dateRange.value.length === 2) {
      return {
        startDate: dateRange.value[0],
        endDate: dateRange.value[1]
      }
    }
    return {
      days: queryDays.value
    }
  }

  /**
   * 判断是否为今日数据且可能无数据
   */
  const isTodayWithPossibleNoData = computed(() => {
    return timeRangeType.value === 'TODAY'
  })

  // 各数据模块的加载状态
  const overviewLoading = ref(false)
  const trendLoading = ref(false)
  const periodLoading = ref(false)
  const analysisLoading = ref(false)
  const statusLoading = ref(false)
  const cancelLoading = ref(false)
  const topSellingLoading = ref(false)
  const categoryLoading = ref(false)
  const salesRankingLoading = ref(false)
  const profitRankingLoading = ref(false)
  const matrixLoading = ref(false)
  const slowMovingLoading = ref(false)

  // 各数据模块的数据
  const salesOverview = ref<Api.RestaurantAnalysis.SalesOverviewVO | null>(null)
  const salesTrendList = ref<Api.RestaurantAnalysis.DailySalesTrendVO[]>([])
  const timePeriodList = ref<Api.RestaurantAnalysis.TimePeriodSalesVO[]>([])
  const orderAnalysis = ref<Api.RestaurantAnalysis.OrderAnalysisVO | null>(null)
  const statusDistributionList = ref<Api.RestaurantAnalysis.OrderStatusDistributionVO[]>([])
  const cancelReasonList = ref<Api.RestaurantAnalysis.CancelReasonAnalysisVO[]>([])
  const topSellingList = ref<Api.RestaurantAnalysis.DishSalesRankingVO[]>([])
  const categoryAnalysisList = ref<Api.RestaurantAnalysis.CategoryAnalysisVO[]>([])
  const salesAmountRankingList = ref<Api.RestaurantAnalysis.DishSalesRankingVO[]>([])
  const profitRateRankingList = ref<Api.RestaurantAnalysis.DishSalesRankingVO[]>([])
  const profitMatrixList = ref<Api.RestaurantAnalysis.DishProfitMatrixVO[]>([])
  const slowMovingList = ref<Api.RestaurantAnalysis.SlowMovingDishVO[]>([])

  // ========== 数据加载方法 ==========

  /** 加载销售概览 */
  const loadSalesOverview = async () => {
    try {
      overviewLoading.value = true
      const params = getQueryParams()
      const data = await fetchSalesOverview(
        storeId.value,
        params.days,
        params.startDate,
        params.endDate
      )
      salesOverview.value = data

      // 检查今日数据是否为空
      if (isTodayWithPossibleNoData.value && (!data || data.currentSales === 0)) {
        ElMessage.info('今日还没有出单，加油！💪')
      }
    } catch (error: any) {
      console.error('加载销售概览失败:', error)
      ElMessage.error(error.message || '加载销售概览失败')
    } finally {
      overviewLoading.value = false
    }
  }

  /** 加载销售趋势 */
  const loadSalesTrend = async () => {
    try {
      trendLoading.value = true
      const params = getQueryParams()
      const data = await fetchSalesTrend(
        storeId.value,
        params.days,
        params.startDate,
        params.endDate
      )
      salesTrendList.value = data || []
    } catch (error: any) {
      console.error('加载销售趋势失败:', error)
      salesTrendList.value = []
    } finally {
      trendLoading.value = false
    }
  }

  /** 加载时段销售分布 */
  const loadTimePeriodSales = async () => {
    try {
      periodLoading.value = true
      const params = getQueryParams()
      const data = await fetchTimePeriodSales(
        storeId.value,
        params.days,
        params.startDate,
        params.endDate
      )
      timePeriodList.value = data || []
    } catch (error: any) {
      console.error('加载时段销售分布失败:', error)
      timePeriodList.value = []
    } finally {
      periodLoading.value = false
    }
  }

  /** 加载订单分析 */
  const loadOrderAnalysis = async () => {
    try {
      analysisLoading.value = true
      const params = getQueryParams()
      const data = await fetchOrderAnalysis(
        storeId.value,
        params.days,
        params.startDate,
        params.endDate
      )
      orderAnalysis.value = data
    } catch (error: any) {
      console.error('加载订单分析失败:', error)
      orderAnalysis.value = null
    } finally {
      analysisLoading.value = false
    }
  }

  /** 加载订单状态分布 */
  const loadOrderStatusDistribution = async () => {
    try {
      statusLoading.value = true
      const params = getQueryParams()
      const data = await fetchOrderStatusDistribution(
        storeId.value,
        params.days,
        params.startDate,
        params.endDate
      )
      statusDistributionList.value = data || []
    } catch (error: any) {
      console.error('加载订单状态分布失败:', error)
      statusDistributionList.value = []
    } finally {
      statusLoading.value = false
    }
  }

  /** 加载取消原因分析 */
  const loadCancelReasonAnalysis = async () => {
    try {
      cancelLoading.value = true
      const params = getQueryParams()
      const data = await fetchCancelReasonAnalysis(
        storeId.value,
        params.days,
        params.startDate,
        params.endDate
      )
      cancelReasonList.value = data || []
    } catch (error: any) {
      console.error('加载取消原因分析失败:', error)
      cancelReasonList.value = []
    } finally {
      cancelLoading.value = false
    }
  }

  /** 加载热销菜品排行 */
  const loadTopSellingDishes = async () => {
    try {
      topSellingLoading.value = true
      const params = getQueryParams()
      const data = await fetchTopSellingDishes(
        storeId.value,
        params.days,
        topN.value,
        params.startDate,
        params.endDate
      )
      topSellingList.value = data || []
    } catch (error: any) {
      console.error('加载热销菜品排行失败:', error)
      topSellingList.value = []
    } finally {
      topSellingLoading.value = false
    }
  }

  /** 加载菜品分类贡献分析 */
  const loadCategoryAnalysis = async () => {
    try {
      categoryLoading.value = true
      const params = getQueryParams()
      const data = await fetchCategoryAnalysis(
        storeId.value,
        params.days,
        params.startDate,
        params.endDate
      )
      categoryAnalysisList.value = data || []
    } catch (error: any) {
      console.error('加载分类贡献分析失败:', error)
      categoryAnalysisList.value = []
    } finally {
      categoryLoading.value = false
    }
  }

  /** 加载菜品销售额排行 */
  const loadDishSalesAmountRanking = async () => {
    try {
      salesRankingLoading.value = true
      const params = getQueryParams()
      const data = await fetchDishSalesAmountRanking(
        storeId.value,
        params.days,
        10,
        params.startDate,
        params.endDate
      )
      salesAmountRankingList.value = data || []
    } catch (error: any) {
      console.error('加载菜品销售额排行失败:', error)
      salesAmountRankingList.value = []
    } finally {
      salesRankingLoading.value = false
    }
  }

  /** 加载菜品利润率排行 */
  const loadDishProfitRateRanking = async () => {
    try {
      profitRankingLoading.value = true
      const params = getQueryParams()
      const data = await fetchDishProfitRateRanking(
        storeId.value,
        params.days,
        10,
        params.startDate,
        params.endDate
      )
      profitRateRankingList.value = data || []
    } catch (error: any) {
      console.error('加载菜品利润率排行失败:', error)
      profitRateRankingList.value = []
    } finally {
      profitRankingLoading.value = false
    }
  }

  /** 加载菜品利润矩阵 */
  const loadDishProfitMatrix = async () => {
    try {
      matrixLoading.value = true
      const params = getQueryParams()
      const data = await fetchDishProfitMatrix(
        storeId.value,
        params.days,
        params.startDate,
        params.endDate
      )
      profitMatrixList.value = data || []
    } catch (error: any) {
      console.error('加载菜品利润矩阵失败:', error)
      profitMatrixList.value = []
    } finally {
      matrixLoading.value = false
    }
  }

  /** 加载滞销菜品分析 */
  const loadSlowMovingDishes = async () => {
    try {
      slowMovingLoading.value = true
      const params = getQueryParams()
      const data = await fetchSlowMovingDishes(
        storeId.value,
        params.days,
        params.startDate,
        params.endDate
      )
      slowMovingList.value = data || []
    } catch (error: any) {
      console.error('加载滞销菜品分析失败:', error)
      slowMovingList.value = []
    } finally {
      slowMovingLoading.value = false
    }
  }

  /** 加载所有数据 */
  const loadAllData = async () => {
    await Promise.all([
      loadSalesOverview(),
      loadSalesTrend(),
      loadTimePeriodSales(),
      loadOrderAnalysis(),
      loadOrderStatusDistribution(),
      loadCancelReasonAnalysis(),
      loadTopSellingDishes(),
      loadCategoryAnalysis(),
      loadDishSalesAmountRanking(),
      loadDishProfitRateRanking(),
      loadDishProfitMatrix(),
      loadSlowMovingDishes()
    ])
  }

  // ========== 事件处理 ==========

  /** 处理门店变化 */
  const handleStoreChange = (newStoreId: number) => {
    storeId.value = newStoreId
    // 重新加载所有数据
    loadAllData()
  }

  /** 处理时间范围变化 */
  const handleTimeRangeChange = (newTimeRange: string) => {
    timeRangeType.value = newTimeRange
    dateRange.value = null // 清空日期范围
    // queryDays会自动根据timeRangeType计算
    // 重新加载所有数据，所有接口都会使用新的queryDays值
    loadAllData()
  }

  /** 处理日期范围变化 */
  const handleDateRangeChange = (newDateRange: [string, string] | null) => {
    dateRange.value = newDateRange
    if (newDateRange) {
      // 重新加载所有数据
      loadAllData()
    }
  }

  /** 处理热销菜品Top N变化 */
  const handleTopNChange = (newTopN: number) => {
    topN.value = newTopN
    loadTopSellingDishes()
  }

  // ========== 生命周期 ==========
  onMounted(() => {
    // 页面加载时，等待页头组件设置storeId后再加载数据
    // 数据加载由handleStoreChange触发
  })
</script>

<style scoped lang="scss">
  .restaurant-analysis {
    padding: 0;
  }
</style>
