import request from '@/utils/http'
import type { Id } from '@/types/backend'

/**
 * 打印模板管理 API
 */

// 分页查询打印模板列表
export function getTemplatePage(params: {
  currentPage?: number
  pageSize?: number
  storeId?: Id
  printerId?: number
  enabled?: number
  printScene?: 'ORDER' | 'ADD_ITEMS'
}) {
  return request.get({
    url: '/printTemplateApi/page',
    params,
    showErrorMessage: true
  })
}

// 根据ID查询打印模板
export function getTemplateById(id: number) {
  return request.get({
    url: '/printTemplateApi/getTemplateById',
    data: null,
    params: { id: id },
    showErrorMessage: true
  })
}

// 获取默认模板
export function getDefaultTemplate() {
  return request.get({
    url: '/printTemplateApi/getDefaultTemplate',
    showErrorMessage: true
  })
}

// 用正式小票生成器预览当前未保存的模板草稿
export function previewTemplate(data: any): Promise<string> {
  return request.post({
    url: '/printTemplateApi/preview',
    data,
    showErrorMessage: false
  })
}

// 创建打印模板
export function createTemplate(data: any) {
  return request.post({
    url: '/printTemplateApi/create',
    data,
    showSuccessMessage: true,
    showErrorMessage: true
  })
}

// 更新打印模板
export function updateTemplate(data: any) {
  return request.put({
    url: '/printTemplateApi/update',
    data,
    showSuccessMessage: true,
    showErrorMessage: true
  })
}

// 删除打印模板
export function deleteTemplate(id: number) {
  return request.del({
    url: `/printTemplateApi/delete/${id}`,
    showSuccessMessage: true,
    showErrorMessage: true
  })
}

// 设置默认模板
export function setDefaultTemplate(id: number) {
  return request.put({
    url: `/printTemplateApi/setDefault`,
    data: null,
    params: { id: id },
    showSuccessMessage: true,
    showErrorMessage: true
  })
}

// 启用/禁用模板
export function updateTemplateEnabled(params: { id: number; enabled: number }) {
  return request.put({
    url: '/printTemplateApi/updateEnabled',
    data: null,
    params: params,
    showSuccessMessage: true,
    showErrorMessage: true
  })
}

// 复制模板
export function copyTemplate(params: { id: number; newTemplateName: string }) {
  return request.post({
    url: '/printTemplateApi/copy',
    data: null,
    params,
    showSuccessMessage: true,
    showErrorMessage: true
  })
}
