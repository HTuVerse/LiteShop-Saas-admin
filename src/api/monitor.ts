import request from '@/utils/http'

export type MonitorKind = 'application' | 'host' | 'mysql' | 'redis' | 'rabbitmq'

export interface MonitorTarget {
  kind: MonitorKind
  instance: string
  host: string
  service: string
  dbCluster: string
  up: boolean | null
}

export interface MonitorOverview {
  total: number
  up: number
  down: number
  pending: number
  alertCount: number
}

export interface MonitorAlert {
  name: string
  severity: string
  instance: string
  service: string
  summary: string
  state: string
  activeAt: string
}

export interface MonitorTrend {
  metric: string
  kind: MonitorKind
  instance: string
  points: Array<{ time: number; value: number }>
}

export const fetchMonitorOverview = () =>
  request.get<MonitorOverview>({ url: '/config/monitor/overview' })

export const fetchMonitorTargets = () =>
  request.get<MonitorTarget[]>({ url: '/config/monitor/targets' })

export const fetchMonitorAlerts = () =>
  request.get<MonitorAlert[]>({ url: '/config/monitor/alerts' })

export const fetchMonitorTrend = (params: {
  kind: MonitorKind
  instance: string
  metric: string
  rangeMinutes: number
}) => request.get<MonitorTrend>({ url: '/config/monitor/trend', params })
