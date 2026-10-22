<template>
  <ElDialog
    :model-value="visible"
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-press-escape="!payLoading"
    width="min(740px, calc(100vw - 28px))"
    align-center
    class="pay-dialog"
    @close="handleCancel"
  >
    <div class="pay-content">
      <header class="pay-header">
        <div><h2>收银台</h2><p>订单收款</p></div>
        <button type="button" aria-label="关闭" @click="handleCancel">×</button>
      </header>

      <section class="order-meta">
        <div
          ><span>订单号：</span><strong>{{ orderNo }}</strong></div
        >
        <div
          ><span>商品数量：</span><strong>{{ cart.sum }} 件</strong></div
        >
        <div
          ><span>下单时间：</span><strong>{{ orderTime }}</strong></div
        >
        <div
          ><span>收银员：</span><strong>{{ cashierName }}</strong></div
        >
      </section>

      <section class="amount-card">
        <span>应收金额</span>
        <strong>￥{{ formatMoney(cart.total) }}</strong>
        <small v-if="pricingDiscountAmount > 0 || cart.discountRate">
          正常售价合计 ￥{{ formatMoney(cartOriginalTotal) }}
          <template v-if="pricingDiscountAmount > 0">
            · 活动/会员优惠 ￥{{ formatMoney(pricingDiscountAmount) }}
          </template>
          <template v-if="cart.discountRate"> · 人工{{ discountText }}</template>
        </small>
      </section>

      <section class="payment-section">
        <div class="section-heading">
          <h3>选择支付方式</h3>
          <span>请选择一种支付方式完成收款</span>
        </div>
        <div class="payment-grid">
          <button
            v-for="method in paymentMethods"
            :key="method.value"
            class="payment-card"
            :class="[method.value, { active: payMethod === method.value }]"
            :style="{ backgroundImage: `url(${method.background})` }"
            type="button"
            @click="selectPayment(method.value)"
          >
            <span v-if="payMethod === method.value" class="selected-mark">✓</span>
            <div>
              <strong>{{ method.label }}</strong>
              <span>{{ method.description }}</span>
              <small v-if="method.value === 'balance' && cart.member">
                可用余额 ￥{{ formatMoney(cart.member.surplusMoney || 0) }}
              </small>
            </div>
            <img :src="method.illustration" alt="" />
          </button>
        </div>
        <!-- 扫码支付（被扫）：收银员扫顾客付款码 -->
        <div v-if="isScanMethod" class="scan-pay-box">
          <label>顾客付款码</label>
          <ElInput
            ref="authCodeInput"
            v-model="authCode"
            placeholder="请用扫码枪扫描顾客付款码，或手动输入后回车"
            clearable
            :disabled="payLoading"
            @keyup.enter="handleConfirmPayment"
          />
          <small
            >请顾客打开{{ payMethod === 'wechat' ? '微信' : '支付宝' }}「付款码」对准扫码枪</small
          >
        </div>
        <div v-if="balanceInsufficient" class="payment-warning">
          会员余额不足，还差 ￥{{
            formatMoney(cart.total - Number(cart.member?.surplusMoney || 0))
          }}
        </div>
      </section>

      <footer class="pay-footer">
        <div class="footer-actions">
          <ElButton size="large" @click="handleCancel">取消</ElButton>
          <ElButton
            v-auth="settlePermissions"
            type="primary"
            size="large"
            :loading="payLoading"
            :disabled="confirmDisabled"
            @click="handleConfirmPayment"
          >
            确认收款&nbsp; ￥{{ formatMoney(cart.total) }}
          </ElButton>
        </div>
      </footer>
    </div>
  </ElDialog>
</template>

<script setup lang="ts">
  import { ref, computed, watch, inject, nextTick } from 'vue'
  import { ElDialog, ElButton, ElInput, ElMessage } from 'element-plus'
  import { formatMoney } from '@/utils/cashier/utils'
  import {
    fetchCashierDirectOrder,
    fetchCashierSettleSession,
    fetchCashierScanPay
  } from '@/api/cashier'
  import { fetchPricingQuote } from '@/api/pricing'
  import { useUserStore } from '@/store/modules/user'
  import payBalance from '@/assets/images/cashier/pay-balance.png'
  import payCash from '@/assets/images/cashier/pay-cash.png'
  import payWechat from '@/assets/images/cashier/pay-wechat.png'
  import payAlipay from '@/assets/images/cashier/pay-alipay.png'
  import payCardBalance from '@/assets/images/cashier/pay-card-balance.png'
  import payCardCash from '@/assets/images/cashier/pay-card-cash.png'
  import payCardWechat from '@/assets/images/cashier/pay-card-wechat.png'
  import payCardAlipay from '@/assets/images/cashier/pay-card-alipay.png'

  const cashierStoreId = inject<import('vue').Ref<number | undefined>>('cashierStoreId')
  // Props
  const props = defineProps<{
    visible: boolean
    tableId?: number
    sessionNo?: string
  }>()

  // Emits
  const emit = defineEmits(['cancel', 'success'])

  // 注入数据
  const { cart } = inject<any>('cart')

  type PayMethod = 'balance' | 'cash' | 'wechat' | 'alipay'
  const userStore = useUserStore()
  const orderNo = ref('')
  const orderTime = ref('')
  const settlePermissions = [
    'restaurant:order:settle',
    'operations:direct-cashier:settle',
    'operations:table-cashier:settle'
  ]
  const paymentMethods: Array<{
    value: PayMethod
    label: string
    description: string
    illustration: string
    background: string
  }> = [
    {
      value: 'wechat',
      label: '微信扫码',
      description: '扫描顾客微信付款码收款',
      illustration: payWechat,
      background: payCardWechat
    },
    {
      value: 'alipay',
      label: '支付宝扫码',
      description: '扫描顾客支付宝付款码收款',
      illustration: payAlipay,
      background: payCardAlipay
    },
    {
      value: 'balance',
      label: '用户余额',
      description: '使用会员账户余额完成付款',
      illustration: payBalance,
      background: payCardBalance
    },
    {
      value: 'cash',
      label: '现金支付',
      description: '支持人民币现金收款',
      illustration: payCash,
      background: payCardCash
    }
  ]
  const payMethod = ref<PayMethod>('cash')
  const cashierName = computed(() => {
    const info = userStore.info as any
    return info.nickname || info.realName || info.username || '收银员'
  })
  const balanceInsufficient = computed(
    () =>
      payMethod.value === 'balance' &&
      (!cart.member || Number(cart.member.surplusMoney || 0) < Number(cart.total || 0))
  )

  // 扫码支付（被扫）：顾客付款码，由扫码枪读取，一次性
  const authCode = ref('')
  const authCodeInput = ref<InstanceType<typeof ElInput>>()
  // 是否为扫码支付方式（微信/支付宝被扫）
  const isScanMethod = computed(() => payMethod.value === 'wechat' || payMethod.value === 'alipay')
  // 确认收款按钮禁用：余额不足或扫码未录入付款码
  const confirmDisabled = computed(() => {
    if (balanceInsufficient.value) return true
    if (isScanMethod.value) {
      if (!authCode.value.trim()) return true
    }
    return false
  })

  // 实收金额
  const actualPayment = ref(0)

  // 找零
  const change = computed(() => {
    const diff = actualPayment.value - cart.total
    return diff > 0 ? diff : 0
  })

  // 计算原价总额（不含折扣和赠菜）
  const cartOriginalTotal = computed(() => {
    if (quotedListAmount.value > 0) return quotedListAmount.value.toFixed(2)
    let total = 0
    cart.commodity.forEach((item: any) => {
      if (!item.isGift) {
        total += item.number * item.price
      }
    })
    return total.toFixed(2)
  })

  // 折扣文字
  const discountText = computed(() => {
    if (!cart.discountRate || cart.discountRate >= 1) return '无折扣'
    const discount = (cart.discountRate * 10).toFixed(1)
    return `${discount}折`
  })

  // 加载状态
  const payLoading = ref(false)
  // 网络重试复用同一个键，避免余额/现金重复收款生成两笔订单。
  const directOrderIdempotencyKey = ref(crypto.randomUUID())
  const pricingDiscountAmount = ref(0)
  const quotedListAmount = ref(0)

  const refreshPricingQuote = async () => {
    pricingDiscountAmount.value = 0
    quotedListAmount.value = 0
    if (props.sessionNo || !cashierStoreId?.value || !cart.commodity?.length) return
    const items = cart.commodity
      .map((item: any, index: number) => ({ item, index }))
      .filter(({ item }: any) => !item.isGift)
    if (!items.length) {
      cart.total = 0
      return
    }
    try {
      const quote = await fetchPricingQuote({
        storeId: cashierStoreId.value,
        userId: cart.member?.id,
        channel: 'CASHIER',
        items: items.map(({ item, index }: any) => ({
          lineKey: String(index),
          dishId: item.id,
          quantity: item.number,
          specExtraPrice: Array.isArray(item.selectedSpecs)
            ? item.selectedSpecs.reduce(
                (sum: number, spec: any) => sum + Number(spec.priceAdjust || 0),
                0
              )
            : 0
        }))
      })
      quote.lines.forEach((line) => {
        const item = cart.commodity[Number(line.lineKey)]
        if (!item) return
        item.price = Number(line.unitSellingPrice)
        item.lineListAmount = Number(line.lineListAmount)
        item.lineDiscountAmount = Number(line.lineDiscountAmount)
        item.linePayableAmount = Number(line.linePayableAmount)
        item.pricingAdjustments = line.adjustments
        item.availableCampaigns = line.availableCampaigns || []
      })
      quotedListAmount.value = Number(quote.listAmount)
      pricingDiscountAmount.value = Number(quote.campaignDiscountAmount)
      const payable = Number(quote.payableAmount)
      cart.total = Number((cart.discountRate ? payable * cart.discountRate : payable).toFixed(2))
      actualPayment.value = cart.total
    } catch (error: any) {
      ElMessage.error(error?.message || '服务端试价失败，请刷新菜品后重试')
    }
  }

  const selectPayment = (method: PayMethod) => {
    payMethod.value = method
    if (method === 'balance' && !cart.member) ElMessage.warning('余额支付需要先选择会员')
    if (method === 'wechat' || method === 'alipay') {
      // 选中扫码方式后自动聚焦输入框，方便扫码枪直接录入
      nextTick(() => authCodeInput.value?.focus())
    }
  }

  // 余额支付确认
  const handleBalanceConfirm = async () => {
    if (payLoading.value) return
    if (!cashierStoreId?.value) {
      ElMessage.warning('请先选择收银门店')
      return
    }
    if (!cart.member || !cart.member.id) {
      ElMessage.warning('请先选择会员')
      return
    }

    // 检查余额是否充足
    if (!cart.member.surplusMoney || cart.member.surplusMoney < cart.total) {
      ElMessage.warning('会员余额不足，请选择其他支付方式')
      return
    }

    payLoading.value = true
    try {
      // 构建订单数据
      const orderData = {
        idempotencyKey: directOrderIdempotencyKey.value,
        userId: cart.member.id,
        tableId: props.tableId,
        sessionNo: props.sessionNo,
        orderType: 0, // 在线点餐
        totalPrice: cart.total,
        discountRate: cart.discountRate || null,
        storeId: cashierStoreId?.value,
        paymentType: 6, // 余额支付
        cartItems: cart.commodity.map((item: any) => {
          // 计算规格额外价格
          let extraPrice = 0
          if (item.selectedSpecs && Array.isArray(item.selectedSpecs)) {
            extraPrice = item.selectedSpecs.reduce((sum: number, spec: any) => {
              return sum + (spec.priceAdjust || 0)
            }, 0)
          }

          // basePrice 是菜品的基础价格（不含规格）
          // 优先使用活动价，如果没有活动价则使用原价
          const basePrice = item.salePrice

          return {
            dishId: item.id,
            dishName: item.dishName || item.name,
            price: item.price, // 商品总价（包含规格）
            quantity: item.number,
            specText: item.specText || '',
            categoryId: item.categoryId,
            categoryName: item.categoryName,
            basePrice: basePrice, // 菜品基础价格（活动价优先，否则原价）
            extraPrice: extraPrice, // 规格额外价格
            isGift: item.isGift ? 1 : 0
          }
        }),
        note: cart.note || '',
        printReceipt: false
      }
      let res: any
      if (props.sessionNo) {
        // 桌位收银：桌位结算（折扣、备注取自功能区域 cart.discountRate / cart.note）
        res = await fetchCashierSettleSession({
          sessionNo: props.sessionNo,
          paymentType: 6, // 余额
          userId: cart.member.id,
          discountRate: cart.discountRate ?? undefined,
          note: cart.note || undefined,
          printReceipt: false
        })
      } else {
        res = await fetchCashierDirectOrder(orderData)
      }
      // 检查返回结果
      if (!res) {
        throw new Error(props.sessionNo ? '结算失败，服务器无响应' : '订单创建失败，服务器无响应')
      }
      if (!res.id) {
        throw new Error(props.sessionNo ? '结算失败' : '订单创建失败')
      }

      ElMessage.success(
        props.sessionNo
          ? `余额支付成功！订单号：${res.orderNo || res.id}，桌位已结账`
          : `余额支付成功！订单号：${res.orderNo || res.id}`
      )
      handlePaySuccess(res)
    } catch (error: any) {
      ElMessage.error(error.message || error.msg || '余额支付失败')
    } finally {
      payLoading.value = false
    }
  }

  const handleConfirmPayment = () => {
    if (payMethod.value === 'balance') {
      handleBalanceConfirm()
    } else if (isScanMethod.value) {
      handleScanConfirm()
    } else {
      actualPayment.value = cart.total
      handleCashConfirm()
    }
  }

  // 构建下单的购物车明细（扫码/现金通用）
  const buildCartItems = () =>
    cart.commodity.map((item: any) => {
      let extraPrice = 0
      if (item.selectedSpecs && Array.isArray(item.selectedSpecs)) {
        extraPrice = item.selectedSpecs.reduce(
          (sum: number, spec: any) => sum + (spec.priceAdjust || 0),
          0
        )
      }
      return {
        dishId: item.id,
        dishName: item.dishName || item.name,
        price: item.price,
        quantity: item.number,
        specText: item.specText || '',
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        basePrice: item.salePrice, // 菜品基础价格
        extraPrice, // 规格额外价格
        isGift: item.isGift ? 1 : 0
      }
    })

  // 扫码支付确认（被扫：收银员扫顾客付款码）
  const handleScanConfirm = async () => {
    if (payLoading.value) return
    if (!cashierStoreId?.value) {
      ElMessage.warning('请先选择收银门店')
      return
    }
    const code = authCode.value.trim()
    if (!code) {
      ElMessage.warning('请扫描顾客付款码')
      authCodeInput.value?.focus()
      return
    }

    payLoading.value = true
    try {
      const paymentType = payMethod.value === 'wechat' ? 1 : 2
      const res: any = props.sessionNo
        ? await fetchCashierSettleSession({
            sessionNo: props.sessionNo,
            paymentType,
            authCode: code,
            userId: cart.member?.id,
            discountRate: cart.discountRate ?? undefined,
            note: cart.note || undefined,
            printReceipt: false
          })
        : await fetchCashierScanPay({
            idempotencyKey: directOrderIdempotencyKey.value,
            userId: cart.member?.id,
            tableId: props.tableId,
            orderType: 0,
            totalPrice: cart.total,
            storeId: cashierStoreId.value,
            paymentType,
            authCode: code,
            cartItems: buildCartItems(),
            note: cart.note || '',
            printReceipt: false
          })
      const order = res?.order || res
      if (!order?.id) {
        throw new Error('支付失败')
      }
      ElMessage.success(
        `${payMethod.value === 'wechat' ? '微信' : '支付宝'}收款成功！订单号：${order.orderNo || order.id}${props.sessionNo ? '，桌位已结账' : ''}`
      )
      handlePaySuccess(order)
    } catch (error: any) {
      // 付款码一次性，失败后清空以便重新扫码
      authCode.value = ''
      nextTick(() => authCodeInput.value?.focus())
      ElMessage.error(error.message || error.msg || '扫码支付失败，请重试')
    } finally {
      payLoading.value = false
    }
  }

  // 取消
  const handleCancel = () => {
    if (payLoading.value) return
    resetState()
    emit('cancel')
  }

  // 重置状态
  const resetState = () => {
    payMethod.value = 'cash'
    actualPayment.value = 0
    authCode.value = ''
    directOrderIdempotencyKey.value = crypto.randomUUID()
  }

  // 支付成功
  const handlePaySuccess = (order: any) => {
    emit('success', { orderId: order?.id, storeId: order?.storeId ?? cashierStoreId?.value })
    resetState()
  }

  // 现金确认支付
  const handleCashConfirm = async () => {
    if (payLoading.value) return
    if (!cashierStoreId?.value) {
      ElMessage.warning('请先选择收银门店')
      return
    }
    if (actualPayment.value < cart.total) {
      ElMessage.warning('实收金额不能小于应收金额')
      return
    }

    payLoading.value = true
    try {
      // 构建订单数据
      const orderData = {
        idempotencyKey: directOrderIdempotencyKey.value,
        userId: cart.member?.id,
        tableId: props.tableId,
        sessionNo: props.sessionNo,
        orderType: 0, // 在线点餐
        totalPrice: cart.total,
        storeId: cashierStoreId?.value,
        discountRate: cart.discountRate || null,
        actualAmount: actualPayment.value, // 实收金额
        paymentType: 3, // 现金支付
        cartItems: cart.commodity.map((item: any) => {
          // 计算规格额外价格
          let extraPrice = 0
          if (item.selectedSpecs && Array.isArray(item.selectedSpecs)) {
            extraPrice = item.selectedSpecs.reduce((sum: number, spec: any) => {
              return sum + (spec.priceAdjust || 0)
            }, 0)
          }

          // basePrice 是菜品的基础价格（不含规格）
          // 优先使用活动价，如果没有活动价则使用原价
          const basePrice = item.salePrice

          return {
            dishId: item.id,
            dishName: item.dishName || item.name,
            price: item.price, // 商品总价（包含规格）
            quantity: item.number,
            specText: item.specText || '',
            categoryId: item.categoryId,
            categoryName: item.categoryName,
            basePrice: basePrice, // 菜品基础价格（活动价优先，否则原价）
            extraPrice: extraPrice, // 规格额外价格
            isGift: item.isGift ? 1 : 0
          }
        }),
        note: cart.note || '',
        printReceipt: false
      }

      let res: any
      if (props.sessionNo) {
        // 桌位收银：桌位结算（折扣、备注取自功能区域 cart.discountRate / cart.note）
        res = await fetchCashierSettleSession({
          sessionNo: props.sessionNo,
          paymentType: 3, // 现金
          actualAmount: actualPayment.value,
          discountRate: cart.discountRate ?? undefined,
          note: cart.note || undefined,
          printReceipt: false
        })
      } else {
        // 无桌位：直接下单并已支付
        res = await fetchCashierDirectOrder(orderData)
      }

      if (!res) {
        throw new Error(props.sessionNo ? '结算失败，服务器无响应' : '订单创建失败，服务器无响应')
      }
      if (!res.id) {
        throw new Error(props.sessionNo ? '结算失败' : '订单创建失败')
      }

      const changeAmount = change.value
      let message = props.sessionNo ? '桌位结算成功！' : '支付成功！'
      if (changeAmount > 0) {
        message += ` 找零：￥${formatMoney(changeAmount)}`
      }
      message += ` 订单号：${res.orderNo || res.id}`

      ElMessage.success(message)
      handlePaySuccess(res)
    } catch (error: any) {
      console.error('现金支付失败:', error)
      ElMessage.error(error.message || error.msg || '支付失败')
    } finally {
      payLoading.value = false
    }
  }

  // 监听弹窗显示
  watch(
    () => props.visible,
    (val) => {
      if (val) {
        actualPayment.value = cart.total
        payMethod.value = 'cash'
        authCode.value = ''
        const now = new Date()
        const two = (value: number) => String(value).padStart(2, '0')
        const datePart = `${now.getFullYear()}${two(now.getMonth() + 1)}${two(now.getDate())}`
        const timePart = `${two(now.getHours())}${two(now.getMinutes())}${two(now.getSeconds())}`
        orderNo.value = `NO.${datePart}${timePart}`
        orderTime.value = `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(
          now.getDate()
        )} ${two(now.getHours())}:${two(now.getMinutes())}`
        void refreshPricingQuote()
      }
    }
  )
</script>

<style scoped lang="scss">
  :deep(.pay-dialog) {
    --el-dialog-padding-primary: 0px;

    padding: 0 !important;
    overflow: hidden;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 24px;
    box-shadow: 0 30px 90px rgb(15 38 86 / 24%);

    .el-dialog__header,
    .el-dialog__footer {
      display: none;
    }

    .el-dialog__body {
      padding: 0 !important;
      margin: 0;
      background: var(--el-bg-color);
    }
  }

  .pay-content {
    display: block;
    padding: 0 20px;
    overflow: visible;
    color: var(--el-text-color-primary);
  }

  .pay-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding-top: 12px;
    margin-bottom: 10px;

    h2,
    p {
      margin: 0;
    }

    h2 {
      font-size: 24px;
      line-height: 1.15;
    }

    p {
      margin-top: 3px;
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }

    button {
      width: 34px;
      height: 34px;
      padding: 0;
      font-size: 24px;
      line-height: 30px;
      color: var(--el-text-color-secondary);
      cursor: pointer;
      background: var(--el-fill-color-light);
      border: 0;
      border-radius: 50%;
    }
  }

  .order-meta {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px 36px;
    padding: 10px 14px;
    margin-bottom: 10px;
    background: var(--el-fill-color-light);
    border-radius: 14px;

    > div {
      display: flex;
      gap: 8px;
      min-width: 0;
      font-size: 12px;
    }

    span {
      min-width: 64px;
      color: var(--el-text-color-secondary);
    }

    strong {
      overflow: hidden;
      font-weight: 500;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .amount-card {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 96px;
    padding: 14px 20px;
    margin-bottom: 14px;
    overflow: hidden;
    background:
      radial-gradient(circle at 15% 130%, rgb(70 128 255 / 19%), transparent 47%),
      radial-gradient(circle at 95% -30%, rgb(116 167 255 / 22%), transparent 44%),
      linear-gradient(135deg, var(--el-color-primary-light-9), var(--el-color-primary-light-8));
    border: 1px solid color-mix(in srgb, var(--el-color-primary) 18%, transparent);
    border-radius: 16px;

    span {
      font-size: 14px;
      font-weight: 600;
    }

    strong {
      margin-top: 1px;
      font-size: 38px;
      line-height: 1.15;
      color: var(--el-color-primary);
      letter-spacing: 1px;
    }

    small {
      margin-top: 2px;
      color: var(--el-text-color-secondary);
    }
  }

  .payment-section {
    .section-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;

      h3 {
        margin: 0;
        font-size: 16px;
      }

      span {
        font-size: 13px;
        color: var(--el-text-color-secondary);
      }
    }
  }

  .payment-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 9px;
  }

  .payment-card {
    position: relative;
    display: grid;
    grid-template-columns: 1fr 112px;
    align-items: center;
    min-height: 84px;
    padding: 10px 8px 10px 16px;
    overflow: hidden;
    color: var(--el-text-color-primary);
    text-align: left;
    cursor: pointer;
    background-color: var(--el-bg-color);
    background-repeat: no-repeat;
    background-position: center;
    background-clip: border-box;
    background-origin: border-box;
    background-size: 118% auto;
    border: 2px solid transparent;
    border-radius: 16px;
    transition: 0.2s ease;

    &.balance {
      background-color: #f5f1ff;
    }

    &.cash {
      background-color: #fff6e9;
    }

    &.wechat {
      background-color: #eafaf0;
    }

    &.alipay {
      background-color: #e9f2ff;
    }

    > div {
      z-index: 1;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    strong {
      font-size: 16px;
    }

    div > span,
    small {
      font-size: 10px;
      color: var(--el-text-color-secondary);
    }

    small {
      color: var(--el-color-primary);
    }

    img {
      width: 110px;
      height: 70px;
      object-fit: contain;
    }

    .selected-mark {
      position: absolute;
      top: 7px;
      right: 7px;
      z-index: 2;
      width: 22px;
      height: 22px;
      font-size: 13px;
      font-weight: 700;
      line-height: 22px;
      color: #fff;
      text-align: center;
      background: var(--el-color-primary);
      border-radius: 50%;
    }

    &:hover,
    &.active {
      border-color: var(--el-color-primary);
      box-shadow: 0 10px 24px color-mix(in srgb, var(--el-color-primary) 14%, transparent);
      transform: translateY(-1px);
    }
  }

  .scan-pay-box {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px 14px;
    margin-top: 10px;
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 12px;

    label {
      font-size: 13px;
      font-weight: 600;
    }

    small {
      font-size: 11px;
      color: var(--el-text-color-secondary);
    }

    :deep(.el-input__wrapper) {
      border-radius: 10px;
    }
  }

  .payment-warning {
    padding: 7px 10px;
    margin-top: 8px;
    font-size: 11px;
    color: var(--el-color-danger);
    background: var(--el-color-danger-light-9);
    border-radius: 9px;
  }

  .pay-footer {
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
    padding-top: 12px;
    margin-top: 12px;
    border-top: 1px solid var(--el-border-color-lighter);

    .footer-actions {
      display: grid;
      grid-template-columns: 130px minmax(240px, 1fr);
      gap: 9px;
    }

    .el-button {
      height: 44px;
      margin: 0;
      font-size: 14px;
      border-radius: 10px;
    }
  }

  @media (height <= 620px) and (width > 700px) {
    .pay-content {
      max-height: calc(100vh - 28px);
      overflow: hidden auto;
    }
  }

  @media (width <= 700px) {
    .pay-content {
      max-height: calc(100vh - 28px);
      padding: 14px;
      overflow: hidden auto;
    }

    .order-meta,
    .payment-grid {
      grid-template-columns: 1fr;
    }

    .amount-card {
      min-height: 86px;

      strong {
        font-size: 32px;
      }
    }

    .payment-card {
      grid-template-columns: 1fr 86px;
      min-height: 76px;

      img {
        width: 84px;
        height: 60px;
      }
    }

    .pay-footer {
      flex-direction: column;
      align-items: stretch;

      .footer-actions {
        grid-template-columns: 1fr 1.5fr;
      }
    }
  }
</style>
