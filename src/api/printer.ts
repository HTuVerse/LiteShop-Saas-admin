import request from '@/utils/http'
import type { Id } from '@/types/backend'

/**
 * 打印机管理 API
 */

// 添加打印机
export function addPrinter(data: Api.Device.PrinterFormParams & { printerKey: string }) {
  return request.post({
    url: '/feieyunApi/printer/add',
    data,
    showSuccessMessage: true,
    showErrorMessage: true
  })
}

// 查询打印机状态
export function queryPrinterStatus(sn: string) {
  return request.get({
    url: `/feieyunApi/printer/status/${sn}`,
    showErrorMessage: true
  })
}

// 分页查询打印机列表
export function getPrinterPage(params: {
  currentPage?: number
  pageSize?: number
  storeId?: Id
  status?: number
}) {
  return request.get({
    url: '/feieyunApi/printer/page',
    params,
    showErrorMessage: true
  })
}

// 根据门店ID查询打印机列表
export function getPrinterListByStore(storeId: Id) {
  return request.get({
    url: `/feieyunApi/printer/listByStore/${storeId}`,
    showErrorMessage: true
  })
}

// 根据打印机编号查询打印机信息
export function getPrinterBySn(sn: string) {
  return request.get({
    url: `/feieyunApi/printer/getBySn/${sn}`,
    showErrorMessage: true
  })
}

// 更新打印机信息
export function updatePrinter(data: Api.Device.PrinterFormParams) {
  return request.put({
    url: '/feieyunApi/printer/update',
    data,
    showSuccessMessage: true,
    showErrorMessage: true
  })
}

// 删除打印机
export function deletePrinter(id: number) {
  return request.del({
    url: `/feieyunApi/printer/delete/${id}`,
    showSuccessMessage: true,
    showErrorMessage: true
  })
}

// 启用/禁用打印机
export function updatePrinterEnabled(params: { id: number; enabled: number }) {
  return request.put({
    url: '/feieyunApi/printer/updateEnabled',
    data: null,
    params: params,
    showSuccessMessage: true,
    showErrorMessage: true
  })
}

// 同步所有打印机状态
export function syncAllPrinterStatus() {
  return request.post({
    url: '/feieyunApi/printer/syncAllStatus',
    showSuccessMessage: true,
    showErrorMessage: true
  })
}

// 查询打印机某天的订单统计
export function queryOrderInfoByDate(params: { sn: string; date: string }) {
  return request.get({
    url: '/feieyunApi/printer/orderInfo',
    params,
    showErrorMessage: true
  })
}
