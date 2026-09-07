/**
 * 收银台工具函数
 */

// 生成 UUID
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// 格式化金额（千分位）
export function formatMoney(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '0.00'
  return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * 格式化用餐持续时间
 * @param startTimeOrMinutes 开始时间（字符串或 Date）或已计算的分钟数
 * @returns 如 "30分钟"、"1小时20分"
 */
export function formatDuration(startTimeOrMinutes: string | Date | number): string {
  let minutes: number
  if (typeof startTimeOrMinutes === 'number') {
    if (startTimeOrMinutes < 0 || !Number.isFinite(startTimeOrMinutes)) return '-'
    minutes = Math.floor(startTimeOrMinutes)
  } else {
    const start = new Date(startTimeOrMinutes).getTime()
    if (isNaN(start)) return '-'
    minutes = Math.floor((Date.now() - start) / 60000)
    if (minutes < 0) return '-'
  }
  if (minutes < 60) return `${minutes}分钟`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}小时${m}分` : `${h}小时`
}

// 格式化时间
export function formatTime(date?: Date): string {
  const d = date || new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// 处理菜品数据，统一格式
export function normalizeDishItem(dish: any): any {
  // 处理规格选项
  let specOptions: any[] = []
  let hasSpec = false

  if (dish.specOptions && dish.specOptions.length > 0) {
    hasSpec = true
    // 后端返回的数据结构: specOptions[{ specName, specValues(JSON), specValueList }]
    specOptions = dish.specOptions.map((spec: any) => {
      // 获取规格值列表
      let valueList = spec.specValueList || []

      // 如果没有 specValueList，尝试解析 specValues
      if (valueList.length === 0 && spec.specValues) {
        try {
          const parsed = JSON.parse(spec.specValues)
          if (Array.isArray(parsed)) {
            valueList = parsed.map((item: any) => {
              if (typeof item === 'string') {
                return { value: item, extraPrice: 0 }
              }
              return item
            })
          }
        } catch {
          valueList = []
        }
      }

      return {
        id: spec.id,
        specName: spec.specName,
        isRequired: spec.isRequired,
        moreSelect: spec.moreSelect,
        // 规格值列表，每个值包含 value 和 extraPrice
        options: valueList.map((val: any, index: number) => ({
          id: `${spec.id}_${index}`,
          specName: spec.specName,
          specValue: val.value || val,
          priceAdjust: Number(val.extraPrice) || 0,
          isDefault: val.isDefault || index === 0
        }))
      }
    })
  }

  // 处理价格：price 是活动价格，originalPrice 是原价
  // 当活动价格为空/0时，使用原价
  const activityPrice = Number(dish.price) || 0
  const originalPrice = Number(dish.originalPrice) || 0
  // 实际显示/计算用的价格：优先活动价，没有则用原价
  const displayPrice = activityPrice > 0 ? activityPrice : originalPrice
  // 是否有活动价（用于显示划线价）
  const hasActivityPrice = activityPrice > 0 && originalPrice > 0 && activityPrice < originalPrice

  // 处理图片：从 dishPics 中取第一张
  let dishImage = ''
  if (dish.dishPics) {
    const images = dish.dishPics.split(',')
    dishImage = images[0]?.trim() || ''
  }

  return {
    id: dish.id,
    dishName: dish.dishName,
    dishDesc: dish.dishDesc || '',
    price: displayPrice, // 实际使用的价格
    activityPrice, // 活动价格（可能为0）
    originalPrice, // 原价
    hasActivityPrice, // 是否有活动价（用于显示划线价）
    dishImage, // 从 dishPics 取第一张图片
    stock: dish.stock ?? 9999,
    unit: dish.unit || '份',
    categoryId: dish.categoryId,
    categoryName: dish.categoryName || '',
    saleStatus: dish.saleStatus?.code ?? dish.saleStatus ?? 1,
    hasSpec,
    specOptions
  }
}

// 处理分类数据，统一格式，并添加"全部"选项
export function normalizeCategoryList(categories: any[]): any[] {
  const result = [{ id: 0, categoryName: '全部', icon: 'all' }]

  if (categories && categories.length > 0) {
    categories.forEach((cat) => {
      result.push({
        id: cat.id,
        categoryName: cat.categoryName,
        icon: cat.icon || ''
      })
    })
  }

  return result
}

// 处理用户数据，统一格式
export function normalizeUserItem(user: any): any {
  return {
    id: user.id,
    nickname: user.nickname || user.username || '用户' + user.id,
    cellphone: user.phone || user.cellPhone || '-',
    portrait: user.avatar || '',
    balance: Number(user.balance) || 0,
    points: Number(user.points) || 0,
    level: user.level || 1,
    levelName: user.levelName || '普通会员'
  }
}

// 将购物车数据转换为创建订单请求格式
export function convertCartToOrderRequest(
  cart: any,
  options?: {
    storeId?: number
    tableId?: number
    userId?: number
    sessionNo?: string
    orderType?: number
    peopleCount?: number
    note?: string
  }
): any {
  const cartItems = cart.commodity.map((item: any) => ({
    cartItemId: item.specKey || `dish_${item.id}`,
    dishId: item.id,
    categoryId: String(item.categoryId || ''),
    dishName: item.dishName,
    price: item.price,
    basePrice: item.originalPrice || item.price,
    extraPrice:
      item.selectedSpecs?.reduce((sum: number, s: any) => sum + (s.priceAdjust || 0), 0) || 0,
    categoryName: item.categoryName || '',
    specText: item.selectedSpecs?.map((s: any) => s.specValue).join(',') || '',
    quantity: item.number
  }))

  return {
    storeId: options?.storeId,
    tableId: options?.tableId,
    userId: options?.userId || cart.member?.id,
    sessionNo: options?.sessionNo,
    orderType: options?.orderType || 0,
    peopleCount: options?.peopleCount || 1,
    totalPrice: cart.total,
    cartItems,
    note: options?.note || ''
  }
}
