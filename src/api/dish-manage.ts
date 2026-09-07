import request from '@/utils/http'
import type { Id } from '@/types/backend'

// ============ 餐桌管理 API ============

/**
 * 获取餐桌分页列表
 * @param params 查询参数
 * @returns 分页数据
 */
export function fetchGetTableList(params: any) {
  return request.get<Api.Table.TableListData>({
    url: '/table-info/pageList',
    params
  })
}

/**
 * 获取餐桌详情
 * @param id 餐桌ID
 * @returns 餐桌详情
 */
export function fetchGetTableDetail(id: number) {
  return request.get<Api.Table.TableListItem>({
    url: '/table-info/getDetail',
    params: { id }
  })
}

/**
 * 添加餐桌
 * @param data 餐桌信息
 * @returns 操作结果
 */
export function fetchAddTable(data: Api.Table.TableFormData) {
  return request.post<boolean>({
    url: '/table-info/add',
    data
  })
}

/**
 * 更新餐桌信息
 * @param data 餐桌信息
 * @returns 操作结果
 */
export function fetchUpdateTable(data: Api.Table.TableFormData) {
  return request.put<boolean>({
    url: '/table-info/update',
    data
  })
}

/**
 * 删除餐桌
 * @param id 餐桌ID
 * @returns 操作结果
 */
export function fetchDeleteTable(id: number) {
  return request.del<boolean>({
    url: `/table-info/delete/${id}`
  })
}

/**
 * 批量删除餐桌
 * @param ids 餐桌ID列表
 * @returns 操作结果
 */
export function fetchBatchDeleteTable(ids: number[]) {
  return request.del<boolean>({
    url: '/table-info/batchDelete',
    data: ids
  })
}

/**
 * 更新餐桌状态
 * @param id 餐桌ID
 * @param status 状态：0-空闲，1-使用中，2-预留，3-停用
 * @returns 操作结果
 */
export function fetchUpdateTableStatus(id: number, status: number) {
  return request.put<boolean>({
    url: '/table-info/updateStatus',
    params: { id, status }
  })
}

// ============ 门店管理 API ============

/**
 * 获取门店列表(不分页,用于下拉选择)
 * @returns 门店列表
 */
export async function fetchGetStoreList(): Promise<Api.Store.StoreListData> {
  const records: Api.Store.StoreListItem[] = []
  let currentPage = 1
  let total = 0
  do {
    const page = await request.get<Api.Store.StoreListData>({
      url: '/store-info/pageList',
      params: { currentPage, pageSize: 100 }
    })
    records.push(...page.records)
    total = page.total
    if (!page.records.length) break
    currentPage++
  } while (records.length < total)
  return { records, total, current: 1, size: records.length }
}

/**
 * 获取门店分页列表
 * @param params 查询参数
 * @returns 分页数据
 */
export function fetchGetStorePageList(params: any) {
  return request.get<Api.Store.StoreListData>({
    url: '/store-info/pageList',
    params
  })
}

/**
 * 获取门店详情
 * @param id 门店ID
 * @returns 门店详情
 */
export function fetchGetStoreDetail(id: number) {
  return request.get<Api.Store.StoreListItem>({
    url: '/store-info/getStoreDetail',
    params: { id }
  })
}

/**
 * 添加门店
 * @param data 门店信息
 * @returns 操作结果
 */
export function fetchAddStore(data: Api.Store.StoreFormData) {
  return request.post<boolean>({
    url: '/store-info/add',
    data
  })
}

/**
 * 更新门店信息
 * @param data 门店信息
 * @returns 操作结果
 */
export function fetchUpdateStore(data: Api.Store.StoreFormData) {
  return request.put<boolean>({
    url: '/store-info/update',
    data
  })
}

/**
 * 删除门店
 * @param id 门店ID
 * @returns 操作结果
 */
export function fetchDeleteStore(id: number) {
  return request.del<boolean>({
    url: '/store-info/delete',
    params: { id }
  })
}

/**
 * 批量删除门店
 * @param ids 门店ID列表
 * @returns 操作结果
 */
export function fetchBatchDeleteStore(ids: number[]) {
  return request.del<boolean>({
    url: '/store-info/deleteBatch',
    data: ids
  })
}

/**
 * 更新门店状态
 * @param id 门店ID
 * @param status 状态：0-停业，1-营业
 * @returns 操作结果
 */
export function fetchUpdateStoreStatus(id: number, status: number) {
  return request.put<boolean>({
    url: '/store-info/updateStatus',
    data: null,
    params: { id, status }
  })
}

// ============ 订单管理 API ============

/**
 * 获取订单分页列表(管理员)
 * @param params 查询参数
 * @returns 分页数据
 */
export function fetchGetOrderPageList(params: any) {
  return request.get<Api.Order.OrderListData>({
    url: '/restaurant-order/pageList',
    params
  })
}

/**
 * 获取订单详情
 * @param orderId 订单ID
 * @returns 订单详情
 */
export function fetchGetOrderDetail(orderId: number) {
  return request.get<Api.Order.OrderDetailVO>({
    url: '/restaurant-order/getOrderDetail',
    params: { orderId }
  })
}

/**
 * 更新订单状态
 * @param orderId 订单ID
 * @param status 订单状态：1-已下单，2-已接单，3-制作中，4-制作完成，5-已完成，6-已取消
 * @returns 操作结果
 */
export function fetchUpdateOrderStatus(orderId: number, status: number) {
  return request.put<boolean>({
    url: '/restaurant-order/updateStatus',
    data: null,
    params: { orderId: orderId, status: status }
  })
}

/**
 * 取消订单
 * @param orderId 订单ID
 * @param cancelReason 取消原因
 * @returns 操作结果
 */
export function fetchCancelOrder(orderId: number, cancelReason?: string) {
  return request.post<boolean>({
    url: '/restaurant-order/cancel',
    data: null,
    params: { orderId, cancelReason }
  })
}

/**
 * 删除订单
 * @param id 订单ID
 * @returns 操作结果
 */
export function fetchDeleteOrder(id: number) {
  return request.del<boolean>({
    url: '/restaurant-order/delete',
    params: { id }
  })
}

/**
 * 批量删除订单
 * @param ids 订单ID列表
 * @returns 操作结果
 */
export function fetchBatchDeleteOrder(ids: number[]) {
  return request.del<boolean>({
    url: '/restaurant-order/batchDelete',
    data: ids
  })
}

// ============ 桌位控制台 API ============

/**
 * 获取所有桌位列表(不分页,用于控制台展示)
 * @param storeId 门店ID
 * @returns 桌位列表
 */
export function fetchGetAllTables(storeId?: number) {
  return request.get<Api.Table.TableListItem[]>({
    url: '/table-info/pageList',
    params: {
      currentPage: 1,
      pageSize: 1000,
      storeId
    }
  })
}

/**
 * 获取所有进行中的会话列表
 * @param storeId 门店ID
 * @returns 会话列表
 */
export function fetchGetActiveSessions(storeId?: number) {
  return request.get<Api.Session.SessionVO[]>({
    url: '/table-session/active/list',
    params: { storeId }
  })
}

/**
 * 根据会话号查询订单
 * @param sessionNo 会话编号
 * @returns 订单信息
 */
export function fetchGetOrderBySession(sessionNo: string) {
  return request.get<Api.Order.OrderDetailVO>({
    url: '/restaurant-order/getBySessionNo',
    params: { sessionNo }
  })
}

/**
 * 结束会话(结账)
 * @param sessionNo 会话编号
 * @param paidAmount 实付金额
 * @returns 操作结果
 */
export function fetchEndSession(sessionNo: string, paidAmount: number) {
  return request.put<boolean>({
    url: '/table-session/end',
    params: { sessionNo, paidAmount }
  })
}

/**
 * 一键清除所有会话，恢复餐桌状态
 * @param storeId 门店ID（可选，为空时清除所有门店）
 * @returns 操作结果
 */
export function fetchClearAllSessions(storeId?: Id) {
  return request.post<{ clearedSessionCount: number; storeId: number | null }>({
    url: '/table-session/clearAll',
    params: storeId ? { storeId } : {}
  })
}

/**
 * 批量清除指定餐桌的会话，恢复餐桌状态
 * @param tableIds 餐桌ID列表
 * @returns 操作结果
 */
export function fetchClearSessionsByTables(tableIds: number[]) {
  return request.post<{ clearedSessionCount: number; tableIds: number[] }>({
    url: '/table-session/clearByTables',
    data: tableIds
  })
}

// ============ 菜品分类管理 API ============

/**
 * 分页查询分类列表
 * @param params searchKey、isShow、level、currentPage、pageSize
 * @returns 分页结果
 */
export function fetchGetCategoryPage(params: {
  currentPage?: number
  pageSize?: number
  searchKey?: string
  isShow?: number
  level?: number
}) {
  return request.get<Api.Common.PageResult<Api.Category.CategoryListItem>>({
    url: '/dish/category/pageList',
    params: {
      currentPage: params.currentPage ?? 1,
      pageSize: params.pageSize ?? 10,
      searchKey: params.searchKey,
      isShow: params.isShow,
      level: params.level
    }
  })
}

/**
 * 获取分类详情
 * @param id 分类ID
 * @returns 分类详情
 */
export function fetchGetCategoryDetail(id: number) {
  return request.get<Api.Category.CategoryListItem>({
    url: '/dish/category/getCategoryDetail',
    params: { id }
  })
}

/**
 * 添加分类
 * @param data 分类信息
 * @returns 操作结果
 */
export function fetchAddCategory(data: Api.Category.CategoryFormData) {
  return request.post<boolean>({
    url: '/dish/category/add',
    data
  })
}

/**
 * 更新分类
 * @param data 分类信息
 * @returns 操作结果
 */
export function fetchUpdateCategory(data: Api.Category.CategoryFormData) {
  return request.put<boolean>({
    url: '/dish/category/update',
    data
  })
}

/**
 * 删除分类
 * @param id 分类ID
 * @returns 操作结果
 */
export function fetchDeleteCategory(id: number) {
  return request.del<boolean>({
    url: `/dish/category/delete/${id}`
  })
}
