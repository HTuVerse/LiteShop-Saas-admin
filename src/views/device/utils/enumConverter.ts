/**
 * 枚举字段转换工具
 * 用于前后端枚举字段的相互转换
 */

// 状态枚举映射 (enabled, showLogo, showAddress 等)
export const StatusEnum = {
  DISABLED: 0,
  NORMAL: 1
}

export const StatusTextMap: Record<string, number> = {
  禁用: 0,
  正常: 1
}

export const StatusNumberMap: Record<number, string> = {
  0: '禁用',
  1: '正常'
}

// 布尔枚举映射 (isDefault)
export const BooleanEnum = {
  FALSE: 0,
  TRUE: 1
}

export const BooleanTextMap: Record<string, number> = {
  否: 0,
  是: 1
}

export const BooleanNumberMap: Record<number, string> = {
  0: '否',
  1: '是'
}

// 打印机品牌枚举映射
export const PrinterBrandEnum = {
  FEIER: 1, // 飞鹅
  OTHER: 2 // 其它
}

export const PrinterBrandTextMap: Record<string, number> = {
  飞鹅: 1,
  其它: 2
}

export const PrinterBrandNumberMap: Record<number, string> = {
  1: '飞鹅',
  2: '其它'
}

// 打印机类型枚举映射
export const PrinterTypeEnum = {
  RECEIPT: 1, // 小票机
  LABEL: 2 // 标签机
}

export const PrinterTypeTextMap: Record<string, number> = {
  小票机: 1,
  标签机: 2
}

export const PrinterTypeNumberMap: Record<number, string> = {
  1: '小票机',
  2: '标签机'
}

// 打印机状态枚举映射
export const PrinterStatusEnum = {
  OFFLINE: 0, // 离线
  ONLINE: 1, // 在线
  PAPER_OUT: 2 // 缺纸
}

export const PrinterStatusTextMap: Record<string, number> = {
  离线: 0,
  在线: 1,
  缺纸: 2
}

export const PrinterStatusNumberMap: Record<number, string> = {
  0: '离线',
  1: '在线',
  2: '缺纸'
}

/**
 * 转换对象中的枚举字段：文字 -> 数字
 * @param data 数据对象
 * @param fields 需要转换的字段配置 { fieldName: mapObject }
 */
export function convertTextToNumber<T extends Record<string, any>>(
  data: T,
  fields: Record<string, Record<string, number>>
): T {
  const result = { ...data } as Record<string, any>

  for (const [field, map] of Object.entries(fields)) {
    const value = result[field]

    // 如果是数字，直接使用
    if (typeof value === 'number') {
      continue
    }

    // 如果是字符串，尝试转换
    if (typeof value === 'string' && map[value] !== undefined) {
      result[field] = map[value]
    }
  }

  return result as T
}

/**
 * 转换对象中的枚举字段：数字 -> 文字
 * @param data 数据对象
 * @param fields 需要转换的字段配置 { fieldName: mapObject }
 */
export function convertNumberToText<T extends Record<string, any>>(
  data: T,
  fields: Record<string, Record<number, string>>
): T {
  const result = { ...data } as Record<string, any>

  for (const [field, map] of Object.entries(fields)) {
    const value = result[field]

    // 如果是字符串，直接使用
    if (typeof value === 'string') {
      continue
    }

    // 如果是数字，尝试转换
    if (typeof value === 'number' && map[value] !== undefined) {
      result[field] = map[value]
    }
  }

  return result as T
}

/**
 * 批量转换列表数据：文字 -> 数字
 */
export function convertListTextToNumber<T extends Record<string, any>>(
  list: T[],
  fields: Record<string, Record<string, number>>
): T[] {
  return list.map((item) => convertTextToNumber(item, fields))
}

/**
 * 批量转换列表数据：数字 -> 文字
 */
export function convertListNumberToText<T extends Record<string, any>>(
  list: T[],
  fields: Record<string, Record<number, string>>
): T[] {
  return list.map((item) => convertNumberToText(item, fields))
}

/**
 * 打印机专用：文字转数字
 */
export function convertPrinterToNumber<T extends Record<string, any>>(data: T): T {
  return convertTextToNumber(data, {
    printerBrand: PrinterBrandTextMap,
    printerType: PrinterTypeTextMap,
    status: PrinterStatusTextMap,
    enabled: StatusTextMap,
    isDefault: BooleanTextMap
  })
}

/**
 * 打印机专用：数字转文字
 */
export function convertPrinterToText<T extends Record<string, any>>(data: T): T {
  return convertNumberToText(data, {
    printerBrand: PrinterBrandNumberMap,
    printerType: PrinterTypeNumberMap,
    status: PrinterStatusNumberMap,
    enabled: StatusNumberMap,
    isDefault: BooleanNumberMap
  })
}

/**
 * 模板专用：文字转数字
 */
export function convertTemplateToNumber<T extends Record<string, any>>(data: T): T {
  return convertTextToNumber(data, {
    showLogo: StatusTextMap,
    showAddress: StatusTextMap,
    showPhone: StatusTextMap,
    showBusinessHours: StatusTextMap,
    showDishImage: StatusTextMap,
    showDishSpec: StatusTextMap,
    showDishNote: StatusTextMap,
    showOrderNote: StatusTextMap,
    showPaymentInfo: StatusTextMap,
    showPickupCode: BooleanTextMap,
    showQrcode: StatusTextMap,
    enabled: StatusTextMap,
    isDefault: BooleanTextMap
  })
}

/**
 * 模板专用：数字转文字
 */
export function convertTemplateToText<T extends Record<string, any>>(data: T): T {
  return convertNumberToText(data, {
    showLogo: StatusNumberMap,
    showAddress: StatusNumberMap,
    showPhone: StatusNumberMap,
    showBusinessHours: StatusNumberMap,
    showDishImage: StatusNumberMap,
    showDishSpec: StatusNumberMap,
    showDishNote: StatusNumberMap,
    showOrderNote: StatusNumberMap,
    showPaymentInfo: StatusNumberMap,
    showPickupCode: BooleanNumberMap,
    showQrcode: StatusNumberMap,
    enabled: StatusNumberMap,
    isDefault: BooleanNumberMap
  })
}

/**
 * 判断枚举值是否相等（兼容文字和数字）
 * @param value1 值1
 * @param value2 值2
 * @param map 文字到数字的映射
 */
export function isEnumEqual(
  value1: string | number | undefined,
  value2: string | number | undefined,
  map: Record<string, number>
): boolean {
  if (value1 === undefined || value2 === undefined) return false

  const num1 = typeof value1 === 'number' ? value1 : map[value1]
  const num2 = typeof value2 === 'number' ? value2 : map[value2]

  return num1 === num2
}

/**
 * 获取枚举的数字值（兼容文字和数字输入）
 */
export function getEnumNumber(
  value: string | number | undefined,
  map: Record<string, number>
): number | undefined {
  if (value === undefined) return undefined
  if (typeof value === 'number') return value
  return map[value]
}

/**
 * 获取枚举的文字值（兼容文字和数字输入）
 */
export function getEnumText(
  value: string | number | undefined,
  map: Record<number, string>
): string | undefined {
  if (value === undefined) return undefined
  if (typeof value === 'string') return value
  return map[value]
}
