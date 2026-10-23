import request from '@/utils/http'

// ============ 抽奖活动 API ============

/**
 * 获取所有抽奖活动列表（管理端使用，包括禁用的活动）
 * @returns 活动列表
 */
export function fetchGetActivityList() {
  return request.get<Api.Lottery.ActivityListItem[]>({
    url: '/lottery-activity/list'
  })
}

/**
 * 获取活动详情
 * @param activityId 活动ID
 * @returns 活动详情
 */
export function fetchGetActivityDetail(activityId: number) {
  return request.get<Api.Lottery.ActivityListItem>({
    url: '/lottery-activity/getActivityDetail',
    params: { activityId }
  })
}

/**
 * 新增抽奖活动
 * @param data 活动数据
 * @returns 操作结果
 */
export function fetchAddActivity(data: Api.Lottery.ActivityFormData) {
  return request.post<boolean>({
    url: '/lottery-activity/add',
    data
  })
}

/**
 * 编辑活动（完整编辑）
 * @param data 活动数据（需包含activityId）
 * @returns 操作结果
 */
export function fetchUpdateActivity(data: Api.Lottery.ActivityFormData) {
  return request.put<boolean>({
    url: '/lottery-activity/editActivity',
    data: data
  })
}

/**
 * 切换活动状态（启用/禁用）
 * @param activityId 活动ID
 * @returns 操作结果
 */
export function fetchToggleActivityStatus(activityId: number) {
  return request.put<boolean>({
    url: '/lottery-activity/toggleActivityStatus',
    data: null,
    params: { activityId: activityId }
  })
}

/**
 * 删除活动
 * @param activityId 活动ID
 * @returns 操作结果
 */
export function fetchDeleteActivity(activityId: number) {
  return request.del<boolean>({
    url: '/lottery-activity/deleteActivity',
    data: null,
    params: { activityId: activityId }
  })
}

// ============ 奖品管理 API ============

/**
 * 获取所有奖品列表
 * @returns 奖品列表
 */
export function fetchGetPrizeList() {
  return request.get<Api.Lottery.PrizeListItem[]>({
    url: '/lottery-prize/getAllPrizes'
  })
}

/**
 * 获取所有启用的奖品列表
 * @returns 奖品列表
 */
export function fetchGetEnabledPrizeList() {
  return request.get<Api.Lottery.PrizeListItem[]>({
    url: '/lottery-prize/getEnabledPrizes'
  })
}

/**
 * 获取奖品详情
 * @param id 奖品ID
 * @returns 奖品详情
 */
export function fetchGetPrizeDetail(id: number) {
  return request.get<Api.Lottery.PrizeListItem>({
    url: '/lottery-prize/getPrizeDetail',
    params: { id }
  })
}

/**
 * 添加奖品
 * @param data 奖品信息
 * @returns 操作结果
 */
export function fetchAddPrize(data: Api.Lottery.PrizeFormData) {
  return request.post<boolean>({
    url: '/lottery-prize/addPrize',
    data
  })
}

/**
 * 更新奖品
 * @param data 奖品信息
 * @returns 操作结果
 */
export function fetchUpdatePrize(data: Api.Lottery.PrizeFormData) {
  return request.put<boolean>({
    url: '/lottery-prize/updatePrize',
    data
  })
}

/**
 * 启用/禁用奖品
 * @param id 奖品ID
 * @param enabled 状态：0-禁用，1-启用
 * @returns 操作结果
 */
export function fetchTogglePrizeStatus(id: number) {
  return request.put<boolean>({
    url: '/lottery-prize/togglePrizeStatus',
    data: null,
    params: { id: id }
  })
}

/**
 * 删除奖品
 * @param id 奖品ID
 * @returns 操作结果
 */
export function fetchDeletePrize(id: number) {
  return request.del<boolean>({
    url: '/lottery-prize/delete',
    data: null,
    params: { id: id }
  })
}

// ============ 活动奖品关联 API ============

/**
 * 【管理员】获取活动关联的所有奖品及完整信息（包含概率、库存等）
 * @param activityId 活动ID
 * @returns 活动奖品列表
 */
export function fetchGetActivityPrizes(activityId: number) {
  return request.get<Api.Lottery.ActivityPrizeVO[]>({
    url: '/activity-prize/admin/getActivityPrizes',
    params: { activityId }
  })
}

/**
 * 为活动添加奖品
 * @param data 活动奖品关联信息
 * @returns 操作结果
 */
export function fetchAddActivityPrize(data: Api.Lottery.ActivityPrizeFormData) {
  return request.post<boolean>({
    url: '/activity-prize/addPrizeToActivity',
    data
  })
}

/**
 * 从活动中移除奖品
 * @param activityId 活动ID
 * @param prizeId 奖品ID
 * @returns 操作结果
 */
export function fetchRemoveActivityPrize(activityId: number, prizeId: number) {
  return request.del<boolean>({
    url: '/activity-prize/removePrizeFromActivity',
    data: null,
    params: { activityId: activityId, prizeId: prizeId }
  })
}

/**
 * 从活动中移除所有奖品
 * @param activityId 活动ID
 * @returns 操作结果
 */
export function fetchRemoveAllActivityPrizes(activityId: number) {
  return request.del<boolean>({
    url: '/activity-prize/removeAllPrizesFromActivity',
    data: null,
    params: { activityId: activityId }
  })
}

/**
 * 增加库存
 * @param activityId 活动ID
 * @param prizeId 奖品ID
 * @param amount 增加数量
 * @returns 操作结果
 */
export function fetchIncreaseInventory(activityId: number, prizeId: number, amount: number) {
  return request.post<boolean>({
    url: '/activity-prize/increaseInventory',
    data: null,
    params: { activityId: activityId, prizeId: prizeId, amount: amount }
  })
}

/**
 * 扣减库存
 * @param activityId 活动ID
 * @param prizeId 奖品ID
 * @param amount 扣减数量
 * @returns 操作结果
 */
export function fetchDeductInventory(activityId: number, prizeId: number, amount: number) {
  return request.post<boolean>({
    url: '/activity-prize/deductInventory',
    data: null,
    params: { activityId: activityId, prizeId: prizeId, amount: amount }
  })
}

// ============ 用户抽奖机会 API ============

/**
 * 获取用户在指定活动中的抽奖次数
 * @param activityId 活动ID
 * @returns 用户抽奖次数信息
 */
export function fetchGetUserChances(activityId: number) {
  return request.get<{ activityId: number; chances: number }>({
    url: '/user-activity-chance/getUserChances',
    params: { activityId }
  })
}

/**
 * 增加用户抽奖次数（管理员操作）
 * @param userId 用户ID
 * @param activityId 活动ID
 * @param chances 增加次数
 * @returns 操作结果
 */
export function fetchIncreaseUserChances(
  userId: string | number,
  activityId: number,
  chances: number
) {
  return request.post<boolean>({
    url: '/user-activity-chance/increaseUserChances',
    data: null,
    params: { userId: userId, activityId: activityId, chances: chances }
  })
}

/**
 * 减少用户抽奖次数（管理员操作）
 * @param userId 用户ID
 * @param activityId 活动ID
 * @param chances 减少次数
 * @returns 操作结果
 */
export function fetchDecreaseUserChances(
  userId: string | number,
  activityId: number,
  chances: number
) {
  return request.post<boolean>({
    url: '/user-activity-chance/decreaseUserChances',
    data: null,
    params: { userId: userId, activityId: activityId, chances: chances }
  })
}

/**
 * 获取活动的所有用户抽奖机会（分页，管理员操作）
 * @param activityId 活动ID
 * @param currentPage 当前页码
 * @param pageSize 每页大小
 * @returns 分页用户抽奖机会列表
 */
export function fetchGetActivityUserChances(
  activityId: number,
  currentPage: number = 1,
  pageSize: number = 10
) {
  return request.get<Api.Common.PageResult<Api.Lottery.UserActivityChance>>({
    url: '/user-activity-chance/getActivityUserChances',
    params: { activityId, currentPage, pageSize }
  })
}

/**
 * 批量增加用户抽奖机会（管理员操作）
 * @param activityId 活动ID
 * @param chances 增加次数
 * @param allUsers 是否全体用户
 * @param userIds 用户ID列表（allUsers为false时必填）
 * @returns 操作结果
 */
export function fetchBatchIncreaseChances(
  activityId: number,
  chances: number,
  allUsers: boolean,
  userIds: (number | string)[] | undefined,
  requestKey: string
) {
  return request.post<boolean>({
    url: '/user-activity-chance/batchIncreaseChances',
    data: null,
    params: {
      activityId,
      chances,
      allUsers,
      requestKey,
      userIds: userIds?.join(',')
    }
  })
}

// ============ 抽奖记录 API ============

/**
 * 执行抽奖
 * @param activityId 活动ID
 * @returns 抽奖记录
 */
export function fetchDrawLottery(activityId: number) {
  return request.post<Api.Lottery.LotteryRecord>({
    url: '/lottery-record/drawLottery',
    params: { activityId }
  })
}

/**
 * 获取用户在指定活动中的抽奖记录（分页）
 * @param activityId 活动ID
 * @param currentPage 当前页码
 * @param pageSize 每页大小
 * @returns 分页抽奖记录列表
 */
export function fetchGetUserLotteryRecordsByActivity(
  activityId: number,
  currentPage: number = 1,
  pageSize: number = 10
) {
  return request.get<Api.Common.PageResult<Api.Lottery.LotteryRecord>>({
    url: '/lottery-record/getUserLotteryRecordsByActivity',
    params: { activityId, currentPage, pageSize }
  })
}

/**
 * 管理员获取指定活动的所有抽奖记录（分页，支持多条件筛选）
 * @param activityId 活动ID
 * @param currentPage 当前页码
 * @param pageSize 每页大小
 * @param userId 用户ID（可选，指定时只查询该用户的记录）
 * @param prizeType 奖品类型（可选，0-优惠券，1-积分，2-实物，3-谢谢参与）
 * @param isReceived 领取状态（可选，0-未领取，1-已领取）
 * @returns 分页抽奖记录列表
 */
export function fetchGetActivityAllRecords(
  activityId: number,
  currentPage: number = 1,
  pageSize: number = 10,
  userId?: number | string,
  prizeType?: number,
  isReceived?: number
) {
  return request.get<Api.Common.PageResult<Api.Lottery.LotteryRecord>>({
    url: '/lottery-record/getActivityAllRecords',
    params: { activityId, currentPage, pageSize, userId, prizeType, isReceived }
  })
}

/**
 * 管理员清空指定活动的所有抽奖记录
 * @param activityId 活动ID
 * @returns 操作结果
 */
export function fetchClearActivityRecords(activityId: number) {
  return request.del<boolean>({
    url: '/lottery-record/clearActivityRecords',
    data: null,
    params: { activityId }
  })
}

/**
 * 领取奖品
 * @param recordId 记录ID
 * @returns 操作结果
 */
export function fetchReceivePrize(recordId: number) {
  return request.post<boolean>({
    url: '/lottery-record/receivePrize',
    params: { recordId }
  })
}
