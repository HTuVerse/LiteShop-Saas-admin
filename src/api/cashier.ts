import request from '@/utils/http'
import type { Id } from '@/types/backend'

// ============ 收银台 API ============

/**
 * 获取菜品分类列表（分页接口，默认每页 50 条，用于下拉/筛选；超过 50 需懒加载）
 * @param params currentPage、pageSize（默认 50）
 * @returns 分页结果 { records, total }
 */
export async function fetchCategoryList(params?: {
  currentPage?: number
  pageSize?: number
  storeId?: Id
}) {
  if (!params?.storeId) return { records: [], total: 0 }
  const categories: any[] = []
  let currentPage = 1
  let total = 0
  do {
    const page = await request.get<Api.Common.PageResult<any>>({
      url: '/dish/category/pageList',
      params: { currentPage, pageSize: 100, isShow: 1, storeId: params.storeId }
    })
    categories.push(...page.records)
    total = page.total
    if (!page.records.length) break
    currentPage++
  } while (categories.length < total)
  const size = params.pageSize || 50,
    start = ((params.currentPage || 1) - 1) * size
  return { records: categories.slice(start, start + size), total: categories.length }
}

/**
 * 获取菜品列表（不分页，按分类分组可选）
 * @param searchKey 搜索关键字
 * @param isListBySort 是否按分类分组：0-直接返回，1-按分类分组
 * @returns 菜品列表
 */
export async function fetchDishList(searchKey = '', _isListBySort = 0, storeId?: Id) {
  // 保留分组参数以兼容既有调用；收银台当前统一消费扁平菜品列表。
  void _isListBySort
  if (!storeId) return []
  const records: any[] = []
  let currentPage = 1
  let total = 0
  do {
    const page = await request.get<Api.Common.PageResult<any>>({
      url: '/dish/pageList',
      params: {
        currentPage,
        pageSize: 100,
        storeId,
        dishName: searchKey || undefined,
        saleStatus: 1
      }
    })
    records.push(...page.records)
    total = page.total
    if (!page.records.length) break
    currentPage++
  } while (records.length < total)
  return records
}

/**
 * 分页获取菜品列表
 * @param params 查询参数
 * @returns 菜品分页列表
 */
export function fetchDishPageList(params: {
  currentPage?: number
  pageSize?: number
  categoryId?: Id
  dishName?: string
  saleStatus?: number
}) {
  return request.get({
    url: '/dish/pageList',
    params: {
      currentPage: params.currentPage || 1,
      pageSize: params.pageSize || 100,
      ...params
    }
  })
}

/**
 * 获取用户列表（用于选择会员）
 * @param params 查询参数
 * @returns 用户列表
 */
export function fetchUserList(params?: {
  keyWord?: string
  level?: number
  currentPage?: number
  pageSize?: number
}) {
  return request.get({
    url: '/user/list',
    params: {
      currentPage: params?.currentPage || 1,
      pageSize: params?.pageSize || 20,
      ...params
    }
  })
}

/**
 * 收银台按手机号精确查询会员。
 * 不加载会员列表，避免会员量增长后影响收银台性能。
 */
export function fetchCashierMemberByPhone(phone: string) {
  return request.get<UserItem | null>({
    url: '/user/cashier/member',
    params: { phone }
  })
}

/**
 * 创建订单
 * @param data 订单数据
 * @returns 订单信息
 */
export interface CreateOrderPayload {
  idempotencyKey: string
  storeId?: Id
  tableId?: Id
  userId?: Id
  sessionNo?: string
  orderType?: number
  peopleCount?: number
  totalPrice: number
  cartItems: Array<{
    cartItemId?: string
    dishId: Id
    categoryId?: Id
    dishName: string
    price: number
    basePrice?: number
    extraPrice?: number
    categoryName?: string
    specText?: string
    quantity: number
    isGift?: number
  }>
  note?: string
}

export function fetchCreateOrder(data: CreateOrderPayload) {
  return request.post<Api.Order.OrderDetailVO>({
    url: '/restaurant-order/create',
    data
  })
}

/**
 * 收银员代会员创建订单。普通创建接口会把 userId 强制替换为当前操作员，
 * 因此只有明确选择会员时才能调用本接口。
 */
export function fetchCashierProxyOrder(data: CreateOrderPayload & { userId: Id }) {
  return request.post<Api.Order.OrderDetailVO>({
    url: '/restaurant-order/cashier/proxyOrder',
    data
  })
}

/**
 * 追加菜品到现有订单（加菜）
 * @param data orderId、sessionNo、cartItems、note
 * @returns 更新后的订单信息
 */
export function fetchAddItemsToOrder(data: {
  orderId: Id
  sessionNo?: string
  cartItems: Array<{
    cartItemId?: string
    dishId: Id
    categoryId?: Id
    dishName: string
    price: number
    basePrice?: number
    extraPrice?: number
    categoryName?: string
    specText?: string
    quantity: number
    isGift?: number
  }>
  note?: string
}) {
  return request.post<Api.Order.OrderDetailVO>({
    url: '/restaurant-order/addItems',
    data
  })
}

/**
 * 发起支付
 * @param data 支付数据
 * @returns 支付参数
 */
export function fetchIssuePay(data: {
  orderId: Id
  paymentType: number // 1-微信，2-支付宝，3-现金，4-银行卡，5-线下，6-余额，7-优惠券抵扣
  openId?: string
}) {
  return request.post({
    url: '/restaurant-order/issuePay',
    data
  })
}

/**
 * 查询支付状态
 * @param orderId 订单ID
 * @returns 支付状态
 */
export function fetchPayStatus(orderId: Id) {
  return request.get({
    url: '/restaurant-order/queryPayStatus',
    params: { orderId }
  })
}

/**
 * 处理支付超时
 * @param orderId 订单ID
 * @param reason 超时原因
 * @returns 处理结果
 */
export function fetchPayTimeout(orderId: Id, reason?: string) {
  return request.post({
    url: '/restaurant-order/payTimeOut',
    data: null,
    params: { orderId, reason }
  })
}

/**
 * 处理支付失败
 * @param orderId 订单ID
 * @param reason 失败原因
 * @returns 处理结果
 */
export function fetchPayError(orderId: Id, reason?: string) {
  return request.post({
    url: '/restaurant-order/payError',
    data: null,
    params: { orderId, reason }
  })
}

/**
 * 更新订单状态
 * @param orderId 订单ID
 * @param status 订单状态
 * @returns 操作结果
 */
export function fetchUpdateOrderStatus(orderId: Id, status: number) {
  return request.put({
    url: '/restaurant-order/updateStatus',
    params: { orderId, status }
  })
}

// ============ 收银台专用接口 ============

/**
 * 收银台-直接下单（管理员操作）
 * @param data 订单数据
 * @returns 订单信息
 */
export function fetchCashierDirectOrder(data: {
  idempotencyKey: string
  storeId?: Id
  tableId?: Id
  sessionNo?: string
  userId?: Id
  orderType?: number
  peopleCount?: number
  totalPrice: number
  actualAmount?: number // 实收金额（用于现金找零）
  discountRate?: number | null // 整单折扣率
  paymentType?: number
  cartItems: Array<{
    cartItemId?: string
    dishId: Id
    categoryId?: Id
    dishName: string
    price: number
    basePrice?: number
    extraPrice?: number
    categoryName?: string
    specText?: string
    quantity: number
    isGift?: number // 是否赠送（0-否，1-是）
  }>
  note?: string
  printReceipt?: boolean
}) {
  return request.post<Api.Order.OrderDetailVO>({
    url: '/restaurant-order/cashier/directOrder',
    data
  })
}

/**
 * 收银台-扫码支付（被扫：收银员扫顾客付款码完成收款）
 * 支持微信（paymentType=1）与支付宝（paymentType=2）。
 * 后端近实时处理：用户支付中会轮询，超时自动撤单；成功返回已支付订单。
 * 仅用于直接收银（无桌位会话）场景。
 * @param data 下单 + 付款码 authCode
 * @returns { order } 已支付订单
 */
export function fetchCashierScanPay(data: {
  idempotencyKey: string
  storeId?: Id
  tableId?: Id
  userId?: Id
  orderType?: number
  peopleCount?: number
  totalPrice: number
  paymentType: number // 1-微信，2-支付宝
  authCode: string // 顾客付款码（扫码枪读取，一次性）
  cartItems: Array<{
    cartItemId?: string
    dishId: Id
    categoryId?: Id
    dishName: string
    price: number
    basePrice?: number
    extraPrice?: number
    categoryName?: string
    specText?: string
    quantity: number
    isGift?: number
  }>
  note?: string
  printReceipt?: boolean
}) {
  return request.post<{ order: Api.Order.OrderDetailVO }>({
    url: '/restaurant-order/cashier/scanPay',
    data
  })
}

/**
 * 收银台-桌位结算（对会话当前订单做线下支付并结束会话、释放桌位）
 * 支持结算时传折扣、备注，会更新到订单。
 * @param data 桌位结算参数
 * @returns 订单信息
 */
export function fetchCashierSettleSession(data: {
  sessionNo: string
  paymentType: number // 3-现金，4-银行卡，6-余额
  actualAmount?: number // 选填，不传则用订单应付金额；传了用于找零与记录
  userId?: Id // 余额支付时必填
  discountRate?: number | null // 选填，整单折扣率 0.8=8折 1=无折扣
  note?: string | null // 选填，订单备注
  printReceipt?: boolean
}) {
  return request.post<Api.Order.OrderDetailVO>({
    url: '/restaurant-order/cashier/settleSession',
    data
  })
}

/**
 * 取消订单
 * @param orderId 订单ID
 * @param cancelReason 取消原因
 * @returns 操作结果
 */
export function fetchCancelOrder(orderId: Id, cancelReason?: string) {
  return request.post({
    url: '/restaurant-order/cancel',
    data: null,
    params: { orderId, cancelReason }
  })
}

/**
 * 获取订单详情
 * @param orderId 订单ID
 * @returns 订单详情
 */
export function fetchOrderDetail(orderId: Id) {
  return request.get<Api.Order.OrderDetailVO>({
    url: '/restaurant-order/getOrderDetail',
    params: { orderId }
  })
}

/**
 * 标记订单项为赠菜/取消赠菜（桌位模式）
 * 仅对从后端加载的订单项生效；单价不变，优惠金额=该行小计。
 * @param data orderId、sessionNo、orderItemIds、isGift（1-赠菜，0-取消）
 * @returns 更新后的订单信息
 */
export function fetchMarkOrderItemsGift(data: {
  orderId: Id
  sessionNo?: string
  orderItemIds: Id[]
  isGift: 0 | 1
}) {
  return request.post<Api.Order.OrderDetailVO>({
    url: '/restaurant-order/markOrderItemsGift',
    data
  })
}

/**
 * 退菜
 * @param data 退菜请求：orderId、refundItems（orderItemId、refundQuantity）、refundReason
 * @returns 退菜结果
 */
export function fetchRefundDish(data: {
  orderId: Id
  refundItems: Array<{ orderItemId: Id; refundQuantity: number; refundAmount?: number }>
  refundReason: string
  idempotencyKey: string
}) {
  return request.post<RefundDishResult>({
    url: '/restaurant-order/refundDish',
    data
  })
}

export interface RefundDishResult {
  orderId: Id
  orderNo: string
  totalRefundAmount: number
  newOrderTotalPrice?: number | null
  refundReason: string
  refundTime: string
  refundNo: string
  refundStatus: '已申请' | '处理中' | '成功' | '失败'
}

// ============ 桌位会话 API ============

/**
 * 分页获取桌位列表
 * @param params 查询参数
 * @returns 桌位分页列表
 */
export function fetchTablePageList(params: {
  currentPage?: number
  pageSize?: number
  storeId?: Id
  tableNumber?: string
  tableName?: string
  status?: number
}) {
  return request.get({
    url: '/table-info/pageList',
    params: {
      currentPage: params.currentPage || 1,
      pageSize: params.pageSize || 20,
      ...params
    }
  })
}

export interface TableReservationPayload {
  id?: Id
  tableId: Id
  reservationPhone: string
  peopleCount: number
  expectedArrivalTime: string
  expectedEndTime: string
  reservationRemark?: string
}

export interface TableReservationItem extends TableReservationPayload {
  id: Id
  storeId: Id
  tableNumber?: string
  tableName?: string
  storeName?: string
  status: number
  statusDesc: string
  sessionNo?: string
  cancelReason?: string
  arrivedAt?: string
  completedAt?: string
  cancelledAt?: string
  createdAt: string
}

/** 分页查询某桌活动预约或预约历史。 */
export function fetchTableReservationPage(params: {
  currentPage?: number
  pageSize?: number
  storeId?: Id
  tableId?: Id
  phone?: string
  status?: number
  statusGroup?: 'active' | 'history'
  startTime?: string
  endTime?: string
}) {
  return request.get<Api.Common.PaginatedResponse<TableReservationItem>>({
    url: '/table-reservation/pageList',
    params,
    showErrorMessage: false
  })
}

export function fetchCreateTableReservation(data: TableReservationPayload) {
  return request.post({
    url: '/table-reservation/create',
    data,
    showErrorMessage: false
  })
}

export function fetchUpdateTableReservation(data: TableReservationPayload) {
  return request.put({ url: '/table-reservation/update', data, showErrorMessage: false })
}

export function fetchCancelTableReservation(id: Id, reason?: string) {
  return request.post({ url: `/table-reservation/${id}/cancel`, params: { reason } })
}

export function fetchNoShowTableReservation(id: Id) {
  return request.post({ url: `/table-reservation/${id}/no-show` })
}

/**
 * 管理员开桌/加入餐桌
 * @param data 开桌请求数据
 * @returns 会话信息
 */
export function fetchAdminOpenTable(data: {
  tableId: Id
  reservationId?: Id
  peopleCount?: number
  operatorId: Id
  operatorName?: string
  remark?: string
}) {
  return request.post<SessionVO>({
    url: '/table-session/admin/open',
    data
  })
}

/**
 * 获取会话详情
 * @param sessionNo 会话编号
 * @returns 会话详情
 */
export function fetchSessionDetail(sessionNo: string) {
  return request.get<SessionVO>({
    url: `/table-session/detail/${sessionNo}`
  })
}

// ============ 类型定义 ============

// 分类项
export interface CategoryItem {
  id: Id
  categoryName: string
  categoryDesc?: string
  icon?: string
  sortOrder?: number
  status?: number
}

// 菜品项
export interface DishItem {
  id: Id
  dishName: string
  dishDesc?: string
  salePrice: number
  displayPrice: number
  campaignPrice?: number
  priceSource?: string
  appliedCampaignName?: string
  dishImage?: string
  stock: number
  unit?: string
  categoryId?: Id
  categoryName?: string
  saleStatus?: number
  specOptions?: SpecOption[]
  hasSpec?: boolean
}

// 规格选项
export interface SpecOption {
  id: Id
  specName: string
  specValue: string
  priceAdjust: number
  stockAdjust?: number
}

// 购物车商品项
export interface CartItem extends DishItem {
  /** 当前规格组合经服务端试价后的平均成交单价 */
  price: number
  number: number
  selectedSpecs?: SelectedSpec[]
  specKey?: string
  specText?: string
  isGift?: number // 是否赠送（0-否，1-是）
}

// 选中的规格
export interface SelectedSpec {
  specName: string
  specValue: string
  priceAdjust: number
}

// 用户/会员项
export interface UserItem {
  id: Id
  username?: string
  nickname?: string
  phone?: string
  email?: string
  avatar?: string
  surplusMoney?: number
  balance?: number
  points?: number
  level?: number
  levelName?: string
}

// 桌位项
export interface TableItem {
  id: Id
  tableNumber: string
  tableName?: string
  seats: number
  location?: string
  /** 从预约记录表动态返回的最近一条待到店预约。 */
  nextReservation?: TableReservationItem
  status: string
  storeId?: Id
  storeName?: string
  /** 当前进行中的会话编号，有值表示该桌位使用中 */
  sessionNo?: string
  /** 会话开桌时间（列表接口有会话时返回） */
  sessionStartTime?: string
  /** 已用餐持续时间（分钟） */
  sessionDurationMinutes?: number
  session?: SessionVO
}

// 会话VO
export interface SessionVO {
  id: Id
  sessionNo: string
  sessionToken?: string
  tableId: Id
  tableNumber?: string
  tableName?: string
  peopleCount: number
  currentUserCount?: number
  startTime: string
  endTime?: string
  /** 用餐持续时间（分钟） */
  durationMinutes?: number
  totalOrders: number
  currentOrderId?: Id
  totalAmount: number
  paidAmount?: number
  status: '进行中' | '已结束'
  statusDesc?: string
  storeId?: Id
  storeName?: string
  orders?: OrderVO[]
}

// 会话订单与管理端订单详情共用同一份后端契约。
export type OrderVO = Api.Order.OrderDetailVO
export type OrderItemVO = Api.Order.OrderItem

// 支付方式枚举
export enum PaymentType {
  WECHAT = 1,
  ALIPAY = 2,
  CASH = 3,
  BANK_CARD = 4,
  OFFLINE = 5,
  BALANCE = 6,
  COUPON = 7
}

// 保留从收银 API 导入的兼容入口，实际定义统一维护在订单常量中。
export { OrderStatusCode as OrderStatus } from '@/utils/constants/order'
