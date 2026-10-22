import request from '@/utils/http'

export type UserAccountRecordKind = 'experience' | 'balance' | 'points'

export interface UserAccountRecord {
  id: string | number
  time: string
  source: string
  change: number
  before: number
  after: number
  orderNo?: string
  remark?: string
  giftAmount?: number
}

interface ExperienceRecord {
  id: string | number
  operationTime: string
  source: string
  changeExp: number
  beforeExp: number
  afterExp: number
  orderNo?: string
  remark?: string
}

interface BalanceRecord {
  id: string | number
  createdAt: string
  type: string
  amount: number
  oldBalance: number
  newBalance: number
  orderNo?: string
  giftAmount?: number
}

interface PointsRecord {
  id: string | number
  operationTime: string
  operationType: string
  source: string
  points: number
  beforePoints: number
  afterPoints: number
  remark?: string
}

const experienceSources: Record<string, string> = {
  ORDER_REWARD: '订单奖励',
  ORDER_REFUND: '订单退款',
  MANUAL: '手动调整',
  LEVEL_ADJUST: '等级调整',
  OPENING_BALANCE: '初始经验'
}

export async function fetchUserAccountRecords(params: {
  userId: number
  kind: UserAccountRecordKind
  currentPage: number
  pageSize: number
}): Promise<Api.Common.PageResult<UserAccountRecord>> {
  const { userId, kind, currentPage, pageSize } = params
  const url = {
    experience: '/user-exp-record/admin/list',
    balance: '/surplus-record/admin/list',
    points: '/user-points-record/admin/list'
  }[kind]
  const page = await request.get<
    Api.Common.PageResult<ExperienceRecord | BalanceRecord | PointsRecord>
  >({
    url,
    params: { userId, pageNum: currentPage, pageSize },
    showErrorMessage: false
  })

  const records = page.records.map((record): UserAccountRecord => {
    if (kind === 'experience') {
      const row = record as ExperienceRecord
      return {
        id: row.id,
        time: row.operationTime,
        source: experienceSources[row.source] || row.source || '-',
        change: row.changeExp,
        before: row.beforeExp,
        after: row.afterExp,
        orderNo: row.orderNo,
        remark: row.remark
      }
    }
    if (kind === 'balance') {
      const row = record as BalanceRecord
      return {
        id: row.id,
        time: row.createdAt,
        source: row.type || '-',
        change: Number(row.newBalance) - Number(row.oldBalance),
        before: Number(row.oldBalance),
        after: Number(row.newBalance),
        orderNo: row.orderNo,
        giftAmount: row.giftAmount == null ? undefined : Number(row.giftAmount)
      }
    }
    const row = record as PointsRecord
    return {
      id: row.id,
      time: row.operationTime,
      source: row.source || '-',
      change: Number(row.afterPoints) - Number(row.beforePoints),
      before: row.beforePoints,
      after: row.afterPoints,
      remark: row.remark
    }
  })

  return { ...page, records }
}
