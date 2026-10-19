/**
 * 订单履约状态。
 *
 * 支付结果由 paymentStatus 单独表示，不得在订单状态中新增“待支付/已支付”。
 */
export enum OrderStatusCode {
  PLACED = 1,
  ACCEPTED = 2,
  PREPARING = 3,
  PREPARED = 4,
  COMPLETED = 5,
  CANCELLED = 6
}

export const ORDER_STATUS_DEFINITIONS = [
  {
    code: OrderStatusCode.PLACED,
    label: '已下单',
    description: '订单已提交\n等待商家处理',
    tagType: 'info'
  },
  {
    code: OrderStatusCode.ACCEPTED,
    label: '已接单',
    description: '商家已接单\n等待开始制作',
    tagType: 'primary'
  },
  {
    code: OrderStatusCode.PREPARING,
    label: '制作中',
    description: '厨房正在\n制作菜品',
    tagType: 'warning'
  },
  {
    code: OrderStatusCode.PREPARED,
    label: '制作完成',
    description: '菜品制作完成\n可取餐／上桌',
    tagType: 'success'
  },
  {
    code: OrderStatusCode.COMPLETED,
    label: '已完成',
    description: '顾客已取餐\n订单已完成',
    tagType: 'success'
  },
  {
    code: OrderStatusCode.CANCELLED,
    label: '已取消',
    description: '订单已取消\n不再继续处理',
    tagType: 'danger'
  }
] as const

export type OrderStatusLabel = (typeof ORDER_STATUS_DEFINITIONS)[number]['label']

export enum PaymentStatusCode {
  UNPAID = 0,
  PAID = 1,
  PARTIAL_REFUND = 2,
  FULL_REFUND = 3,
  TIMEOUT = 4,
  CLOSED = 5,
  FAILED = 6
}

export const PAYMENT_STATUS_DEFINITIONS = [
  { code: PaymentStatusCode.UNPAID, label: '未支付', tagType: 'danger' },
  { code: PaymentStatusCode.PAID, label: '已支付', tagType: 'success' },
  { code: PaymentStatusCode.PARTIAL_REFUND, label: '部分退款', tagType: 'warning' },
  { code: PaymentStatusCode.FULL_REFUND, label: '全额退款', tagType: 'info' },
  { code: PaymentStatusCode.TIMEOUT, label: '支付超时', tagType: 'warning' },
  { code: PaymentStatusCode.CLOSED, label: '取消支付', tagType: 'info' },
  { code: PaymentStatusCode.FAILED, label: '支付失败', tagType: 'danger' }
] as const

export type PaymentStatusLabel = (typeof PAYMENT_STATUS_DEFINITIONS)[number]['label']

const NEXT_STATUS_CODES: Readonly<Record<OrderStatusCode, readonly OrderStatusCode[]>> = {
  [OrderStatusCode.PLACED]: [OrderStatusCode.ACCEPTED, OrderStatusCode.CANCELLED],
  [OrderStatusCode.ACCEPTED]: [OrderStatusCode.PREPARING, OrderStatusCode.CANCELLED],
  [OrderStatusCode.PREPARING]: [OrderStatusCode.PREPARED, OrderStatusCode.CANCELLED],
  [OrderStatusCode.PREPARED]: [OrderStatusCode.COMPLETED, OrderStatusCode.CANCELLED],
  [OrderStatusCode.COMPLETED]: [],
  [OrderStatusCode.CANCELLED]: []
}

export function getOrderStatusDefinition(status?: OrderStatusLabel | null) {
  return ORDER_STATUS_DEFINITIONS.find((item) => item.label === status)
}

export function getOrderStatusCode(status?: OrderStatusLabel | null) {
  return getOrderStatusDefinition(status)?.code
}

export function getAllowedOrderStatusDefinitions(status?: OrderStatusLabel | null) {
  const currentCode = getOrderStatusCode(status)
  if (!currentCode) return []
  const allowedCodes = NEXT_STATUS_CODES[currentCode]
  return ORDER_STATUS_DEFINITIONS.filter((item) => allowedCodes.includes(item.code))
}

export function getPaymentStatusDefinition(status?: PaymentStatusLabel | null) {
  return PAYMENT_STATUS_DEFINITIONS.find((item) => item.label === status)
}
