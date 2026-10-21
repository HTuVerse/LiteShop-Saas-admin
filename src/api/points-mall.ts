import request from '@/utils/http'

/** 租户积分兑换商品与兑换订单。 */
export interface PointsMallProduct {
  id: string
  name: string
  description?: string
  imageUrl?: string
  couponId: string
  pointsPrice: number
  stock: number
  status: number
  sort: number
  createdAt?: string
}

export type PointsMallProductForm = Omit<PointsMallProduct, 'id' | 'createdAt'>

export interface PointsMallOrder {
  id: string
  userId: string
  productName: string
  couponId: string
  pointsCost: number
  status: string
  userCouponId?: string
  failureReason?: string
  createdAt: string
}

export interface MallPage<T> {
  records: T[]
  total: number
  current: number
  size: number
}

export function fetchMallProducts(params: {
  currentPage: number
  pageSize: number
  name?: string
}) {
  return request.get<MallPage<PointsMallProduct>>({ url: '/points-mall/admin/products', params })
}

export function fetchMallOrders(params: { currentPage: number; pageSize: number }) {
  return request.get<MallPage<PointsMallOrder>>({ url: '/points-mall/admin/orders', params })
}

export function createMallProduct(data: PointsMallProductForm) {
  return request.post<PointsMallProduct>({ url: '/points-mall/admin/products', data })
}

export function updateMallProduct(id: string, data: PointsMallProductForm) {
  return request.put<PointsMallProduct>({ url: `/points-mall/admin/products/${id}`, data })
}

export function deleteMallProduct(id: string) {
  return request.del<void>({ url: `/points-mall/admin/products/${id}`, data: null })
}
