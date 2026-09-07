import request from '@/utils/http'

// ============ 餐饮分析统计 API ============

/**
 * 获取销售概览
 * @param storeId 门店ID
 * @param days 统计天数（可选，当提供startDate和endDate时忽略）
 * @param startDate 开始日期（可选，格式：yyyy-MM-dd）
 * @param endDate 结束日期（可选，格式：yyyy-MM-dd）
 * @returns 销售概览数据
 */
export function fetchSalesOverview(
  storeId: number,
  days?: number,
  startDate?: string,
  endDate?: string
) {
  const params: any = { storeId }
  if (startDate && endDate) {
    params.startDate = startDate
    params.endDate = endDate
  } else if (days) {
    params.days = days
  }
  return request.get<Api.RestaurantAnalysis.SalesOverviewVO>({
    url: '/restaurant-analysis/sales/overview',
    params
  })
}

/**
 * 获取销售趋势图数据
 * @param storeId 门店ID
 * @param days 统计天数（可选，当提供startDate和endDate时忽略）
 * @param startDate 开始日期（可选，格式：yyyy-MM-dd）
 * @param endDate 结束日期（可选，格式：yyyy-MM-dd）
 * @returns 每日销售趋势列表
 */
export function fetchSalesTrend(
  storeId: number,
  days?: number,
  startDate?: string,
  endDate?: string
) {
  const params: any = { storeId }
  if (startDate && endDate) {
    params.startDate = startDate
    params.endDate = endDate
  } else if (days) {
    params.days = days
  }
  return request.get<Api.RestaurantAnalysis.DailySalesTrendVO[]>({
    url: '/restaurant-analysis/sales/trend',
    params
  })
}

/**
 * 获取时段销售分布
 * @param storeId 门店ID
 * @param days 统计天数（可选，当提供startDate和endDate时忽略）
 * @param startDate 开始日期（可选，格式：yyyy-MM-dd）
 * @param endDate 结束日期（可选，格式：yyyy-MM-dd）
 * @returns 时段销售分布列表
 */
export function fetchTimePeriodSales(
  storeId: number,
  days?: number,
  startDate?: string,
  endDate?: string
) {
  const params: any = { storeId }
  if (startDate && endDate) {
    params.startDate = startDate
    params.endDate = endDate
  } else if (days) {
    params.days = days
  }
  return request.get<Api.RestaurantAnalysis.TimePeriodSalesVO[]>({
    url: '/restaurant-analysis/sales/time-period',
    params
  })
}

/**
 * 获取订单分析数据
 * @param storeId 门店ID
 * @param days 统计天数（可选，当提供startDate和endDate时忽略）
 * @param startDate 开始日期（可选，格式：yyyy-MM-dd）
 * @param endDate 结束日期（可选，格式：yyyy-MM-dd）
 * @returns 订单分析数据
 */
export function fetchOrderAnalysis(
  storeId: number,
  days?: number,
  startDate?: string,
  endDate?: string
) {
  const params: any = { storeId }
  if (startDate && endDate) {
    params.startDate = startDate
    params.endDate = endDate
  } else if (days) {
    params.days = days
  }
  return request.get<Api.RestaurantAnalysis.OrderAnalysisVO>({
    url: '/restaurant-analysis/order/analysis',
    params
  })
}

/**
 * 获取订单状态分布
 * @param storeId 门店ID
 * @param days 统计天数（可选，当提供startDate和endDate时忽略）
 * @param startDate 开始日期（可选，格式：yyyy-MM-dd）
 * @param endDate 结束日期（可选，格式：yyyy-MM-dd）
 * @returns 订单状态分布列表
 */
export function fetchOrderStatusDistribution(
  storeId: number,
  days?: number,
  startDate?: string,
  endDate?: string
) {
  const params: any = { storeId }
  if (startDate && endDate) {
    params.startDate = startDate
    params.endDate = endDate
  } else if (days) {
    params.days = days
  }
  return request.get<Api.RestaurantAnalysis.OrderStatusDistributionVO[]>({
    url: '/restaurant-analysis/order/status-distribution',
    params
  })
}

/**
 * 获取订单取消原因分析
 * @param storeId 门店ID
 * @param days 统计天数（可选，当提供startDate和endDate时忽略）
 * @param startDate 开始日期（可选，格式：yyyy-MM-dd）
 * @param endDate 结束日期（可选，格式：yyyy-MM-dd）
 * @returns 取消原因分析列表
 */
export function fetchCancelReasonAnalysis(
  storeId: number,
  days?: number,
  startDate?: string,
  endDate?: string
) {
  const params: any = { storeId }
  if (startDate && endDate) {
    params.startDate = startDate
    params.endDate = endDate
  } else if (days) {
    params.days = days
  }
  return request.get<Api.RestaurantAnalysis.CancelReasonAnalysisVO[]>({
    url: '/restaurant-analysis/order/cancel-reason',
    params
  })
}

// ============ 菜品与分类分析 API ============

/**
 * 获取热销菜品TOP10
 * @param storeId 门店ID
 * @param days 统计天数（可选，当提供startDate和endDate时忽略）
 * @param topN 获取前N名，默认10
 * @param startDate 开始日期（可选，格式：yyyy-MM-dd）
 * @param endDate 结束日期（可选，格式：yyyy-MM-dd）
 * @returns 热销菜品排行列表
 */
export function fetchTopSellingDishes(
  storeId: number,
  days?: number,
  topN: number = 10,
  startDate?: string,
  endDate?: string
) {
  const params: any = { storeId, topN }
  if (startDate && endDate) {
    params.startDate = startDate
    params.endDate = endDate
  } else if (days) {
    params.days = days
  }
  return request.get<Api.RestaurantAnalysis.DishSalesRankingVO[]>({
    url: '/restaurant-analysis/dish/top-selling',
    params
  })
}

/**
 * 获取菜品销售额排行
 * @param storeId 门店ID
 * @param days 统计天数（可选，当提供startDate和endDate时忽略）
 * @param topN 获取前N名，默认10
 * @param startDate 开始日期（可选，格式：yyyy-MM-dd）
 * @param endDate 结束日期（可选，格式：yyyy-MM-dd）
 * @returns 菜品销售额排行列表
 */
export function fetchDishSalesAmountRanking(
  storeId: number,
  days?: number,
  topN: number = 10,
  startDate?: string,
  endDate?: string
) {
  const params: any = { storeId, topN }
  if (startDate && endDate) {
    params.startDate = startDate
    params.endDate = endDate
  } else if (days) {
    params.days = days
  }
  return request.get<Api.RestaurantAnalysis.DishSalesRankingVO[]>({
    url: '/restaurant-analysis/dish/sales-amount-ranking',
    params
  })
}

/**
 * 获取某个菜品的销售趋势
 * @param storeId 门店ID
 * @param dishId 菜品ID
 * @param days 统计天数（可选，当提供startDate和endDate时忽略）
 * @param startDate 开始日期（可选，格式：yyyy-MM-dd）
 * @param endDate 结束日期（可选，格式：yyyy-MM-dd）
 * @returns 菜品销售趋势列表
 */
export function fetchDishSalesTrend(
  storeId: number,
  dishId: number,
  days?: number,
  startDate?: string,
  endDate?: string
) {
  const params: any = { storeId, dishId }
  if (startDate && endDate) {
    params.startDate = startDate
    params.endDate = endDate
  } else if (days) {
    params.days = days
  }
  return request.get<Api.RestaurantAnalysis.DishSalesTrendVO[]>({
    url: '/restaurant-analysis/dish/sales-trend',
    params
  })
}

/**
 * 获取滞销菜品分析
 * @param storeId 门店ID
 * @param days 统计天数（可选，当提供startDate和endDate时忽略）
 * @param startDate 开始日期（可选，格式：yyyy-MM-dd）
 * @param endDate 结束日期（可选，格式：yyyy-MM-dd）
 * @returns 滞销菜品列表
 */
export function fetchSlowMovingDishes(
  storeId: number,
  days?: number,
  startDate?: string,
  endDate?: string
) {
  const params: any = { storeId }
  if (startDate && endDate) {
    params.startDate = startDate
    params.endDate = endDate
  } else if (days) {
    params.days = days
  }
  return request.get<Api.RestaurantAnalysis.SlowMovingDishVO[]>({
    url: '/restaurant-analysis/dish/slow-moving',
    params
  })
}

/**
 * 获取菜品分类贡献分析
 * @param storeId 门店ID
 * @param days 统计天数（可选，当提供startDate和endDate时忽略）
 * @param startDate 开始日期（可选，格式：yyyy-MM-dd）
 * @param endDate 结束日期（可选，格式：yyyy-MM-dd）
 * @returns 分类分析列表
 */
export function fetchCategoryAnalysis(
  storeId: number,
  days?: number,
  startDate?: string,
  endDate?: string
) {
  const params: any = { storeId }
  if (startDate && endDate) {
    params.startDate = startDate
    params.endDate = endDate
  } else if (days) {
    params.days = days
  }
  return request.get<Api.RestaurantAnalysis.CategoryAnalysisVO[]>({
    url: '/restaurant-analysis/category/contribution',
    params
  })
}

/**
 * 获取菜品利润率排行
 * @param storeId 门店ID
 * @param days 统计天数（可选，当提供startDate和endDate时忽略）
 * @param topN 获取前N名，默认10
 * @param startDate 开始日期（可选，格式：yyyy-MM-dd）
 * @param endDate 结束日期（可选，格式：yyyy-MM-dd）
 * @returns 菜品利润率排行列表
 */
export function fetchDishProfitRateRanking(
  storeId: number,
  days?: number,
  topN: number = 10,
  startDate?: string,
  endDate?: string
) {
  const params: any = { storeId, topN }
  if (startDate && endDate) {
    params.startDate = startDate
    params.endDate = endDate
  } else if (days) {
    params.days = days
  }
  return request.get<Api.RestaurantAnalysis.DishSalesRankingVO[]>({
    url: '/restaurant-analysis/dish/profit-rate-ranking',
    params
  })
}

/**
 * 获取菜品利润矩阵分析
 * @param storeId 门店ID
 * @param days 统计天数（可选，当提供startDate和endDate时忽略）
 * @param startDate 开始日期（可选，格式：yyyy-MM-dd）
 * @param endDate 结束日期（可选，格式：yyyy-MM-dd）
 * @returns 菜品利润矩阵列表
 */
export function fetchDishProfitMatrix(
  storeId: number,
  days?: number,
  startDate?: string,
  endDate?: string
) {
  const params: any = { storeId }
  if (startDate && endDate) {
    params.startDate = startDate
    params.endDate = endDate
  } else if (days) {
    params.days = days
  }
  return request.get<Api.RestaurantAnalysis.DishProfitMatrixVO[]>({
    url: '/restaurant-analysis/dish/profit-matrix',
    params
  })
}

// ============ 类型定义 ============

/** 时间范围类型枚举 */
export enum TimeRangeType {
  TODAY = 'TODAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  YEAR = 'YEAR'
}

/** 时间范围选项 */
export const TIME_RANGE_OPTIONS = [
  { label: '今日', value: TimeRangeType.TODAY },
  { label: '本周', value: TimeRangeType.WEEK },
  { label: '本月', value: TimeRangeType.MONTH },
  { label: '本年', value: TimeRangeType.YEAR }
] as const

/**
 * 获取年度月度销售额和利润数据
 * @param storeId 门店ID
 * @param year 年份（例如：2025）
 * @returns 每月销售额和利润列表
 */
export function fetchMonthlySalesProfit(storeId: number, year: number) {
  return request.get<Api.RestaurantAnalysis.MonthlySalesProfitVO[]>({
    url: '/restaurant-analysis/sales/monthly-profit',
    params: { storeId, year }
  })
}
