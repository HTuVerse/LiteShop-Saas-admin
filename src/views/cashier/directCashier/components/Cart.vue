<template>
  <div class="cart-container">
    <!-- 会员信息 -->
    <div class="cart-content">
      <CartMember />

      <!-- 桌位信息栏（仅桌位收银显示，会员下方单行紧凑展示） -->
      <div v-if="tableInfo" class="table-info-bar">
        <div class="table-info-item table-identity">
          <ElIcon><Dish /></ElIcon>
          <span>
            <small>桌位</small>
            <ElTooltip :content="tableDisplayName" placement="top" :show-after="300">
              <strong>{{ tableDisplayName }}</strong>
            </ElTooltip>
          </span>
        </div>
        <div class="table-info-item">
          <span>
            <small>用餐人数</small>
            <ElTooltip :content="peopleCountText" placement="top" :show-after="300">
              <strong>{{ peopleCountText }}</strong>
            </ElTooltip>
          </span>
        </div>
        <div class="table-info-item">
          <span>
            <small>开台时间</small>
            <ElTooltip :content="startTimeText" placement="top" :show-after="300">
              <strong>{{ startTimeText }}</strong>
            </ElTooltip>
          </span>
        </div>
        <div class="table-info-item">
          <span>
            <small>用餐时间</small>
            <ElTooltip :content="durationText" placement="top" :show-after="300">
              <strong>{{ durationText }}</strong>
            </ElTooltip>
          </span>
        </div>
        <ElButton
          class="btn-back"
          circle
          :icon="ArrowLeft"
          title="返回桌位列表"
          @click="handleBack"
        />
      </div>

      <div class="cart-section-header">
        <div class="cart-title"
          >购物车 <span>（{{ cartSum }}）</span></div
        >
        <ElButton
          class="clear-cart-btn"
          text
          :icon="Delete"
          :disabled="cart.commodity.length === 0"
          @click="handleClearCart"
        >
          清空
        </ElButton>
      </div>

      <!-- 购物车列表 -->
      <CartList />
    </div>

    <!-- 底部操作区 -->
    <div class="cart-bottom">
      <div class="summary-row">
        <span>商品总数</span>
        <strong>{{ cartSum }} 件</strong>
      </div>
      <div class="summary-row total-row">
        <span>合计金额</span>
        <div class="total-price">
          <div v-if="cart.discountRate && cart.discountRate < 1" class="discount-info">
            <span class="original-total">原价：￥{{ formatMoney(cartOriginalTotal) }}</span>
            <span class="discount-rate">{{ discountText }}</span>
          </div>
          <span class="price"><span class="symbol">￥</span>{{ formatMoney(cartTotal) }}</span>
        </div>
      </div>

      <!-- 桌位模式：提交订单/加菜 + 结算，一行展示 -->
      <div v-if="tableInfo" class="action-btns">
        <ElButton
          v-auth="[
            'restaurant:order:add-items',
            'operations:direct-cashier:add-items',
            'operations:table-cashier:add-items'
          ]"
          type="primary"
          size="large"
          class="submit-order-btn"
          :disabled="cart.commodity.length === 0 || Boolean(unref(tableInfo.onlinePending))"
          :loading="submitOrderLoading"
          @click="handleSubmitOrder"
        >
          {{ tableModeHasOrder ? '加 菜' : '提交订单' }}
        </ElButton>
        <ElButton
          v-auth="[
            'restaurant:order:settle',
            'operations:direct-cashier:settle',
            'operations:table-cashier:settle'
          ]"
          type="success"
          size="large"
          class="settle-btn"
          :disabled="!canSettle"
          @click="handleClearing"
        >
          结 算
        </ElButton>
      </div>
      <!-- 直接收银：仅结算 -->
      <ElButton
        v-auth="[
          'restaurant:order:settle',
          'operations:direct-cashier:settle',
          'operations:table-cashier:settle'
        ]"
        v-else
        type="primary"
        size="large"
        class="settle-btn full"
        :disabled="cart.commodity.length === 0"
        @click="handleClearing"
      >
        <span>结算</span>
        <span class="settle-amount">￥{{ formatMoney(cartTotal) }}</span>
        <ElIcon><Right /></ElIcon>
      </ElButton>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { inject, computed, unref } from 'vue'
  import { ElButton, ElIcon, ElMessageBox, ElTooltip } from 'element-plus'
  import { ArrowLeft, Delete, Dish, Right } from '@element-plus/icons-vue'
  import CartMember from './CartMember.vue'
  import CartList from './CartList.vue'
  import { formatMoney, formatDuration } from '@utils/cashier/utils'

  // 注入数据
  const { cart, emptyCart } = inject<any>('cart')
  const clearing = inject<any>('clearing')
  const tableInfo = inject<any>('tableInfo', null)

  // 桌位模式：会话是否已有订单（解包 ref/computed）
  const tableModeHasOrder = computed(() => tableInfo && Boolean(unref(tableInfo.hasOrder)))
  const submitOrderLoading = computed(
    () => tableInfo && Boolean(unref(tableInfo.submitOrderLoading))
  )

  // 桌位模式：是否存在未提交商品（有本地加购但未点「提交订单/加菜」）
  const hasUnsubmittedItems = computed(() =>
    cart.commodity.some((item: any) => item.fromOrder !== true)
  )
  // 桌位模式下不允许在有未提交商品时结算
  const canSettle = computed(() => {
    if (!tableInfo) return true
    if (unref(tableInfo.onlinePending)) return false
    return tableModeHasOrder.value && !hasUnsubmittedItems.value && cart.commodity.length > 0
  })

  // 定义事件
  const emit = defineEmits(['clearing', 'back'])

  // 返回
  const handleBack = () => {
    emit('back')
  }

  // 订单项行原价小计（优惠前）：有 totalPrice+discountPrice 则用，否则 price*number
  const getLineOriginalTotal = (item: any) => {
    if (item.lineListAmount != null) return Number(item.lineListAmount)
    if (
      !item.isGift &&
      item.totalPrice != null &&
      item.discountPrice != null &&
      Number(item.discountPrice) > 0
    ) {
      return Number(item.totalPrice) + Number(item.discountPrice)
    }
    return (item.price ?? 0) * (item.number ?? 0)
  }

  // 订单项行实付小计（优惠后）：有 totalPrice 则用，否则 price*number
  const getLinePayTotal = (item: any) => {
    if (item.linePayableAmount != null) return Number(item.linePayableAmount)
    if (item.totalPrice != null && item.totalPrice >= 0) return Number(item.totalPrice)
    return (item.price ?? 0) * (item.number ?? 0)
  }

  // 计算购物车原价总额（不含整单折扣和赠菜；与订单一致，含订单项优惠前金额）
  const cartOriginalTotal = computed(() => {
    let total = 0
    cart.commodity.forEach((item: any) => {
      if (!item.isGift) {
        total += getLineOriginalTotal(item)
      }
    })
    return total.toFixed(2)
  })

  // 计算购物车总数和总价
  const cartSum = computed(() => {
    let sum = 0
    cart.commodity.forEach((item: any) => {
      sum += item.number
    })
    return sum
  })

  const cartTotal = computed(() => {
    let total = 0
    cart.commodity.forEach((item: any) => {
      if (!item.isGift) {
        total += getLinePayTotal(item)
      }
    })

    if (cart.discountRate && cart.discountRate > 0 && cart.discountRate < 1) {
      total = total * cart.discountRate
    }

    return total.toFixed(2)
  })

  // 用餐持续时间：优先用后端分钟数，否则按开桌时间计算
  const durationText = computed(() => {
    const session = tableInfo?.session
    if (!session) return '-'
    if (typeof session.durationMinutes === 'number' && session.durationMinutes >= 0) {
      return formatDuration(session.durationMinutes)
    }
    if (session.startTime) {
      return formatDuration(session.startTime)
    }
    return '-'
  })

  const tableDisplayName = computed(() => {
    const table = tableInfo?.table
    if (!table) return '-'
    return [table.tableNumber, table.tableName].filter(Boolean).join(' · ') || '-'
  })

  const startTimeText = computed(() => {
    const startTime = tableInfo?.session?.startTime
    return startTime ? tableInfo.formatDateTime(startTime) : '-'
  })

  const peopleCountText = computed(() => {
    const peopleCount = tableInfo?.session?.peopleCount
    return peopleCount == null ? '-' : `${peopleCount} 人`
  })

  // 折扣文字
  const discountText = computed(() => {
    if (!cart.discountRate || cart.discountRate >= 1) return ''
    const discount = (cart.discountRate * 10).toFixed(1)
    return `${discount}折`
  })

  // 提交订单（桌位模式：创建订单或加菜）
  const handleSubmitOrder = () => {
    if (tableInfo?.submitOrder) {
      tableInfo.submitOrder()
    }
  }

  const handleClearCart = async () => {
    if (cart.commodity.length === 0) return
    try {
      await ElMessageBox.confirm('确定清空当前购物车中的全部菜品吗？', '清空购物车', {
        confirmButtonText: '清空',
        cancelButtonText: '取消',
        type: 'warning'
      })
      emptyCart()
    } catch {
      // 用户取消清空时保持当前购物车。
    }
  }

  // 结算
  const handleClearing = () => {
    clearing()
    emit('clearing', true)
  }
</script>

<style scoped lang="scss">
  .cart-container {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .table-info-bar {
    display: grid;
    flex-shrink: 0;
    grid-template-columns: minmax(88px, 1.25fr) repeat(3, minmax(58px, 1fr)) 32px;
    gap: 0;
    align-items: center;
    min-height: 54px;
    padding: 7px 8px 7px 10px;
    margin: -4px 0 10px;
    overflow: hidden;
    background: linear-gradient(
      135deg,
      var(--el-color-primary-light-9),
      var(--el-fill-color-blank)
    );
    border: 1px solid var(--el-color-primary-light-7);
    border-radius: 10px;

    .btn-back {
      flex-shrink: 0;
      width: 30px;
      height: 30px;
      margin-left: 4px;
      color: var(--el-color-primary);
      background: var(--el-fill-color-blank);
      border-color: var(--el-color-primary-light-7);

      &:hover {
        color: #fff;
        background: var(--el-color-primary);
        border-color: var(--el-color-primary);
      }
    }

    .table-info-item {
      display: flex;
      align-items: center;
      min-width: 0;
      padding: 0 8px;
      border-right: 1px solid var(--el-border-color-lighter);

      > span {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      small {
        margin-bottom: 3px;
        font-size: 10px;
        line-height: 1;
        color: var(--el-text-color-secondary);
      }

      strong {
        overflow: hidden;
        font-size: 12px;
        line-height: 1.2;
        color: var(--el-text-color-primary);
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .table-identity {
      gap: 6px;
      padding-left: 2px;

      .el-icon {
        flex-shrink: 0;
        font-size: 18px;
        color: var(--el-color-primary);
      }
    }
  }

  .cart-content {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    padding: 8px 10px;
    overflow: hidden;
  }

  .cart-section-header {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    min-height: 34px;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--el-border-color-lighter);

    .cart-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--el-text-color-primary);

      span {
        font-size: 12px;
        font-weight: 600;
        color: var(--el-text-color-secondary);
      }
    }

    .clear-cart-btn {
      padding: 6px;
      color: var(--el-text-color-secondary);

      &:not(.is-disabled):hover {
        color: var(--el-color-danger);
        background: var(--el-color-danger-light-9);
      }
    }
  }

  .cart-bottom {
    flex-shrink: 0;
    padding: 8px 10px 10px;
    border-top: 1px solid var(--el-border-color-lighter);

    .summary-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 24px;
      font-size: 12px;
      color: var(--el-text-color-regular);

      > strong {
        font-size: 13px;
        color: var(--el-text-color-primary);
      }

      &.total-row {
        min-height: 36px;
        margin-bottom: 6px;

        > span {
          font-size: 13px;
          color: var(--el-text-color-primary);
        }
      }

      .total-price {
        display: flex;
        gap: 8px;
        align-items: center;
        text-align: right;

        .discount-info {
          display: flex;
          gap: 6px;
          align-items: center;
          font-size: 12px;

          .original-total {
            color: var(--el-text-color-placeholder);
            text-decoration: line-through;
          }

          .discount-rate {
            font-weight: 600;
            color: var(--el-color-danger);
          }
        }

        .price {
          font-size: 21px;
          font-weight: 700;
          color: var(--el-color-danger);

          .symbol {
            font-size: 14px;
          }
        }
      }
    }

    .action-btns {
      display: flex;
      gap: 10px;
      align-items: center;

      .submit-order-btn,
      .settle-btn {
        flex: 1;
        min-width: 0;
        height: 40px;
        font-size: 14px;
        font-weight: 600;
      }
    }

    .settle-btn.full {
      display: flex;
      gap: 12px;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 44px;
      font-size: 15px;
      font-weight: 600;
      border-radius: 10px;

      .settle-amount {
        font-size: 15px;
      }

      .el-icon {
        margin-left: auto;
        font-size: 18px;
      }
    }
  }
</style>
