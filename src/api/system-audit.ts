import request from '@/utils/http'
import type { Id } from '@/types/backend'

export interface AuditQuery {
  tenantId?: Id | null
  account?: string
  startTime?: string
  endTime?: string
  ip?: string
  module?: string
  type?: string
  result?: string
  currentPage?: number
  pageSize?: number
}

export interface AuditSearchModel {
  tenantId: string
  account: string
  ip: string
  module: string
  type: string
  result: string
  dateRange: string[]
}

export interface AuditRow {
  id: Id
  tenantId: Id
  actorUserId?: Id
  actorAccount: string
  occurredAt: string
  clientIp: string
  ipLocation: string
  moduleCode: string
  operationType: string
  objectType?: string
  objectId?: string
  summary: string
  result: 'SUCCESS' | 'FAILURE' | 'DENIED'
  serviceName: string
}

export interface AuditDetail extends AuditRow {
  actorTenantId?: Id
  scopeTenantId?: Id
  storeId?: Id
  receivedAt: string
  geoDatabaseVersion?: string
  resultMessage?: string
  requestId: string
  requestPath: string
  diffJson?: string
  chainSequence: number
  entryHash: string
  keyVersion: string
}

export interface AuditPage {
  records: AuditRow[]
  total: number
  current: number
  size: number
}

export interface AuditIntegrityResult {
  tenantScopeId: Id
  valid: boolean
  lastSequence: number
  lastHash?: string
  reason?: string
}

const apiParams = ({ currentPage, ...params }: AuditQuery) => ({ ...params, page: currentPage })

export function fetchAuditPage(params: AuditQuery) {
  return request.get<AuditPage>({ url: '/system-audit/page', params: apiParams(params) })
}

export function fetchAuditDetail(id: Id) {
  return request.get<AuditDetail>({ url: `/system-audit/${id}` })
}

export function verifyAuditIntegrity(tenantId: Id) {
  return request.get<AuditIntegrityResult>({
    url: '/system-audit/integrity',
    params: { tenantId },
    timeout: 120000
  })
}

export async function exportAuditLogs(params: AuditQuery) {
  const blob = await request.get<Blob>({
    url: '/system-audit/export',
    params: apiParams(params),
    responseType: 'blob',
    timeout: 120000
  })
  if (blob.type.includes('json')) {
    const body = JSON.parse(await blob.text())
    throw new Error(body.msg || '导出失败')
  }
  return blob
}
