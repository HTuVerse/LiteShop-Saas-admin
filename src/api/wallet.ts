import request from '@/utils/http'

export interface WalletPlan {
  id: string
  amount: number
  bonus: number
  badge?: string
  sort: number
  status: number
}
export type WalletPlanForm = Omit<WalletPlan, 'id'>
export interface WalletOrder {
  id: string
  userId: string
  planId: string
  amount: number
  bonus: number
  status: 'UNPAID' | 'PAID' | 'SUCCESS' | 'CLOSED'
  createdAt: string
  paidAt?: string
}
export interface WalletPage<T> {
  records: T[]
  total: number
  current: number
  size: number
}

export const fetchWalletPlans = (params: { currentPage: number; pageSize: number }) =>
  request.get<WalletPage<WalletPlan>>({ url: '/wallet/admin/plans', params })
export const fetchWalletOrders = (params: { currentPage: number; pageSize: number }) =>
  request.get<WalletPage<WalletOrder>>({ url: '/wallet/admin/orders', params })
export const createWalletPlan = (data: WalletPlanForm) =>
  request.post<WalletPlan>({ url: '/wallet/admin/plans', data })
export const updateWalletPlan = (id: string, data: WalletPlanForm) =>
  request.put<WalletPlan>({ url: `/wallet/admin/plans/${id}`, data })
export const deleteWalletPlan = (id: string) =>
  request.del<void>({ url: `/wallet/admin/plans/${id}`, data: null })
