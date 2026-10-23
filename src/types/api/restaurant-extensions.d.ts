/** 与餐饮服务接口同步的菜单和定价契约。 */
declare namespace Api {
  namespace Dish {
    interface DishListItem {
      id: number
      dishName: string
      sourceType?: number
    }

    interface StoreDishConfig {
      storeId?: number
      dishId?: number
      categoryOverrideId?: number | null
      salePriceOverride?: number | null
      costPriceOverride?: number | null
      listingStatus?: number
      soldOut?: number
      inventoryMode?: number
      stock?: number
      recommendOverride?: number | null
      hotOverride?: number | null
      newOverride?: number | null
      sortOrderOverride?: number | null
      expectedConfigVersion?: number
      effectiveAt?: string | null
      changeReason?: string
    }

    interface MenuChangeRecord {
      id: number
      requestNo: string
      storeId: number
      dishId: number
      dishName?: string
      requestedBy?: number
      requestedByName?: string
      changeType: number
      status: number
      changeReason?: string
      effectiveAt?: string
      reviewRemark?: string
      rejectReason?: string
      createdAt?: string
    }

    interface MenuChangeSubmitResult {
      record: MenuChangeRecord
      effectiveDish?: DishListItem
    }

    type MenuChangePage = Common.PageResult<MenuChangeRecord>

    interface MenuChangeBatchRequest {
      groupId?: number
      storeIds?: number[]
      dishId: number
      config: StoreDishConfig
      effectiveAt?: string | null
      changeReason?: string
    }

    interface StoreGroup {
      id?: number
      groupCode: string
      groupName: string
      description?: string
      status: number
      storeIds: number[]
      memberCount?: number
    }

    interface StoreMenuPolicy {
      id?: number
      storeId: number
      allowLocalDish: number
      allowLocalCategory: number
      allowCategoryOverride: number
      allowPriceOverride: number
      allowStoreOffShelf: number
      allowStoreExit: number
      minPriceRate: number
      maxPriceRate: number
      requireApproval: number
    }
  }

  namespace Pricing {
    type CampaignType = 0 | 1 | 2
    type StackMode = 0 | 1
    type GroupingType = 0 | 1 | 2
    type PricingAction = 0 | 1 | 2 | 3
    type RepeatMode = 0 | 1
    type TargetType = 0 | 1 | 2
    type AudienceType = 0 | 1 | 2

    interface Campaign {
      id?: number | string
      campaignCode: string
      campaignName: string
      campaignType: CampaignType
      startTime?: string | null
      endTime?: string | null
      priority: number
      exclusiveGroup?: string | null
      stackMode: StackMode
      status: number
      version?: number
    }

    interface Rule {
      conditionType: 0 | 1 | 2
      minimumQuantity?: number | null
      minimumAmount?: number | null
      nthQuantity?: number | null
      groupingType: GroupingType
      actionType: PricingAction
      actionValue?: number | null
      repeatMode: RepeatMode
    }

    interface Scope {
      storeId?: number | string | null
      storeGroupId?: number | string | null
      targetType: TargetType
      targetId?: number | string | null
    }

    interface Audience {
      audienceType: AudienceType
      audienceValue?: number | null
    }

    interface CampaignDetail {
      campaign: Campaign
      rule: Rule
      scopes: Scope[]
      audiences: Audience[]
    }

    interface CampaignSave extends Omit<Campaign, 'id'> {
      id?: number | string
      expectedVersion?: number
      rule: Rule
      scopes: Scope[]
      audiences: Audience[]
    }

    interface MemberDishPrice {
      id?: number | string
      storeId?: number | string | null
      dishId?: number | string
      memberLevelCode?: number | null
      memberPrice: number
      startTime?: string | null
      endTime?: string | null
      priority: number
      status: number
    }

    interface MemberPriceDishOption {
      id: number | string
      dishName: string
      sourceType: number
      available: boolean
      unavailableReason?: string
    }

    interface QuoteItem {
      lineKey?: string
      dishId: number | string
      quantity: number
      specExtraPrice?: number
    }

    interface Adjustment {
      campaignId?: number | string
      campaignName?: string
      adjustmentType: 0 | 1 | 2 | 3 | 4 | 5
      beforeAmount: number
      adjustmentAmount: number
      afterAmount: number
      description?: string
      ruleSnapshot?: string
    }

    interface CampaignHint {
      campaignId: number | string
      campaignName: string
      campaignType: CampaignType
      description?: string
    }

    interface QuoteLine {
      lineKey: string
      dishId: number | string
      dishName: string
      quantity: number
      unitListPrice: number
      unitSellingPrice: number
      unitCost?: number
      lineListAmount: number
      lineDiscountAmount: number
      linePayableAmount: number
      priceSource: string
      adjustments: Adjustment[]
      availableCampaigns: CampaignHint[]
    }

    interface Quote {
      storeId: number | string
      userId?: number | string
      memberLevelCode?: number
      listAmount: number
      campaignDiscountAmount: number
      payableAmount: number
      lines: QuoteLine[]
    }
  }

  namespace RestaurantAnalysis {
    interface DishChangeStatisticsVO {
      dishId: number
      dishName: string
      categoryId?: number
      categoryName?: string
      changeType: number
      reason?: string
      orderCount: number
      changeCount: number
      quantity: number
      amount: number
    }
    interface TimePeriodSalesVO {
      avgDailySales?: number
    }
  }

  namespace Category {
    interface CategoryListItem {
      sourceType?: number
      ownerStoreId?: number
      categoryImageResourceId?: string | number
    }
    interface CategoryFormData {
      sourceType?: number
      ownerStoreId?: number
      categoryImageResourceId?: string | number | null
    }
    interface CategorySearchParams {
      sourceType?: number
    }
  }

  namespace Store {
    interface StoreListItem {
      storeImageResourceIds?: string
    }
    interface StoreFormData {
      storeImageResourceIds?: string
    }
  }

  namespace Table {
    interface TableListItem {
      h5QrStatus?: 'READY' | 'FAILED' | 'STALE' | 'MISSING'
      h5QrError?: string
      miniQrStatus?: 'READY' | 'FAILED' | 'STALE' | 'MISSING'
      miniQrError?: string
      scanToken?: string
    }
  }

  namespace Order {
    interface OrderItem {
      linePayableAmount?: number
    }
  }

  namespace SystemManage {
    interface UserListItem {
      mustChangePassword?: number
    }
  }

  namespace Config {
    interface Banner {
      imageResourceId?: string | number | null
    }
    interface BannerFormData {
      imageResourceId?: string | number | null
    }
  }

  namespace Device {
    interface PrinterFormParams {
      templateId?: number
    }
  }
}
