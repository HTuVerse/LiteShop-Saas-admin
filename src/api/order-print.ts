import request from '@/utils/http'
import type { Id } from '@/types/backend'

/**
 * 订单打印 API
 */

// 打印订单
export function printOrder(params: { orderId: Id; printerId?: Id; templateId?: Id }) {
  return request.post({
    url: '/orderPrintApi/printByOrderId',
    data: null,
    params,
    showErrorMessage: true
  })
}

// 批量打印订单
export function batchPrintOrders(data: { orderIds: Id[]; printerId?: Id }) {
  return request.post({
    url: '/orderPrintApi/batchPrint',
    data: data.orderIds,
    params: { printerId: data.printerId },
    showSuccessMessage: true,
    showErrorMessage: true
  })
}

// 测试打印
export function testPrint(params: { printerId: Id; templateId?: Id; template?: any }) {
  return request.post({
    url: `/orderPrintApi/test/${params.printerId}`,
    params: { templateId: params.templateId },
    data: params.template,
    showErrorMessage: true
  })
}
