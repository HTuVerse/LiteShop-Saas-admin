import request from '@/utils/http'
import type { Id } from '@/types/backend'

export type MonitorClient = 'B' | 'C'

export interface MonitorQuery {
  tenantId?: Id
  keyword?: string
  ip?: string
  currentPage?: number
  pageSize?: number
}

export interface OnlineSession {
  id: string
  userId: Id
  tenantId?: Id
  account: string
  nickname: string
  ip: string
  firstSeen: number
  lastSeen: number
}

export interface OnlinePage {
  records: OnlineSession[]
  total: number
  current: number
  size: number
}

export interface MonitorOverview {
  onlineUsers: number
  onlineSessions: number
  todayVisits: number
  sevenDayVisits: number
  trend: { date: string; visits: number; visitors: number }[]
  hours: { hour: number; visits: number }[]
}

export function fetchMonitorOnline(client: MonitorClient, params: MonitorQuery) {
  return request.get<OnlinePage>({ url: `/system-monitor/${client}/online`, params })
}

export function fetchMonitorOverview(client: MonitorClient, tenantId?: Id) {
  return request.get<MonitorOverview>({
    url: `/system-monitor/${client}/overview`,
    params: tenantId ? { tenantId } : undefined
  })
}

export function sendMonitorPulse(client: MonitorClient, visit = false) {
  return request.post<boolean>({
    url: `/system-monitor/${client}/pulse`,
    params: { visit },
    showErrorMessage: false
  })
}
