<template>
  <div class="cart-list-container">
    <ElScrollbar v-if="cart.commodity.length > 0" class="cart-scroll" :always="true">
      <div class="cart-list">
        <div
          v-for="(item, index) in cart.commodity"
          :key="
            item.orderItemId != null
              ? `oi-${item.orderItemId}`
              : `${item.id}-${item.specKey || ''}-${index}`
          "
          class="cart-item"
          :class="{ 'is-gift': item.isGift }"
        >
          <div class="item-thumb">
            <ElImage :src="item.dishImage || defaultDishImage" fit="cover">
              <template #error>
                <img class="size-full object-cover" :src="defaultDishImage" alt="" />
              </template>
            </ElImage>
          </div>
          <div class="item-body">
            <div class="item-header">
              <div class="item-name-wrapper">
                <div class="item-name">{{ item.dishName }}</div>
                <span v-if="item.batchNo != null" class="batch-tag">第{{ item.batchNo }}批</span>
                <ElTag v-if="item.fromOrder !== true && item.addedByName" size="small" type="info">
                  {{ item.addedByName }} 加入
                </ElTag>
                <ElTag v-if="item.isGift" type="danger" size="small" effect="dark">赠</ElTag>
              </div>
              <ElDropdown trigger="click" @command="handleItemCommand($event, index)">
                <ElButton class="more-btn" text circle :icon="MoreFilled" />
                <template #dropdown>
                  <ElDropdownMenu>
                    <ElDropdownItem
                      v-auth="[
                        'restaurant:order:gift',
                        'operations:direct-cashier:gift',
                        'operations:table-cashier:gift'
                      ]"
                      command="gift"
                    >
                      <Icon icon="qlementine-icons:gift-24" />
                      {{ item.isGift ? '取消赠菜' : '标记赠菜' }}
                    </ElDropdownItem>
                    <ElDropdownItem
                      v-if="showDeleteButton(item)"
                      command="delete"
                      divided
                      class="delete-command"
                    >
                      <ElIcon><Delete /></ElIcon>
                      删除菜品
                    </ElDropdownItem>
                  </ElDropdownMenu>
                </template>
              </ElDropdown>
            </div>
            <div class="item-specs">
              <template v-if="item.selectedSpecs && item.selectedSpecs.length > 0">
                <span
                  v-for="spec in item.selectedSpecs"
                  :key="spec.specName + spec.specValue"
                  class="spec-tag"
                >
                  {{ spec.specValue }}
                </span>
              </template>
              <template v-else-if="item.specText">
                <span class="spec-tag">{{ item.specText }}</span>
              </template>
              <span v-if="item.unit" class="unit">单位：{{ item.unit }}</span>
            </div>
            <div v-if="!item.isGift && getPromotionLabels(item).length" class="promotion-labels">
              <span v-for="label in getPromotionLabels(item)" :key="label">{{ label }}</span>
            </div>
            <div class="item-footer">
              <div class="subtotal">
                <span class="subtotal-price" :class="{ 'gift-price': item.isGift }">
                  <template v-if="item.isGift">￥0.00（赠）</template>
                  <template v-else-if="hasItemDiscount(item)">
                    <span class="subtotal-original"
                      >￥{{ formatMoney(getLineOriginalTotal(item)) }}</span
                    >
                    <span class="subtotal-actual">￥{{ formatMoney(getLinePayTotal(item)) }}</span>
                  </template>
                  <template v-else>￥{{ formatMoney(item.price * item.number) }}</template>
                </span>
              </div>
              <ElInputNumber
                v-model="item.number"
                :min="1"
                :max="item.stock || 9999"
                :disabled="tableInfo && item.fromOrder === true"
                size="small"
                @change="(val: number | undefined) => handleNumberChange(index, val ?? 1)"
              />
            </div>
          </div>
        </div>
      </div>
    </ElScrollbar>

    <div v-else class="cart-empty">
      <ElEmpty description="暂无购物车商品" :image-size="80" />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { inject } from 'vue'
  import {
    ElButton,
    ElDropdown,
    ElDropdownItem,
    ElDropdownMenu,
    ElEmpty,
    ElIcon,
    ElImage,
    ElInputNumber,
    ElScrollbar,
    ElTag
  } from 'element-plus'
  import { Delete, MoreFilled } from '@element-plus/icons-vue'
  import { Icon } from '@iconify/vue'
  import { formatMoney } from '@utils/cashier/utils'
  import defaultDishImage from '@/assets/images/dish/default-dish.png'

  // 注入数据
  const { cart, deleteCart, updateCartItemNumber, toggleGiftStatus } = inject<any>('cart')
  const tableInfo = inject<any>('tableInfo', null)

  // 订单项是否有优惠金额（来自会话订单的 totalPrice/discountPrice）
  const hasItemDiscount = (item: any) => {
    return (
      (item.lineDiscountAmount != null && Number(item.lineDiscountAmount) > 0) ||
      (item.discountPrice != null && Number(item.discountPrice) > 0 && item.totalPrice != null)
    )
  }

  const getLineOriginalTotal = (item: any) => {
    if (item.lineListAmount != null) return Number(item.lineListAmount)
    if (item.totalPrice != null && item.discountPrice != null && Number(item.discountPrice) > 0) {
      return Number(item.totalPrice) + Number(item.discountPrice)
    }
    return (item.price ?? 0) * (item.number ?? 0)
  }

  const getLinePayTotal = (item: any) => {
    if (item.linePayableAmount != null) return Number(item.linePayableAmount)
    if (item.totalPrice != null && item.totalPrice >= 0) return Number(item.totalPrice)
    return (item.price ?? 0) * (item.number ?? 0)
  }

  const getPromotionLabels = (item: any): string[] => {
    const applied = (item.pricingAdjustments || [])
      .map((adjustment: any) => adjustment.campaignName || adjustment.description)
      .filter(Boolean)
    if (applied.length) return [...new Set<string>(applied)]
    if (Number(item.discountPrice || 0) > 0) return ['已享订单优惠']
    return (item.availableCampaigns || [])
      .slice(0, 2)
      .map((campaign: any) => `${campaign.campaignName}（${campaign.description}）`)
  }

  // 是否显示删除按钮：非桌位模式始终显示；桌位模式下仅「非来自后端订单」的项可删（来自后端的需走退菜）
  const showDeleteButton = (item: any) => {
    if (!tableInfo) return true
    return item.fromOrder !== true
  }

  // 删除商品
  const handleDelete = (index: number) => {
    deleteCart(index)
  }

  // 数量变化
  const handleNumberChange = (index: number, value: number) => {
    updateCartItemNumber(index, value)
  }

  // 切换赠菜状态
  const handleToggleGift = (index: number) => {
    toggleGiftStatus(index)
  }

  const handleItemCommand = (command: string, index: number) => {
    if (command === 'gift') handleToggleGift(index)
    if (command === 'delete') handleDelete(index)
  }
</script>

<style scoped lang="scss">
  .cart-list-container {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .cart-scroll {
    height: 100%;

    :deep(.el-scrollbar__wrap) {
      overflow: auto;
    }
  }

  .cart-list {
    padding-right: 8px;
  }

  .cart-item {
    display: flex;
    gap: 10px;
    padding: 10px 2px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    transition: all 0.2s;

    &:last-child {
      border-bottom: none;
    }

    &.is-gift {
      padding: 8px;
      margin-bottom: 4px;
      background-color: var(--el-color-danger-light-9);
      border-radius: 6px;
    }

    .item-thumb {
      display: grid;
      flex-shrink: 0;
      place-items: center;
      width: 72px;
      height: 72px;
      overflow: hidden;
      color: var(--el-text-color-placeholder);
      background: var(--el-fill-color-light);
      border-radius: 9px;

      .el-image {
        width: 100%;
        height: 100%;
      }
    }

    .item-body {
      flex: 1;
      min-width: 0;
    }

    .item-header {
      display: flex;
      gap: 6px;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;

      .item-name-wrapper {
        display: flex;
        flex: 1;
        gap: 6px;
        align-items: center;
        min-width: 0;

        .item-name {
          display: -webkit-box;
          overflow: hidden;
          font-size: 14px;
          font-weight: 600;
          line-height: 1.3;
          color: var(--el-text-color-primary);
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 1;
        }

        .batch-tag {
          flex-shrink: 0;
          padding: 1px 6px;
          font-size: 11px;
          color: var(--el-text-color-secondary);
          background: var(--el-fill-color-light);
          border-radius: 3px;
        }
      }

      .more-btn {
        flex-shrink: 0;
        width: 28px;
        height: 28px;
        color: var(--el-text-color-secondary);

        &:hover {
          color: var(--el-color-primary);
          background: var(--el-color-primary-light-9);
        }
      }
    }

    .item-specs {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      align-items: center;
      margin-bottom: 6px;
      font-size: 12px;
      color: var(--el-text-color-secondary);

      .spec-tag {
        padding: 1px 5px;
        font-size: 11px;
        color: var(--el-text-color-secondary);
        background-color: var(--el-fill-color-lighter);
        border-radius: 3px;
      }

      .unit {
        color: var(--el-text-color-placeholder);
      }
    }

    .promotion-labels {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin: -1px 0 6px;

      span {
        padding: 1px 5px;
        font-size: 10px;
        line-height: 16px;
        color: var(--el-color-danger);
        background: var(--el-color-danger-light-9);
        border-radius: 4px;
      }
    }

    .item-footer {
      display: flex;
      gap: 8px;
      align-items: center;
      justify-content: space-between;

      .subtotal {
        font-size: 13px;
        color: var(--el-text-color-regular);

        .subtotal-price {
          font-size: 15px;
          font-weight: 700;
          color: var(--el-color-danger);

          &.gift-price {
            color: var(--el-color-success);
          }

          .subtotal-original {
            margin-right: 6px;
            color: var(--el-text-color-secondary);
            text-decoration: line-through;
          }

          .subtotal-actual {
            color: var(--el-color-danger);
          }
        }
      }

      :deep(.el-input-number) {
        width: 96px;

        .el-input__wrapper {
          padding-right: 30px;
          padding-left: 30px;
          background: var(--el-fill-color-light);
          border-radius: 18px;
          box-shadow: none;
        }

        .el-input-number__decrease,
        .el-input-number__increase {
          width: 28px;
          background: transparent;
          border: 0;
        }
      }
    }
  }

  .cart-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 200px;
  }

  // 平板/移动端：限制列表高度，避免一直把容器撑高
  @media screen and (width <= 1200px) {
    .cart-list-container {
      max-height: calc(100vh - 360px);
    }
  }
</style>
