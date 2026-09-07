import request from '@/utils/http'

/**
 * 订单打印 API
 */

// 打印订单
export function printOrder(params: { orderId: number; printerId?: number; templateId?: number }) {
  return request.post({
    url: '/orderPrintApi/printByOrderId',
    data: null,
    params,
    showSuccessMessage: true,
    showErrorMessage: true
  })
}

// 批量打印订单
export function batchPrintOrders(data: { orderIds: number[]; printerId?: number }) {
  return request.post({
    url: '/orderPrintApi/batchPrint',
    data: data.orderIds,
    params: { printerId: data.printerId },
    showSuccessMessage: true,
    showErrorMessage: true
  })
}

// 测试打印
export function testPrint(params: { printerId: number; templateId?: number }) {
  return request.post({
    url: `/orderPrintApi/test/${params.printerId}`,
    params: { templateId: params.templateId },
    showSuccessMessage: true,
    showErrorMessage: true
  })
}
