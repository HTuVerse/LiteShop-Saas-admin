import request from '@/utils/http'
import type { Id } from '@/types/backend'

// ============ 优惠券管理 API ============

/**
 * 分页查询优惠券列表
 * @param params 查询参数
 * @returns 分页优惠券列表
 */
export function fetchGetCouponList(params: Api.Coupon.CouponSearchParams = {}) {
  return request.get<Api.Common.PageResult<Api.Coupon.CouponListItem>>({
    url: '/coupon/list',
    params: {
      currentPage: params.currentPage || 1,
      pageSize: params.pageSize || 10,
      name: params.name,
      status: params.status
    }
  })
}

/**
 * 获取优惠券详情
 * @param id 优惠券ID
 * @returns 优惠券详情
 */
export function fetchGetCouponDetail(id: Id) {
  return request.get<Api.Coupon.CouponListItem>({
    url: '/coupon/detail',
    params: { id }
  })
}

/** 按名称分页搜索可关联菜品。 */
export function fetchCouponDishOptions(dishName: string) {
  return request.get<Api.Common.PageResult<Api.Dish.DishListItem>>({
    url: '/dish/pageList',
    params: { currentPage: 1, pageSize: 20, dishName }
  })
}

/** 编辑券时回显已关联菜品名称。 */
export function fetchCouponDishDetail(id: string) {
  return request.get<Api.Dish.DishListItem>({ url: `/dish/detail/${id}` })
}

/**
 * 创建优惠券
 * @param data 优惠券数据
 * @returns 创建的优惠券
 */
export function fetchAddCoupon(data: Api.Coupon.CouponFormData) {
  return request.post<Api.Coupon.CouponListItem>({
    url: '/coupon',
    data
  })
}

/**
 * 更新优惠券
 * @param data 优惠券数据
 * @returns 更新的优惠券
 */
export function fetchUpdateCoupon(data: Api.Coupon.CouponFormData) {
  return request.put<Api.Coupon.CouponListItem>({
    url: '/coupon',
    data
  })
}

/**
 * 删除优惠券
 * @param id 优惠券ID
 * @returns 操作结果
 */
export function fetchDeleteCoupon(id: Id) {
  return request.del<void>({
    url: '/coupon/delete',
    data: null,
    params: { id }
  })
}

/**
 * 切换优惠券上下架状态
 * 如果当前是上架状态则下架，如果当前是下架状态则上架
 * @param id 优惠券ID
 * @returns 操作结果
 */
export function fetchToggleCouponStatus(id: Id) {
  return request.put<void>({
    url: '/coupon/toggle-status',
    data: null,
    params: { id }
  })
}

/** 增减剩余可发库存，后端同步调整总量并记录原因。 */
export function fetchAdjustCouponStock(data: { couponId: Id; delta: number; reason: string }) {
  return request.put<Api.Coupon.CouponListItem>({ url: '/coupon/stock', data })
}

/** 读取库存调整记录。 */
export function fetchCouponStockAdjustments(couponId: Id, currentPage = 1, pageSize = 10) {
  return request.get<Api.Common.PageResult<{
    id: string
    delta: number
    beforeCount: number
    afterCount: number
    operatorId: string
    reason: string
    createTime: string
  }>>({ url: '/coupon/stock/adjustments', params: { couponId, currentPage, pageSize } })
}

// ============ 用户优惠券 API ============

/**
 * 发送优惠券给用户
 * @param params 发送参数
 * @returns 操作结果
 */
export function fetchSendCouponToUser(params: Api.Coupon.SendCouponParams) {
  return request.post<void>({
    url: '/user-coupon/send',
    data: null,
    params: {
      userId: params.userId,
      couponId: params.couponId,
      startTime: params.startTime,
      expiredTime: params.expiredTime
    }
  })
}

/**
 * 获取用户优惠券列表
 * @param params 查询参数
 * @returns 分页用户优惠券列表
 */
export function fetchGetUserCouponList(params: Api.Coupon.UserCouponSearchParams = {}) {
  return request.get<Api.Common.PageResult<Api.Coupon.UserCouponVO>>({
    url: '/user-coupon/list',
    params: {
      currentPage: params.currentPage || 1,
      pageSize: params.pageSize || 10,
      searchKey: params.searchKey || '最近领取',
      status: params.status
    }
  })
}

// ============ 核销记录 API ============

/**
 * 核销预览
 * @param couponCode 优惠券码
 * @returns 核销预览结果
 */
export function fetchVerifyPreview(couponCode: string) {
  return request.get<Api.Coupon.VerifyResultVO>({
    url: '/verify-record/preview',
    params: { couponCode }
  })
}

/**
 * 核销优惠券
 * @param couponCode 优惠券码
 * @returns 核销结果
 */
export function fetchVerifyCoupon(couponCode: string) {
  return request.post<Api.Coupon.VerifyResultVO>({
    url: '/verify-record/verify',
    data: null,
    params: { couponCode }
  })
}

/**
 * 分页查询核销记录
 * @param params 查询参数
 * @returns 分页核销记录列表
 */
export function fetchGetVerifyRecordList(params: Api.Coupon.VerifyRecordSearchParams = {}) {
  return request.get<Api.Common.PageResult<Api.Coupon.VerifyRecord>>({
    url: '/verify-record/list',
    params: {
      currentPage: params.currentPage || 1,
      pageSize: params.pageSize || 10,
      merchantId: params.merchantId,
      status: params.status
    }
  })
}

/**
 * 获取核销记录详情
 * @param id 核销记录ID
 * @returns 核销记录详情
 */
export function fetchGetVerifyRecordDetail(id: Id) {
  return request.get<Api.Coupon.VerifyRecord>({
    url: '/verify-record/detail',
    params: { id }
  })
}

/**
 * 查询当前管理员的核销记录
 * @param params 查询参数
 * @returns 分页核销记录列表
 */
export function fetchGetMyVerifyRecords(params: { currentPage?: number; pageSize?: number } = {}) {
  return request.get<Api.Common.PageResult<Api.Coupon.VerifyRecord>>({
    url: '/verify-record/my-records',
    params: {
      currentPage: params.currentPage || 1,
      pageSize: params.pageSize || 10
    }
  })
}
