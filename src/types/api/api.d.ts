/**
 * API 接口类型定义模块
 *
 * 提供所有后端接口的类型定义
 *
 * ## 主要功能
 *
 * - 通用类型（分页参数、响应结构等）
 * - 认证类型（登录、用户信息等）
 * - 系统管理类型（用户、角色等）
 * - 全局命名空间声明
 *
 * ## 使用场景
 *
 * - API 请求参数类型约束
 * - API 响应数据类型定义
 * - 接口文档类型同步
 *
 * ## 注意事项
 *
 * - 在 .vue 文件使用需要在 eslint.config.mjs 中配置 globals: { Api: 'readonly' }
 * - 使用全局命名空间，无需导入即可使用
 *
 * ## 使用方式
 *
 * ```typescript
 * const params: Api.Auth.LoginParams = { userName: 'admin', password: '123456' }
 * const response: Api.Auth.UserInfo = await fetchUserInfo()
 * ```
 *
 * @module types/api/api
 * @author Art Design Pro Team
 */

declare namespace Api {
  /** 通用类型 */
  namespace Common {
    /** 分页参数 */
    interface PaginationParams {
      /** 当前页码 */
      current: number
      /** 每页条数 */
      size: number
      /** 总条数 */
      total: number
    }

    /** 通用搜索参数 */
    type CommonSearchParams = Pick<PaginationParams, 'current' | 'size'>

    /** 分页响应基础结构 */
    interface PaginatedResponse<T = any> {
      records: T[]
      current: number
      size: number
      total: number
    }

    /** 分页结果（MyBatis-Plus Page对象格式） */
    interface PageResult<T = any> {
      records: T[]
      total: number
      size: number
      current: number
      pages: number
    }

    /** 启用状态 */
    type EnableStatus = '1' | '2'
  }

  /** 认证类型 */
  namespace Auth {
    /** 登录参数 */
    interface LoginParams {
      account: string
      password: string
    }

    /** 登录响应 */
    interface LoginResponse {
      token: string
      refreshToken: string
    }

    /** 手机/邮箱验证码登录参数 */
    interface VerifyCodeLoginParams {
      account: string
      verifyCode: string
    }

    /** 用户信息 */
    interface UserInfo {
      currentTenant?: import('../backend').Tenant | null
      userId: string | number
      userName: string
      roles: string[]
      buttons: string[]
      tenantId?: string | number | null
      tenantCode?: string | null
      storeIds?: (string | number)[]
      activeStoreId?: string | number | null
      id: number
      username: string
      nickname: string
      gender: string
      phone: string
      email: string
      introduction: string
      exp: number
      level: string
      surplusMoney: number
      points: number
      avatar: string
      status: string
      createTime: string
      updateTime: string
      roleCode: string[] | null
      coupons: number | null // 根据实际优惠券数据结构调整
      birthday: string
      openId: string | null
      // 权限相关字段（根据后端实际返回调整）
      token: string // 通常不存储在用户信息中，但根据你的需求
    }
  }

  /** 系统管理类型 */
  namespace SystemManage {
    /** 用户列表 */
    type UserList = Api.Common.PaginatedResponse<UserListItem>

    /** 用户列表项 */
    interface UserListItem {
      id: number
      username: string
      nickname: string
      gender: string
      phone: string
      email: string
      introduction: string
      exp: number
      level: string
      surplusMoney: number
      points: number
      avatar: string
      status: string
      createTime: string
      updateTime: string
      roleCode: string[] | null
      coupons: number | null // 根据实际优惠券数据结构调整
      birthday: string
      openId: string | null
      levelName: string
      // 权限相关字段（根据后端实际返回调整）
      // token: string // 通常不存储在用户信息中，但根据你的需求
    }

    /** 用户搜索参数 */
    type UserSearchParams = Partial<
      Pick<UserListItem, 'currentPage' | 'pageSize' | 'keyWord' | 'level'> &
        Api.Common.CommonSearchParams
    >

    /** 角色列表 */
    type RoleList = Api.Common.PaginatedResponse<RoleListItem>

    /** 角色列表项 */
    interface RoleListItem {
      id: string
      roleName: string
      roleCode: string
      description: string
      status: string
      createTime: string
      updateTime: string
    }

    /** 角色搜索参数 */
    type RoleSearchParams = Partial<
      Pick<RoleListItem, 'roleId' | 'roleName' | 'roleCode' | 'description' | 'enabled'> &
        Api.Common.CommonSearchParams
    >

    /** 权限类型枚举 */
    type PermissionType = 1 | 2 | 3 // 1-菜单, 2-按钮, 3-API

    /** 权限表单数据 */
    interface PermissionFormData {
      menuScope?: import('@/router/backend-menu').MenuScope
      /** 权限ID（编辑时必填） */
      id?: import('@/types/backend').Id
      /** 父级权限ID */
      parentId?: import('@/types/backend').Id | null
      /** 权限名称 */
      permissionName: string
      /** 权限编码 */
      permissionCode: string
      /** 权限类型：1-菜单，2-按钮，3-API */
      permissionType: PermissionType
      /** 路由地址（菜单类型必填） */
      routerAddress?: string
      /** 组件地址（菜单类型必填） */
      componentAddress?: string
      /** 图标 */
      icon?: string
      /** 排序 */
      sort?: number
      /** 状态：0-禁用，1-正常 */
      status?: number
      /** 是否为iframe */
      isIframe?: boolean
      /** 是否缓存 */
      keepAlive?: boolean
      /** 外链地址 */
      link?: string | null
      /** 是否隐藏 */
      isHide?: boolean
    }

    /** 等级列表 */
    type LevelList = Api.Common.PaginatedResponse<LevelListItem>

    /** 等级列表项 */
    interface LevelListItem {
      /** 等级ID */
      id: number
      /** 等级名称 */
      levelName: string
      /** 等级编码 */
      levelCode: string
      /** 所需经验值 */
      requiredExp: number
      /** 排序 */
      sort: number
      /** 状态：0-禁用，1-启用 */
      status: number
      /** 等级图标 */
      icon: string
      /** 等级描述 */
      description: string
      /** 创建时间 */
      createTime: string
      /** 更新时间 */
      updateTime?: string
    }

    /** 等级搜索参数 */
    interface LevelSearchParams {
      /** 当前页码 */
      currentPage?: number
      /** 每页条数 */
      pageSize?: number
      /** 等级名称 */
      levelName?: string
      /** 等级编码 */
      levelCode?: string
      /** 状态 */
      status?: number
    }

    /** 等级表单数据 */
    interface LevelFormData {
      /** 等级ID（编辑时必填） */
      id?: number | string
      /** 等级名称 */
      levelName: string
      /** 等级编码 */
      levelCode: string
      /** 所需经验值 */
      requiredExp: number
      /** 排序 */
      sort: number
      /** 状态：0-禁用，1-启用 */
      status: number
      /** 等级图标 */
      icon: string
      /** 等级描述 */
      description: string
    }
  }

  /** 菜品类型 */
  namespace Dish {
    /** 菜品规格项 */
    interface SpecValue {
      /** 选项值(如小份) */
      value: string
      extraPrice: number
      isDefault: boolean | null
      sortOrder: number | null
      imageUrl: string | null
    }

    /** 菜品规格选项 */
    interface DishSpecOption {
      /** 规格ID */
      id: number
      /** 菜品ID */
      dishId?: number
      /** 规格名称 */
      specName: string
      /** 规格值列表 */
      specValueList: Dish.SpecValue[]
      /** 是否必选 */
      isRequired: number
      /** 是否多选 */
      moreSelect: number
      /** 排序值 */
      sortOrder: number
    }
  }

  /** 餐桌类型 */
  namespace Table {
    /** 餐桌状态枚举 */
    type TableStatus = '空闲' | '使用中' | '预留' | '停用'

    /** 餐桌列表项 */
    interface TableListItem {
      /** 主键ID */
      id: number
      /** 门店ID */
      storeId: number
      /** 店铺名称 */
      storeName?: string
      /** 餐桌编号 */
      tableNumber: string
      /** 餐桌名称 */
      tableName: string
      /** 二维码内容 */
      qrCode?: string
      /** 二维码图片Base64 */
      qrCodeImage?: string
      /** 座位数 */
      seats: number
      /** 位置描述 */
      location?: string
      /** 状态：0-空闲，1-使用中，2-预留，3-停用 */
      status: TableStatus
      /** 创建时间 */
      createdAt?: string
      /** 更新时间 */
      updatedAt?: string
    }

    /** 餐桌列表数据 */
    interface TableListData {
      records: TableListItem[]
      current: number
      size: number
      total: number
    }

    /** 餐桌搜索参数 */
    interface TableSearchParams {
      /** 当前页码 */
      currentPage?: number
      /** 每页条数 */
      pageSize?: number
      /** 门店ID */
      storeId?: number | null
      /** 桌位编号 */
      tableNumber?: string
      /** 桌位名称 */
      tableName?: string
      /** 状态：0-空闲，1-使用中，2-预留，3-停用 */
      status?: number | null
    }

    /** 餐桌表单数据 */
    interface TableFormData {
      /** 主键ID(编辑时使用) */
      id?: number
      /** 门店ID */
      storeId: number | null
      /** 餐桌编号 */
      tableNumber: string
      /** 餐桌名称 */
      tableName: string
      /** 座位数 */
      seats: number | null
      /** 位置描述 */
      location: string
      /** 状态：0-空闲，1-使用中，2-预留，3-停用 */
      status: number
    }
  }

  /** 门店类型 */
  namespace Store {
    /** 门店状态枚举 */
    type StoreStatus = '停业' | '营业中' | '休息中'

    /** 支付模式枚举 */
    type PaymentMode = '线上支付' | '线下支付'

    /** 取餐模式枚举 */
    type PickupMode = '送上桌' | '叫号自取'

    /** 门店列表项 */
    interface StoreListItem {
      /** 主键ID */
      id: number
      /** 门店名称 */
      storeName: string
      /** 门店编码 */
      storeCode?: string
      /** 门店地址 */
      address?: string
      /** 联系电话 */
      phone?: string
      /** 营业时间 */
      businessHours?: string
      /** 支付模式：1-线上支付，2-线下支付 */
      paymentMode?: PaymentMode
      /** 取餐模式：0-送上桌，1-叫号自取 */
      pickupMode?: PickupMode
      /** 是否允许预点单：0-否，1-是 */
      allowPreOrder?: string
      /** 预点单时间限制（分钟） */
      preOrderLimit?: number
      /** 是否开启小票打印：0-否，1-是（后端返回"是"/"否"） */
      isPrint?: string
      /** 状态：0-停业，1-营业，2-休息中 */
      status?: StoreStatus
      /** 纬度 */
      latitude?: number
      /** 经度 */
      longitude?: number
      /** 门店图片URL */
      storeImages?: string
      /** 门店简介 */
      description?: string
      /** 创建时间 */
      createdAt?: string
      /** 更新时间 */
      updatedAt?: string
    }

    /** 门店列表数据 */
    interface StoreListData {
      records: StoreListItem[]
      current: number
      size: number
      total: number
    }

    /** 门店搜索参数 */
    interface StoreSearchParams {
      /** 当前页码 */
      currentPage?: number
      /** 每页条数 */
      pageSize?: number
      /** 门店名称 */
      storeName?: string
      /** 状态：0-停业，1-营业，2-休息中 */
      status?: number | null
    }

    /** 门店表单数据 */
    interface StoreFormData {
      /** 主键ID(编辑时使用) */
      id?: number
      /** 门店名称 */
      storeName: string
      /** 门店编码 */
      storeCode: string
      /** 门店地址 */
      address: string
      /** 联系电话 */
      phone: string
      /** 营业时间 */
      businessHours: string
      /** 支付模式：1-线上支付，2-线下支付 */
      paymentMode: number
      /** 取餐模式：0-送上桌，1-叫号自取 */
      pickupMode: number
      /** 是否允许预点单：0-否，1-是 */
      allowPreOrder: number
      /** 预点单时间限制（分钟） */
      preOrderLimit: number | null
      /** 是否开启小票打印：0-否，1-是 */
      isPrint: number
      /** 状态：0-停业，1-营业 */
      status: number
      /** 纬度 */
      latitude: number | null
      /** 经度 */
      longitude: number | null
      /** 门店图片URL */
      storeImages: string
      /** 门店简介 */
      description: string
    }
  }

  /** 订单类型 */
  namespace Order {
    /** 订单状态枚举 */
    type OrderStatus = '已下单' | '已接单' | '制作中' | '制作完成' | '已完成' | '已取消'

    /** 支付状态枚举 */
    type PaymentStatus = '未支付' | '已支付' | '部分退款' | '全额退款'

    /** 支付方式枚举 */
    type PaymentType = '微信' | '支付宝' | '现金' | '银行卡'

    /** 订单类型枚举 */
    type OrderType = '在线点餐' | '预点餐' | '门店自提'

    /** 订单列表项 */
    interface OrderListItem {
      /** 主键ID */
      id: number
      /** 订单编号 */
      orderNo: string
      /** 门店ID */
      storeId: number
      /** 门店名称 */
      storeName?: string
      /** 餐桌ID */
      tableId?: number
      /** 餐桌名称 */
      tableName?: string
      /** 用户ID */
      userId?: number
      /** 用户名 */
      username?: string
      /** 手机号 */
      phoneNumber?: string
      /** 会话编号 */
      sessionNo?: string
      /** 就餐人数 */
      diningCount?: number
      /** 订单类型 */
      orderType?: OrderType
      /** 订单总金额 */
      totalAmount: number
      /** 优惠金额 */
      discountAmount?: number
      /** 实际支付金额 */
      actualAmount: number
      /** 支付模式 */
      paymentMode?: string
      /** 支付状态 */
      paymentStatus?: PaymentStatus
      /** 支付方式 */
      paymentType?: PaymentType
      /** 支付时间 */
      paymentTime?: string
      /** 支付流水号 */
      paymentNo?: string
      /** 订单状态 */
      status?: OrderStatus
      /** 订单备注 */
      note?: string
      /** 取消原因 */
      cancelReason?: string
      /** 取消时间 */
      cancelTime?: string
      /** 结束用餐时间 */
      diningEndTime?: string
      /** 服务费 */
      serviceFee?: number
      /** 取餐码 */
      pickupCode?: string
      /** 创建时间 */
      createdAt?: string
      /** 更新时间 */
      updatedAt?: string
    }

    /** 订单明细项 */
    interface OrderItem {
      /** 明细ID */
      id: number
      /** 订单ID */
      orderId: number
      /** 菜品ID */
      dishId: number
      /** 分类ID */
      categoryId?: string
      /** 菜品名称 */
      dishName: string
      /** 菜品图片 */
      mainPic?: string
      /** 菜品图片(兼容字段) */
      dishImage?: string
      /** 规格信息文本 */
      specOptionsText?: string
      /** 规格信息(兼容字段) */
      specInfo?: string
      /** 单价 */
      price: number
      /** 数量 */
      quantity: number
      /** 优惠金额 */
      discountPrice?: number
      /** 总价(小计) */
      totalPrice: number
      /** 小计(兼容字段) */
      subtotal?: number
      /** 批次号 */
      batchNo?: number | string
      /** 添加时间 */
      addTime?: string
      /** 备注 */
      note?: string
      /** 创建时间 */
      createdAt?: string
      /** 更新时间 */
      updatedAt?: string
    }

    /** 订单详情VO */
    interface OrderDetailVO extends OrderListItem {
      discountRate?: number | null
      /** 订单明细列表 */
      items: OrderItem[]
    }

    /** 订单列表数据 */
    interface OrderListData {
      records: OrderDetailVO[]
      current: number
      size: number
      total: number
    }

    /** 订单搜索参数 */
    interface OrderSearchParams {
      /** 当前页码 */
      currentPage?: number
      /** 每页条数 */
      pageSize?: number
      /** 门店ID */
      storeId?: number | null
      /** 餐桌ID */
      tableId?: number | null
      /** 用户ID */
      userId?: number | null
      /** 订单类型 */
      orderType?: number | null
      /** 订单状态 */
      status?: number | null
      /** 支付状态 */
      paymentStatus?: number | null
      /** 手机号 */
      phoneNumber?: string
    }
  }

  /** 会话类型 */
  namespace Session {
    /** 会话状态枚举 */
    type SessionStatus = '进行中' | '已结束'

    /** 会话VO */
    interface SessionVO {
      /** 会话ID */
      id: number
      /** 会话编号 */
      sessionNo: string
      /** 门店ID */
      storeId: number
      /** 门店名称 */
      storeName?: string
      /** 餐桌ID */
      tableId: number
      /** 餐桌名称 */
      tableName?: string
      /** 餐桌编号 */
      tableNumber?: string
      /** 开桌用户ID */
      openUserId?: number
      /** 开桌用户名 */
      openUsername?: string
      /** 就餐人数 */
      peopleCount: number
      /** 当前参与人数 */
      currentPeopleCount?: number
      /** 会话状态 */
      status?: SessionStatus
      /** 开始时间 */
      startTime?: string
      /** 结束时间 */
      endTime?: string
      /** 实付金额 */
      paidAmount?: number
      /** 创建时间 */
      createdAt?: string
      /** 更新时间 */
      updatedAt?: string
    }
  }

  /** 控制台类型 */
  namespace Console {
    /** 桌位控制台数据 */
    interface TableConsoleItem extends Table.TableListItem {
      /** 会话信息 */
      session?: Session.SessionVO
      /** 订单信息 */
      order?: Order.OrderDetailVO
      /** 是否使用中 */
      isInUse: boolean
    }
  }

  /** 设备管理类型 */
  namespace Device {
    /** 打印机列表 */
    type PrinterList = Api.Common.PaginatedResponse<PrinterListItem>

    /** 打印机列表项（后端返回的数据格式 - 使用文字枚举） */
    interface PrinterListItem {
      id: number
      sn: string
      printerKey: string
      remark: string
      cardNum: string | null
      storeId: number
      printerBrand: '飞鹅' | '其它'
      printerType: '小票机' | '标签机'
      status: '离线' | '在线' | '缺纸'
      enabled: '正常' | '禁用'
      lastOnlineTime: string
      isDefault: '是' | '否'
      createdAt: string
      updatedAt: string
    }

    /** 打印机搜索参数（发送给后端 - 使用数字枚举） */
    interface PrinterSearchParams {
      currentPage?: number
      pageSize?: number
      storeId?: number
      printerBrand?: number // 1-飞鹅, 2-其它
      status?: number // 0-离线, 1-在线, 2-缺纸
    }

    /** 打印机添加/更新参数（发送给后端 - 使用数字枚举） */
    interface PrinterFormParams {
      id?: number
      sn: string
      printerKey: string
      remark?: string
      cardNum?: string
      storeId?: number
      printerBrand?: number // 1-飞鹅, 2-其它
      printerType?: number // 1-小票机, 2-标签机
    }

    /** 打印机状态查询结果 */
    interface PrinterStatusResult {
      success: boolean
      status: string
      statusCode: number
      msg?: string
    }

    /** 订单统计结果 */
    interface OrderInfoResult {
      success: boolean
      totalCount: number
      successCount: number
      failCount: number
      data?: any
    }
  }
  /** 菜品分类管理类型 */
  namespace Category {
    /** 分类列表项 */
    interface CategoryListItem {
      storeId?: number
      /** 主键ID */
      id: number
      /** 门店ID */
      storeId?: number
      /** 分类名称 */
      categoryName: string
      /** 分类描述 */
      categoryDesc?: string
      /** 分类图片 */
      categoryPic?: string
      /** 父分类ID，0表示顶级分类 */
      parentId?: number
      /** 分类层级：1-一级，2-二级 */
      level?: number
      /** 排序值，数字越小越靠前 */
      sortOrder?: number
      /** 是否显示：0-隐藏，1-显示 */
      isShow?: number
      /** 分类图标 */
      categoryIcon?: string
      /** 创建时间 */
      createdAt?: string
      /** 更新时间 */
      updatedAt?: string
    }

    /** 分类表单数据 */
    interface CategoryFormData {
      storeId?: number
      /** 主键ID（编辑时传递） */
      id?: number
      /** 门店ID */
      storeId?: number
      /** 分类名称 */
      categoryName: string
      /** 分类描述 */
      categoryDesc?: string
      /** 分类图片 */
      categoryPic?: string
      /** 父分类ID，0表示顶级分类 */
      parentId?: number
      /** 分类层级：1-一级，2-二级 */
      level?: number
      /** 排序值，数字越小越靠前 */
      sortOrder?: number
      /** 是否显示：0-隐藏，1-显示 */
      isShow?: number
      /** 分类图标 */
      categoryIcon?: string
    }

    /** 分类搜索参数 */
    interface CategorySearchParams {
      /** 分类名称（模糊查询） */
      categoryName?: string
      /** 门店ID */
      storeId?: number
      /** 是否显示：0-隐藏，1-显示 */
      isShow?: number
      /** 父分类ID */
      parentId?: number
      /** 分类层级 */
      level?: number
    }
  }

  /** 餐饮数据分析类型 */
  namespace RestaurantAnalysis {
    /** 销售概览VO */
    interface SalesOverviewVO {
      /** 当前周期销售额 */
      currentSales: number
      /** 同比上期销售额（去年同期） */
      lastYearSales: number
      /** 环比上期销售额（上个周期） */
      lastPeriodSales: number
      /** 同比增长率（%） */
      yearOnYearGrowthRate: number
      /** 环比增长率（%） */
      periodOnPeriodGrowthRate: number
      /** 当前周期订单数 */
      currentOrderCount: number
      /** 上期订单数 */
      lastPeriodOrderCount: number
      /** 平均客单价 */
      avgOrderAmount: number
      /** 开始时间 */
      startTime: string
      /** 结束时间 */
      endTime: string
    }

    /** 每日销售趋势VO */
    interface DailySalesTrendVO {
      /** 日期（格式：yyyy-MM-dd） */
      date: string
      /** 当日销售额 */
      sales: number
      /** 当日订单数 */
      orderCount: number
      /** 平均客单价 */
      avgOrderAmount: number
      /** 当日利润 */
      profit: number
    }

    /** 时段销售分布VO */
    interface TimePeriodSalesVO {
      /** 时段名称（早餐/午餐/晚餐/夜宵） */
      periodName: string
      /** 时段范围（如：06:00-10:00） */
      timeRange: string
      /** 销售额 */
      sales: number
      /** 订单数 */
      orderCount: number
      /** 销售额占比（%） */
      salesPercentage: number
      /** 订单数占比（%） */
      orderPercentage: number
    }

    /** 订单分析VO */
    interface OrderAnalysisVO {
      /** 订单总数 */
      totalOrderCount: number
      /** 已完成订单数 */
      completedOrderCount: number
      /** 已取消订单数 */
      cancelledOrderCount: number
      /** 进行中订单数 */
      processingOrderCount: number
      /** 订单完成率（%） */
      completionRate: number
      /** 订单取消率（%） */
      cancellationRate: number
      /** 订单进行率（%） */
      processingRate: number
      /** 平均客单价 */
      avgOrderAmount: number
      /** 总销售额 */
      totalSales: number
      /** 开始时间 */
      startTime: string
      /** 结束时间 */
      endTime: string
    }

    /** 订单状态分布VO */
    interface OrderStatusDistributionVO {
      /** 状态名称（已完成/已取消/进行中等） */
      statusName: string
      /** 状态码 */
      statusCode: number
      /** 订单数量 */
      orderCount: number
      /** 占比（%） */
      percentage: number
      /** 销售额 */
      sales: number
    }

    /** 订单取消原因分析VO */
    interface CancelReasonAnalysisVO {
      /** 取消原因 */
      cancelReason: string
      /** 取消次数 */
      cancelCount: number
      /** 占比（%） */
      percentage: number
    }

    /** 菜品销售排行VO */
    interface DishSalesRankingVO {
      /** 菜品ID */
      dishId: number
      /** 菜品名称 */
      dishName: string
      /** 菜品分类 */
      categoryName: string
      /** 菜品图片 */
      dishPic?: string
      /** 销量 */
      salesQuantity: number
      /** 销售额 */
      salesAmount: number
      /** 利润 */
      profit: number
      /** 利润率（%） */
      profitRate: number
      /** 成本 */
      cost: number
      /** 排名 */
      rank: number
    }

    /** 菜品销售趋势VO */
    interface DishSalesTrendVO {
      /** 日期（格式：yyyy-MM-dd） */
      date: string
      /** 销量 */
      salesQuantity: number
      /** 销售额 */
      salesAmount: number
    }

    /** 滞销菜品VO */
    interface SlowMovingDishVO {
      /** 菜品ID */
      dishId: number
      /** 菜品名称 */
      dishName: string
      /** 菜品分类 */
      categoryName: string
      /** 菜品图片 */
      dishImage?: string
      /** 统计天数内的销量 */
      salesQuantity: number
      /** 日均销量 */
      avgDailySales: number
      /** 最后销售日期 */
      lastSaleDate: string
      /** 滞销天数 */
      slowMovingDays: number
      /** 建议操作（下架/促销等） */
      suggestion: string
    }

    /** 菜品分类贡献分析VO */
    interface CategoryAnalysisVO {
      /** 分类ID */
      categoryId: number
      /** 分类名称 */
      categoryName: string
      /** 销售数量 */
      salesQuantity: number
      /** 销售额 */
      salesAmount: number
      /** 销售额占比（百分比） */
      salesAmountPercent: number
      /** 销量占比（百分比） */
      salesQuantityPercent: number
      /** 总成本 */
      totalCost: number
      /** 总利润 */
      totalProfit: number
      /** 利润率（百分比） */
      profitRate: number
      /** 订单数量 */
      orderCount: number
      /** 平均客单价 */
      avgOrderAmount: number
    }

    /** 菜品利润矩阵VO */
    interface DishProfitMatrixVO {
      /** 菜品ID */
      dishId: number
      /** 菜品名称 */
      dishName: string
      /** 菜品分类 */
      categoryName: string
      /** 菜品图片 */
      dishPic?: string
      /** 销量 */
      salesQuantity: number
      /** 利润率（%） */
      profitRate: number
      /** 销售额 */
      salesAmount: number
      /** 利润 */
      profit: number
      /** 象限类型：金牛产品/明星产品/引流产品/瘦狗产品 */
      quadrantType: string
      /** 象限描述 */
      quadrantDesc?: string
      /** 建议操作 */
      suggestion?: string
      /** 策略建议 */
      strategySuggestion?: string
    }

    /** 每月销售额和利润VO */
    interface MonthlySalesProfitVO {
      /** 年份 */
      year: number
      /** 月份（1-12） */
      month: number
      /** 月份名称（格式：yyyy-MM） */
      monthName: string
      /** 当月销售额 */
      sales: number
      /** 当月利润 */
      profit: number
      /** 当月订单数 */
      orderCount: number
      /** 利润率（百分比） */
      profitRate: number
    }
  }

  /** 抽奖活动类型 */
  namespace Lottery {
    /** 奖品类型枚举 */
    // 后端使用 PrizeTypeEnum(code: 0-优惠券,1-积分,2-实物,3-谢谢参与)
    // 前端经过枚举转换工具处理后，内部使用数字枚举
    type PrizeType = 0 | 1 | 2 | 3

    /** 活动列表项 */
    interface ActivityListItem {
      /** 活动ID */
      id?: number
      /** 活动名称 */
      name: string
      /** 活动描述 */
      description?: string
      /** 活动标签 */
      tag?: string
      /** 活动图片URL */
      imgUrl?: string
      /** 活动状态：0-关闭，1-启用 */
      status?: number
      /** 活动开始时间 */
      startTime?: string
      /** 活动结束时间 */
      endTime?: string
      /** 创建时间 */
      createTime?: string
      /** 更新时间 */
      updateTime?: string
    }

    /** 活动表单数据 */
    interface ActivityFormData {
      /** 活动ID（编辑时必填） */
      id?: number
      /** 活动名称 */
      name: string
      /** 活动描述 */
      description?: string
      /** 活动标签 */
      tag?: string
      /** 活动图片URL */
      imgUrl?: string
      /** 活动状态：0-关闭，1-启用 */
      status?: number
      /** 活动开始时间 */
      startTime?: string
      /** 活动结束时间 */
      endTime?: string
    }

    /** 奖品列表项 */
    interface PrizeListItem {
      /** 奖品ID */
      id?: number
      /** 奖品名称 */
      name: string
      /** 奖品图片URL */
      imgUrl?: string
      /** 奖品背景颜色 */
      bgColor?: string
      /** 中奖概率（百分比） */
      probability: number
      /** 奖品类型 */
      type: PrizeType
      /** 关联的优惠券ID（优惠券类型时使用） */
      couponId?: number
      /** 积分数量（积分类型时使用） */
      points?: number
      /** 是否启用：0-禁用，1-启用 */
      enabled?: number
      /** 创建时间 */
      createTime?: string
      /** 更新时间 */
      updateTime?: string
    }

    /** 奖品表单数据 */
    interface PrizeFormData {
      /** 奖品ID（编辑时必填） */
      id?: number
      /** 奖品名称 */
      name: string
      /** 奖品图片URL */
      imgUrl?: string
      /** 奖品背景颜色 */
      bgColor?: string
      /** 中奖概率（百分比） */
      probability: number
      /** 奖品类型 */
      type: PrizeType
      /** 关联的优惠券ID */
      couponId?: number
      /** 积分数量 */
      points?: number
      /** 是否启用：0-禁用，1-启用 */
      enabled?: number
    }

    /** 活动奖品关联VO - 对应后端 ActivityLotteryPrizeVO */
    interface ActivityPrizeVO {
      /** 奖品ID（来自 lottery_prize 表） */
      id?: number
      /** 奖品名称 */
      name?: string
      /** 奖品图片URL */
      imgUrl?: string
      /** 奖品背景颜色 */
      bgColor?: string
      /** 奖品类型 */
      type?: PrizeType
      /** 是否启用：0-禁用，1-启用 */
      enabled?: number
      /** 中奖概率 */
      probability?: number
      /** 关联的优惠券ID */
      couponId?: number
      /** 积分数量 */
      points?: number
      /** 总库存 */
      totalStock?: number
      /** 剩余库存 */
      surplusStock?: number
    }

    /** 活动奖品表单数据 */
    interface ActivityPrizeFormData {
      /** 活动ID */
      activityId: number
      /** 奖品ID */
      prizeId: number
      /** 总库存 */
      totalStock: number
      /** 剩余库存 */
      surplusStock?: number
    }

    /** 用户抽奖机会 */
    interface UserActivityChance {
      /** 主键ID */
      id?: number
      /** 用户ID */
      userId: number
      /** 活动ID */
      activityId: number
      /** 剩余抽奖次数 */
      chances: number
      /** 创建时间 */
      createTime?: string
      /** 更新时间 */
      updateTime?: string
    }

    /** 抽奖记录 */
    interface LotteryRecord {
      /** 记录ID */
      id?: number
      /** 用户ID */
      userId: number
      /** 活动ID */
      activityId: number
      /** 奖品ID */
      prizeId?: number
      /** 奖品名称 */
      prizeName?: string
      /** 奖品类型 */
      prizeType?: PrizeType
      /** 是否已领取：0-否，1-是 */
      isReceived?: number
      /** 领取时间 */
      receiveTime?: string
      /** 创建时间 */
      createTime?: string
    }
  }

  /** 优惠券管理类型 */
  namespace Coupon {
    /** 优惠券类型枚举（请求后端传数字） */
    type CouponType = 0 | 1 | 2 | 3 // 3-菜品折扣券

    /** 优惠券类型描述（后端返回为文字时使用） */
    type CouponTypeDesc = '满减券' | '整单折扣券' | '菜品免单券' | '菜品折扣券'

    /** 优惠券状态枚举（用户持有的优惠券状态） */
    type CouponStatus = 0 | 1 | 2 | 3 // 0-未生效, 1-未使用, 2-已使用, 3-已过期

    /** 优惠券状态描述 */
    type CouponStatusDesc = '未生效' | '未使用' | '已使用' | '已过期'

    /** 上下架状态枚举 */
    type ShelfStatus = 0 | 1 // 0-下架, 1-上架

    /** 上下架状态描述 */
    type ShelfStatusDesc = '下架' | '上架'

    /** 核销状态枚举 */
    type VerifyStatus = 0 | 1 // 0-未核销, 1-已核销

    /** 核销状态描述 */
    type VerifyStatusDesc = '未核销' | '已核销'

    /** 优惠券-菜品关联（菜品免单券） */
    interface CouponDishItem {
      id?: number
      couponId?: number
      dishId: string | number
      createdAt?: string
    }

    /** 优惠券列表项（后端枚举可能返回文字，type/status 兼容 number | string） */
    interface CouponListItem {
      /** 优惠券ID */
      id: number
      /** 优惠券名称 */
      name: string
      /** 描述 */
      description?: string
      /** 类型：0-满减券, 1-整单折扣券, 2-菜品免单券（后端返回文字时为 CouponTypeDesc） */
      type: CouponType | CouponTypeDesc
      /** 面值（满减为金额，整单折扣为折扣率如0.85，菜品免单可不使用） */
      value: number
      /** 最低消费金额 */
      minAmount?: number
      /** 发放总数 */
      totalCount: number
      /** 剩余数量 */
      remainCount: number
      /** 逗号分隔的适用门店ID；空表示全部 */
      storeIds?: string
      /** 逗号分隔的可用星期；空表示每天 */
      useWeekdays?: string
      useStartTime?: string
      useEndTime?: string
      /** 有效期开始时间 */
      startTime?: string
      /** 有效期结束时间 */
      endTime?: string
      /** 状态：0-下架, 1-上架（后端返回文字时为 ShelfStatusDesc） */
      status?: ShelfStatus | ShelfStatusDesc
      /** 创建时间 */
      createTime?: string
      /** 是否可叠加：0-否, 1-是（后端返回文字时为 "否"|"是"） */
      stackable?: number | '否' | '是'
      /** 互斥组ID */
      exclusiveGroup?: string
      /** 关联菜品列表（菜品免单券） */
      dishItems?: CouponDishItem[]
    }

    /** 优惠券搜索参数 */
    interface CouponSearchParams {
      /** 当前页码 */
      currentPage?: number
      /** 每页条数 */
      pageSize?: number
      /** 优惠券名称 */
      name?: string
      /** 状态：0-下架, 1-上架 */
      status?: number
    }

    /** 优惠券表单数据（提交时 type/status/stackable 必须为数字） */
    interface CouponFormData {
      /** 优惠券ID（编辑时必填） */
      id?: number
      /** 优惠券名称 */
      name: string
      /** 描述 */
      description?: string
      /** 类型：0-满减券, 1-整单折扣券, 2-菜品免单券 */
      type: CouponType
      /** 面值（满减为金额，整单折扣为折扣率如0.85，菜品免单可为0） */
      value: number
      /** 最低消费金额 */
      minAmount?: number
      /** 发放总数 */
      totalCount?: number
      storeIds?: string
      useWeekdays?: string
      useStartTime?: string
      useEndTime?: string
      /** 有效期开始时间 */
      startTime?: string
      /** 有效期结束时间 */
      endTime?: string
      /** 状态：0-下架, 1-上架（提交时传数字） */
      status?: ShelfStatus
      /** 是否可叠加：0-否, 1-是（提交时传数字） */
      stackable?: number
      /** 互斥组ID */
      exclusiveGroup?: string
      /** 关联菜品列表（菜品免单券时使用） */
      dishItems?: CouponDishItem[]
    }

    /** 用户优惠券VO */
    interface UserCouponVO {
      /** 用户优惠券ID */
      id: number
      /** 优惠券ID */
      couponId: number
      /** 优惠券名称 */
      name: string
      /** 优惠券描述 */
      description?: string
      /** 类型：0-满减, 1-折扣, 2-现金券 */
      type: CouponType
      /** 面值 */
      value: number
      /** 最低消费金额 */
      minAmount?: number
      /** 状态：0-未生效, 1-未使用, 2-已使用, 3-已过期 */
      status: CouponStatus
      /** 有效期开始 */
      startTime?: string
      /** 有效期结束 */
      expireTime?: string
      /** 优惠券唯一码（15位数字） */
      code: string
    }

    /** 用户优惠券搜索参数 */
    interface UserCouponSearchParams {
      /** 当前页码 */
      currentPage?: number
      /** 每页条数 */
      pageSize?: number
      /** 排序关键字：最近领取/即将到期 */
      searchKey?: string
      /** 状态：0-未生效, 1-未使用, 2-已使用, 3-已过期 */
      status?: number
    }

    /** 发送优惠券参数 */
    interface SendCouponParams {
      /** 用户ID */
      userId: string | number
      /** 优惠券ID */
      couponId: number
      /** 开始使用时间 */
      startTime?: string
      /** 过期时间 */
      expiredTime?: string
    }

    /** 核销结果VO */
    interface VerifyResultVO {
      /** 核销记录ID（核销成功后返回） */
      verifyRecordId?: number
      /** 用户优惠券ID */
      userCouponId: number
      /** 优惠券唯一码（15位数字） */
      couponCode: string
      /** 优惠券ID */
      couponId: number
      /** 优惠券名称 */
      couponName: string
      /** 优惠券描述 */
      couponDescription?: string
      /** 优惠券类型：0-满减, 1-折扣, 2-现金券 */
      couponType: CouponType
      /** 优惠券面值 */
      couponValue: number
      /** 最低消费金额 */
      minAmount?: number
      /** 用户ID */
      userId: number
      /** 用户名/手机号（脱敏） */
      userName?: string
      /** 优惠券状态：0-未生效, 1-未使用, 2-已使用, 3-已过期 */
      couponStatus: CouponStatus
      /** 核销状态：0-未核销, 1-已核销 */
      verifyStatus: VerifyStatus
      /** 优惠券生效时间 */
      startTime?: string
      /** 优惠券过期时间 */
      expireTime?: string
      /** 核销时间（核销成功后返回） */
      verifyTime?: string
      /** 是否可核销 */
      canVerify: boolean
      /** 不可核销原因或核销结果消息 */
      verifyMessage?: string
    }

    /** 核销记录 */
    interface VerifyRecord {
      /** 核销ID */
      id: number
      /** 用户优惠券ID */
      userCouponId: number
      /** 核销管理员ID */
      merchantId: number
      /** 核销码（15位数字） */
      verifyCode: string
      /** 核销时间 */
      verifyTime?: string
      /** 状态：0-未核销, 1-已核销 */
      status: VerifyStatus
    }

    /** 核销记录搜索参数 */
    interface VerifyRecordSearchParams {
      /** 当前页码 */
      currentPage?: number
      /** 每页条数 */
      pageSize?: number
      /** 核销管理员ID */
      merchantId?: number
      /** 状态：0-未核销, 1-已核销 */
      status?: number
    }
  }

  /** 配置管理类型 */
  namespace Config {
    /** 轮播图位置枚举 */
    type BannerPosition = 1 | 2 | 3 | 4 // 1-首页 2-点餐页 3-个人中心 4-活动页

    /** 轮播图位置描述 */
    type BannerPositionDesc = '首页轮播图' | '点餐页轮播图' | '个人中心轮播图' | '活动页轮播图'

    /** 跳转类型 */
    type LinkType = 1 | 2 | 3 // 1-小程序页面 2-H5链接 3-不跳转

    /** 轮播图状态 */
    type BannerStatus = '是' | '否'

    /** 轮播图 */
    interface Banner {
      /** ID */
      id: number
      /** 标题 */
      title: string
      /** 图片地址 */
      imageUrl: string
      /** 跳转链接 */
      linkUrl?: string
      /** 跳转类型 */
      linkType: LinkType
      /** 轮播图位置 */
      position: BannerPositionDesc
      /** 排序值 */
      sortOrder: number
      /** 状态 */
      status: BannerStatus
      /** 开始时间 */
      startTime?: string
      /** 结束时间 */
      endTime?: string
      /** 备注 */
      remark?: string
      /** 创建时间 */
      createdAt: string
      /** 更新时间 */
      updatedAt: string
    }

    /** 轮播图搜索参数 */
    interface BannerSearchParams {
      /** 位置 */
      position?: number
      /** 状态 */
      status?: number
    }

    /** 轮播图表单数据 */
    interface BannerFormData {
      /** ID（编辑时必填） */
      id?: number
      /** 标题 */
      title?: string
      /** 图片地址 */
      imageUrl: string
      /** 跳转链接 */
      linkUrl?: string
      /** 跳转类型 */
      linkType?: number
      /** 轮播图位置 */
      position: number
      /** 排序值 */
      sortOrder?: number
      /** 状态 */
      status?: number
      /** 开始时间 */
      startTime?: string
      /** 结束时间 */
      endTime?: string
      /** 备注 */
      remark?: string
    }

    /** 配置类型枚举 */
    type ConfigType = 1 | 2 | 3 | 4 | 5 // 1-图片 2-文本 3-JSON 4-颜色 5-数字

    /** 配置类型描述 */
    type ConfigTypeDesc = '图片' | '文本' | 'JSON' | '颜色' | '数字'

    /** 配置分组枚举 */
    type ConfigGroupCode = 1 | 2 | 3 | 4 | 5 // 1-默认图片 2-应用信息 3-主题 4-联系方式 5-其他

    /** 配置分组描述 */
    type ConfigGroupDesc =
      | '默认图片配置'
      | '应用信息配置'
      | '主题配置'
      | '联系方式配置'
      | '其他配置'

    /** 配置分组 */
    interface ConfigGroup {
      /** 分组码 */
      code: ConfigGroupCode
      /** 分组描述 */
      desc: ConfigGroupDesc
    }

    /** 系统配置 */
    interface AppConfig {
      /** ID */
      id: number
      /** 配置键 */
      configKey: string
      /** 配置值 */
      configValue: string
      /** 配置类型 */
      configType: ConfigTypeDesc
      /** 配置分组 */
      configGroup: ConfigGroupDesc
      /** 配置名称 */
      configName: string
      /** 配置描述 */
      description?: string
      /** 是否允许修改 */
      editable: number
      /** 创建时间 */
      createdAt: string
      /** 更新时间 */
      updatedAt: string
    }

    /** 配置搜索参数 */
    interface ConfigSearchParams {
      /** 分组 */
      configGroup?: number
    }

    /** 配置表单数据 */
    interface ConfigFormData {
      /** ID（编辑时必填） */
      id?: number
      /** 配置键 */
      configKey: string
      /** 配置值 */
      configValue: string
      /** 配置类型 */
      configType: number
      /** 配置分组 */
      configGroup: number
      /** 配置名称 */
      configName: string
      /** 配置描述 */
      description?: string
      /** 是否允许修改 */
      editable?: number
    }
  }
}
