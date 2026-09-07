/**
 * 通用枚举字段转换工具
 * 用于处理前端显示文本和后端数据值之间的转换
 *
 * @description
 * 主要解决以下场景：
 * 1. 后端返回数字枚举值，前端需要显示文字
 * 2. 前端表单使用文字，提交时需要转换为数字
 * 3. 列表数据批量转换
 * 4. 枚举值比较和判断
 *
 * @example
 * // 定义枚举映射
 * const statusMap = createEnumMap({ 禁用: 0, 正常: 1 })
 *
 * // 单个对象转换
 * const data = { status: '正常' }
 * const converted = convertToNumber(data, { status: statusMap })
 * // => { status: 1 }
 *
 * // 列表转换
 * const list = [{ status: 0 }, { status: 1 }]
 * const converted = convertListToText(list, { status: statusMap })
 * // => [{ status: '禁用' }, { status: '正常' }]
 */

/**
 * 枚举映射类型
 */
export interface EnumMap {
  /** 文字到数字的映射 */
  textToNumber: Record<string, number>
  /** 数字到文字的映射 */
  numberToText: Record<number, string>
}

/**
 * 创建枚举映射对象
 * @param textToNumber 文字到数字的映射关系
 * @returns 双向映射对象
 *
 * @example
 * const statusMap = createEnumMap({ 禁用: 0, 正常: 1 })
 * statusMap.textToNumber['正常'] // 1
 * statusMap.numberToText[1] // '正常'
 */
export function createEnumMap(textToNumber: Record<string, number>): EnumMap {
  const numberToText: Record<number, string> = {}
  for (const [text, num] of Object.entries(textToNumber)) {
    numberToText[num] = text
  }
  return { textToNumber, numberToText }
}

/**
 * 转换单个对象的枚举字段：文字 -> 数字
 * @param data 数据对象
 * @param fields 需要转换的字段配置 { fieldName: EnumMap }
 * @returns 转换后的对象
 *
 * @example
 * const data = { status: '正常', type: '小票机' }
 * const result = convertToNumber(data, {
 *   status: createEnumMap({ 禁用: 0, 正常: 1 }),
 *   type: createEnumMap({ 小票机: 1, 标签机: 2 })
 * })
 * // => { status: 1, type: 1 }
 */
export function convertToNumber<T extends Record<string, any>>(
  data: T,
  fields: Record<string, EnumMap>
): T {
  const result = { ...data }

  for (const [field, enumMap] of Object.entries(fields)) {
    const value = result[field]

    // 如果是数字，直接使用
    if (typeof value === 'number') {
      continue
    }

    // 如果是字符串，尝试转换
    if (typeof value === 'string' && enumMap.textToNumber[value] !== undefined) {
      ;(result as Record<string, any>)[field] = enumMap.textToNumber[value] as any
    }
  }

  return result
}

/**
 * 转换单个对象的枚举字段：数字 -> 文字
 * @param data 数据对象
 * @param fields 需要转换的字段配置 { fieldName: EnumMap }
 * @returns 转换后的对象
 *
 * @example
 * const data = { status: 1, type: 1 }
 * const result = convertToText(data, {
 *   status: createEnumMap({ 禁用: 0, 正常: 1 }),
 *   type: createEnumMap({ 小票机: 1, 标签机: 2 })
 * })
 * // => { status: '正常', type: '小票机' }
 */
export function convertToText<T extends Record<string, any>>(
  data: T,
  fields: Record<string, EnumMap>
): T {
  const result = { ...data }

  for (const [field, enumMap] of Object.entries(fields)) {
    const value = result[field]

    // 如果是字符串，直接使用
    if (typeof value === 'string') {
      continue
    }

    // 如果是数字，尝试转换
    if (typeof value === 'number' && enumMap.numberToText[value] !== undefined) {
      ;(result as Record<string, any>)[field] = enumMap.numberToText[value] as any
    }
  }

  return result
}

/**
 * 批量转换列表数据：文字 -> 数字
 * @param list 数据列表
 * @param fields 需要转换的字段配置
 * @returns 转换后的列表
 *
 * @example
 * const list = [{ status: '正常' }, { status: '禁用' }]
 * const result = convertListToNumber(list, {
 *   status: createEnumMap({ 禁用: 0, 正常: 1 })
 * })
 * // => [{ status: 1 }, { status: 0 }]
 */
export function convertListToNumber<T extends Record<string, any>>(
  list: T[],
  fields: Record<string, EnumMap>
): T[] {
  return list.map((item) => convertToNumber(item, fields))
}

/**
 * 批量转换列表数据：数字 -> 文字
 * @param list 数据列表
 * @param fields 需要转换的字段配置
 * @returns 转换后的列表
 *
 * @example
 * const list = [{ status: 1 }, { status: 0 }]
 * const result = convertListToText(list, {
 *   status: createEnumMap({ 禁用: 0, 正常: 1 })
 * })
 * // => [{ status: '正常' }, { status: '禁用' }]
 */
export function convertListToText<T extends Record<string, any>>(
  list: T[],
  fields: Record<string, EnumMap>
): T[] {
  return list.map((item) => convertToText(item, fields))
}

/**
 * 判断枚举值是否相等（兼容文字和数字）
 * @param value1 值1
 * @param value2 值2
 * @param enumMap 枚举映射
 * @returns 是否相等
 *
 * @example
 * const statusMap = createEnumMap({ 禁用: 0, 正常: 1 })
 * isEnumEqual('正常', 1, statusMap) // true
 * isEnumEqual('禁用', 1, statusMap) // false
 * isEnumEqual(1, 1, statusMap) // true
 */
export function isEnumEqual(
  value1: string | number | undefined,
  value2: string | number | undefined,
  enumMap: EnumMap
): boolean {
  if (value1 === undefined || value2 === undefined) return false

  const num1 = typeof value1 === 'number' ? value1 : enumMap.textToNumber[value1]
  const num2 = typeof value2 === 'number' ? value2 : enumMap.textToNumber[value2]

  return num1 === num2
}

/**
 * 获取枚举的数字值（兼容文字和数字输入）
 * @param value 枚举值（文字或数字）
 * @param enumMap 枚举映射
 * @returns 数字值
 *
 * @example
 * const statusMap = createEnumMap({ 禁用: 0, 正常: 1 })
 * getEnumNumber('正常', statusMap) // 1
 * getEnumNumber(1, statusMap) // 1
 */
export function getEnumNumber(
  value: string | number | undefined,
  enumMap: EnumMap
): number | undefined {
  if (value === undefined) return undefined
  if (typeof value === 'number') return value
  return enumMap.textToNumber[value]
}

/**
 * 获取枚举的文字值（兼容文字和数字输入）
 * @param value 枚举值（文字或数字）
 * @param enumMap 枚举映射
 * @returns 文字值
 *
 * @example
 * const statusMap = createEnumMap({ 禁用: 0, 正常: 1 })
 * getEnumText(1, statusMap) // '正常'
 * getEnumText('正常', statusMap) // '正常'
 */
export function getEnumText(
  value: string | number | undefined,
  enumMap: EnumMap
): string | undefined {
  if (value === undefined) return undefined
  if (typeof value === 'string') return value
  return enumMap.numberToText[value]
}

/**
 * 创建转换器工厂函数
 * @param fieldsConfig 字段配置
 * @returns 转换器函数集合
 *
 * @example
 * const converter = createConverter({
 *   status: createEnumMap({ 禁用: 0, 正常: 1 }),
 *   type: createEnumMap({ 小票机: 1, 标签机: 2 })
 * })
 *
 * converter.toNumber({ status: '正常', type: '小票机' })
 * // => { status: 1, type: 1 }
 *
 * converter.toText({ status: 1, type: 1 })
 * // => { status: '正常', type: '小票机' }
 */
export function createConverter<T extends Record<string, any>>(
  fieldsConfig: Record<string, EnumMap>
) {
  return {
    /** 单个对象：文字转数字 */
    toNumber: (data: T) => convertToNumber(data, fieldsConfig),
    /** 单个对象：数字转文字 */
    toText: (data: T) => convertToText(data, fieldsConfig),
    /** 列表：文字转数字 */
    listToNumber: (list: T[]) => convertListToNumber(list, fieldsConfig),
    /** 列表：数字转文字 */
    listToText: (list: T[]) => convertListToText(list, fieldsConfig)
  }
}

// ==================== 常用枚举映射 ====================

/**
 * 通用状态枚举（禁用/正常）
 */
export const StatusEnumMap = createEnumMap({
  禁用: 0,
  正常: 1
})

/**
 * 布尔枚举（否/是）
 */
export const BooleanEnumMap = createEnumMap({
  否: 0,
  是: 1
})

/**
 * 布尔枚举（否/是）
 */
export const BooleanEnglishEnumMap = createEnumMap({
  false: 0,
  true: 1
})

/**
 * 开关枚举（关闭/开启）
 */
export const SwitchEnumMap = createEnumMap({
  关闭: 0,
  开启: 1
})

/**
 * 显示隐藏枚举
 */
export const VisibilityEnumMap = createEnumMap({
  隐藏: 0,
  显示: 1
})

/**
 * 启用禁用枚举
 */
export const EnabledEnumMap = createEnumMap({
  禁用: 0,
  启用: 1
})

/**
 * 抽奖奖品类型枚举
 * 对应后端 PrizeTypeEnum: 0-优惠券, 1-积分, 2-实物, 3-谢谢参与
 */
export const PrizeTypeEnumMap = createEnumMap({
  优惠券: 0,
  积分: 1,
  实物: 2,
  谢谢参与: 3
})

// ==================== 优惠券模块枚举映射 ====================

/**
 * 优惠券类型枚举
 * 对应后端 CouponTypeEnum: 0-满减券, 1-整单折扣券, 2-菜品免单券
 * 后端返回文字（desc），请求时需传数字（code）
 */
export const CouponTypeEnumMap = createEnumMap({
  满减券: 0,
  整单折扣券: 1,
  菜品免单券: 2
})

/**
 * 优惠券上下架状态枚举
 * 对应后端 OnOrOffShelfEnum: 0-下架, 1-上架
 */
export const CouponShelfStatusEnumMap = createEnumMap({
  下架: 0,
  上架: 1
})

/**
 * 用户优惠券状态枚举
 * 对应后端 CouponStatusEnum: 0-未生效, 1-未使用, 2-已使用, 3-已过期
 */
export const UserCouponStatusEnumMap = createEnumMap({
  未生效: 0,
  未使用: 1,
  已使用: 2,
  已过期: 3
})

/**
 * 优惠券模块字段转换器
 * 用于优惠券表单提交时将文字转换为数字
 */
export const CouponEnumConverter = createConverter({
  type: CouponTypeEnumMap,
  status: CouponShelfStatusEnumMap
})
