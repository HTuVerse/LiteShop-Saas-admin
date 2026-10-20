<template>
  <div class="function-area">
    <div class="function-scroll">
      <!-- 折扣按钮 -->
      <div class="function-btn" @click="discountVisible = true">
        <div class="btn-icon"
          ><ElIcon><Discount /></ElIcon
        ></div>
        <div class="btn-label">折扣</div>
        <div v-if="cart.discountRate && cart.discountRate < 1" class="btn-badge">
          {{ discountText }}
        </div>
      </div>

      <!-- 备注按钮 -->
      <div class="function-btn" @click="noteVisible = true">
        <div class="btn-icon"
          ><ElIcon><EditPen /></ElIcon
        ></div>
        <div class="btn-label">备注</div>
        <div v-if="cart.note" class="btn-dot"></div>
      </div>

      <!-- 挂单（桌位会话模式下禁用） -->
      <template v-if="!tableInfo">
        <div class="function-btn" @click="handleAddPending">
          <div class="btn-icon"
            ><ElIcon><DocumentAdd /></ElIcon
          ></div>
          <div class="btn-label">挂单</div>
        </div>

        <div class="function-btn" @click="pendingVisible = true">
          <div class="btn-icon"
            ><ElIcon><Tickets /></ElIcon
          ></div>
          <div class="btn-label">挂单列表</div>
          <div v-if="pending.length > 0" class="btn-badge">{{ pending.length }}</div>
        </div>
      </template>

      <!-- 退菜（仅桌位会话模式，且当前有订单时可用） -->
      <div
        v-if="tableInfo"
        class="function-btn warning"
        :class="{ disabled: !currentOrderId }"
        @click="handleRefundDish"
      >
        <div class="btn-icon"
          ><ElIcon><RefreshLeft /></ElIcon
        ></div>
        <div class="btn-label">退菜</div>
      </div>

      <!-- 打印预结单（仅桌位会话模式，有订单时可用） -->
      <div
        v-if="tableInfo"
        class="function-btn"
        :class="{ disabled: !currentOrderId }"
        @click="handleEstimatePrint"
      >
        <div class="btn-icon"
          ><ElIcon><Printer /></ElIcon
        ></div>
        <div class="btn-label">打印预结单</div>
      </div>

      <!-- 核销优惠券 -->
      <div class="function-btn" @click="verifyCouponVisible = true">
        <div class="btn-icon"
          ><ElIcon><Ticket /></ElIcon
        ></div>
        <div class="btn-label">核销优惠券</div>
      </div>

      <!-- 整单取消按钮 -->
      <div class="function-btn danger" @click="handleEmptyConfirm">
        <div class="btn-icon"
          ><ElIcon><Delete /></ElIcon
        ></div>
        <div class="btn-label">整单取消</div>
      </div>
    </div>

    <DiscountDialog v-model="discountVisible" />

    <!-- 备注弹窗 -->
    <ElDialog
      v-model="noteVisible"
      title="订单备注"
      width="500px"
      align-center
      :close-on-click-modal="false"
    >
      <ElInput
        v-model="cart.note"
        type="textarea"
        :rows="6"
        placeholder="请输入订单备注（选填）&#10;例如：不要辣、多加醋、打包等特殊要求"
        maxlength="200"
        show-word-limit
      />
      <template #footer>
        <ElButton @click="handleClearNote">清空</ElButton>
        <ElButton type="primary" @click="noteVisible = false">确定</ElButton>
      </template>
    </ElDialog>

    <!-- 整单取消确认弹窗 -->
    <ElDialog
      v-model="emptyVisible"
      title="提示"
      width="400px"
      align-center
      :close-on-click-modal="false"
    >
      <div>确定要清空该购物车吗？</div>
      <div style="margin-top: 8px; color: var(--el-color-warning)">
        清空该购物车后将无法恢复，请谨慎操作！
      </div>
      <template #footer>
        <ElButton @click="emptyVisible = false">取消</ElButton>
        <ElButton type="primary" @click="handleEmpty">确定</ElButton>
      </template>
    </ElDialog>

    <OrderPendingList v-if="!tableInfo" :visible="pendingVisible" @close="pendingVisible = false" />

    <ReceiptPrintDialog
      v-model:visible="receiptPrintVisible"
      :order-id="receiptPrintOrderId"
      :store-id="receiptPrintStoreId"
      :title="receiptPrintTitle"
      @success="onReceiptPrintSuccess"
    />

    <VerifyCouponDialog v-model:visible="verifyCouponVisible" />
  </div>
</template>

<script setup lang="ts">
  import { ref, inject, computed, unref } from 'vue'
  import { ElButton, ElInput, ElIcon, ElDialog, ElMessage } from 'element-plus'
  import {
    Discount,
    EditPen,
    DocumentAdd,
    Tickets,
    Ticket,
    Delete,
    RefreshLeft,
    Printer
  } from '@element-plus/icons-vue'
  import OrderPendingList from './OrderPendingList.vue'
  import ReceiptPrintDialog from '@/views/dish/order/modules/ReceiptPrintDialog.vue'
  import VerifyCouponDialog from './VerifyCouponDialog.vue'
  import DiscountDialog from './DiscountDialog.vue'

  const { cart, emptyCart } = inject<any>('cart')
  const { pending, addPending } = inject<any>('pending')
  const tableInfo = inject<any>('tableInfo', null)
  const currentOrderId = computed(() => tableInfo && unref(tableInfo.currentOrderId))

  const discountVisible = ref(false)
  const noteVisible = ref(false)
  const emptyVisible = ref(false)
  const pendingVisible = ref(false)
  const receiptPrintVisible = ref(false)
  const receiptPrintOrderId = ref<number | null>(null)
  const receiptPrintStoreId = ref<number | null>(null)
  const receiptPrintTitle = ref('打印预结单')
  const verifyCouponVisible = ref(false)

  const discountText = computed(() => {
    if (!cart.discountRate || cart.discountRate >= 1) return ''
    const discount = (cart.discountRate * 10).toFixed(1)
    return `${discount}折`
  })

  const handleClearNote = () => {
    cart.note = ''
    ElMessage.success('已清空备注')
  }

  const handleAddPending = () => addPending()

  const handleRefundDish = () => {
    if (!currentOrderId.value) return
    tableInfo?.openRefundDish?.()
  }

  const handleEstimatePrint = () => {
    if (!currentOrderId.value) {
      ElMessage.warning('请先提交订单')
      return
    }
    receiptPrintTitle.value = '打印预结单'
    receiptPrintOrderId.value = currentOrderId.value
    receiptPrintStoreId.value = tableInfo?.table?.storeId ?? null
    receiptPrintVisible.value = true
  }

  const onReceiptPrintSuccess = () => {
    receiptPrintOrderId.value = null
    receiptPrintStoreId.value = null
  }

  const handleEmptyConfirm = () => {
    if (cart.commodity.length === 0) {
      ElMessage.warning('购物车为空')
      return
    }
    emptyVisible.value = true
  }

  const handleEmpty = () => {
    emptyCart()
    emptyVisible.value = false
  }
</script>

<style scoped lang="scss">
  .function-area {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .function-scroll {
    display: flex;
    flex-direction: column;
    gap: 2px;
    height: 100%;
    padding: 4px;
    overflow: hidden auto;
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;

    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: transparent;
      border-radius: 2px;
      transition: background 0.3s;
    }

    &:hover::-webkit-scrollbar-thumb {
      background: rgb(0 0 0 / 20%);
    }

    &::-webkit-scrollbar-thumb:hover {
      background: rgb(0 0 0 / 30%);
    }

    &:hover {
      scrollbar-color: rgb(0 0 0 / 20%) transparent;
    }
  }

  .function-btn {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 3px;
    align-items: center;
    justify-content: center;
    min-height: 54px;
    padding: 5px 3px;
    cursor: pointer;
    user-select: none;
    background-color: var(--el-fill-color-lighter);
    border-radius: 8px;
    transition: all 0.3s;

    &:hover {
      background-color: var(--el-color-primary-light-9);
      transform: translateY(-1px);

      .btn-icon {
        color: var(--el-color-primary);
        transform: scale(1.1);
      }

      .btn-label {
        color: var(--el-color-primary);
      }
    }

    &.danger:hover {
      background-color: var(--el-color-danger-light-9);

      .btn-icon,
      .btn-label {
        color: var(--el-color-danger);
      }
    }

    &.warning:hover:not(.disabled) {
      background-color: var(--el-color-warning-light-9);

      .btn-icon,
      .btn-label {
        color: var(--el-color-warning);
      }
    }

    &.disabled {
      pointer-events: none;
      cursor: not-allowed;
      opacity: 0.5;
    }

    &:active {
      transform: translateX(0);
    }

    .btn-icon {
      display: flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      color: var(--el-text-color-regular);
      transition: all 0.3s;
    }

    .btn-label {
      display: block;
      overflow: hidden;
      font-size: 10px;
      font-weight: 500;
      line-height: 1.3;
      color: var(--el-text-color-regular);
      text-align: center;
      transition: all 0.3s;
    }

    .btn-badge {
      position: absolute;
      top: 4px;
      right: 4px;
      z-index: 1;
      padding: 2px 6px;
      font-size: 10px;
      font-weight: 600;
      line-height: 1;
      color: #fff;
      background-color: var(--el-color-danger);
      border-radius: 10px;
    }

    .btn-dot {
      position: absolute;
      top: 6px;
      right: 6px;
      z-index: 1;
      width: 6px;
      height: 6px;
      background-color: var(--el-color-danger);
      border-radius: 50%;
    }
  }
</style>
