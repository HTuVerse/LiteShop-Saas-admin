<template>
  <div class="table-cashier-panel">
    <!-- 收银主体区域 -->
    <div class="cashier-main">
      <!-- 左侧区域 -->
      <div class="left-side">
        <!-- 购物车区域 -->
        <div class="cart-panel">
          <Cart @clearing="handleClearing" @back="handleBack" />
        </div>

        <!-- 功能区域 -->
        <div class="function-panel">
          <FunctionArea />
        </div>
      </div>

      <!-- 右侧商品区域 -->
      <div class="right-side">
        <Commodity ref="commodityRef" />
      </div>
    </div>

    <!-- 支付弹窗 -->
    <Pay
      :visible="payVisible"
      :table-id="table.id"
      :session-no="session?.sessionNo"
      @cancel="payVisible = false"
      @success="handlePaySuccess"
    />

    <!-- 退菜弹窗（桌位会话模式） -->
    <RefundDishDialog
      :visible="refundDishVisible"
      :order-id="currentOrderId"
      @close="refundDishVisible = false"
      @success="handleRefundSuccess"
    />
  </div>
</template>

<script setup lang="ts">
  import { useUserStore } from '@/store/modules/user'
  const userStore = useUserStore()
  const scopeKey = userStore.scopeKey
  import { computed, onBeforeUnmount, provide, reactive, ref, watch } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { onBeforeRouteLeave } from 'vue-router'
  import Cart from '@views/cashier/directCashier/components/Cart.vue'
  import FunctionArea from '@views/cashier/directCashier/components/FunctionArea.vue'
  import Commodity from '@views/cashier/directCashier/components/Commodity.vue'
  import Pay from '@views/cashier/directCashier/components/Pay.vue'
  import RefundDishDialog from '@views/cashier/directCashier/components/RefundDishDialog.vue'
  import { fetchGetOrderBySession } from '@/api/dish-manage'
  import {
    fetchCreateOrder,
    fetchCashierProxyOrder,
    fetchAddItemsToOrder,
    fetchMarkOrderItemsGift,
    fetchSharedCart,
    fetchAddSharedCartItem,
    fetchUpdateSharedCartItem,
    fetchRemoveSharedCartItem,
    fetchClearSharedCart,
    fetchSessionDetail,
    fetchCashierMemberById
  } from '@/api/cashier'
  import { fetchPricingQuote } from '@/api/pricing'
  import { formatTime, generateUUID, normalizeOrderItemForCart } from '@utils/cashier/utils'
  import { connectTableSessionSocket } from '../useTableSessionSocket'

  // 定义 props
  const props = defineProps<{
    table: any
    session: any
  }>()

  // 定义事件
  const emit = defineEmits(['back', 'refresh'])

  // 支付弹窗显示状态
  const payVisible = ref(false)

  // 刷新状态
  const refreshing = ref(false)

  // 当前会话是否已有订单（桌位模式：有订单才允许点「结算」）
  const sessionHasOrder = ref(false)

  // 提交订单/加菜 loading
  const submitOrderLoading = ref(false)

  // 请求失败重试时复用同一个键，服务端会返回第一次成功创建的订单。
  const createOrderIdempotencyKey = ref(generateUUID())

  // 当前会话订单ID（用于退菜等）
  const currentOrderId = ref<string | number | null>(null)
  const onlinePending = ref(false)

  // 退菜弹窗显示
  const refundDishVisible = ref(false)

  // 会员信息
  const member = ref<any>(null)
  const activeSessionToken = ref('')

  // 商品组件引用
  const commodityRef = ref()

  // 购物车数据
  const cart = reactive({
    uuid: '',
    commodity: [] as any[],
    sum: 0,
    total: 0,
    discountRate: null as number | null,
    note: '',
    member: null as any,
    time: null as string | null,
    tableId: props.table.id,
    sessionNo: props.session?.sessionNo || ''
  })

  // 是否需要默认选中用户
  const isDefaultMember = false

  // 挂单列表
  const pending = ref<any[]>([])

  // 从 localStorage 加载挂单数据
  const loadPending = () => {
    const data = localStorage.getItem(`cashier-pending-table-${scopeKey}-${props.table.id}`)
    if (data) {
      try {
        pending.value = JSON.parse(data)
      } catch {
        pending.value = []
      }
    }
  }
  loadPending()

  // 保存挂单数据到 localStorage
  const savePending = () => {
    localStorage.setItem(
      `cashier-pending-table-${scopeKey}-${props.table.id}`,
      JSON.stringify(pending.value)
    )
  }

  // 格式化日期时间
  const formatDateTime = (dateTime: string) => {
    if (!dateTime) return ''
    const date = new Date(dateTime)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${month}-${day} ${hours}:${minutes}`
  }

  // 加载桌位订单数据：统一走 fetchGetOrderBySession
  let orderRequestId = 0
  const loadTableOrder = async (silent = false) => {
    if (!props.session?.sessionNo) {
      return
    }

    const requestId = ++orderRequestId
    refreshing.value = true
    try {
      const res = (await fetchGetOrderBySession(props.session.sessionNo)) as
        | (Api.Order.OrderDetailVO & {
            operatorName?: string
            dishChanges?: Array<{
              id: string | number
              changeType: number
              dishName?: string
              quantity: number
              operatorName?: string
            }>
          })
        | null
      if (requestId !== orderRequestId) return
      if (res && res.id) {
        const isOnline = ['线上支付', 'ONLINE', '1'].includes(String(res.paymentMode || ''))
        onlinePending.value = isOnline && !['已支付', '1'].includes(String(res.paymentStatus || ''))
        sessionHasOrder.value = true
        currentOrderId.value = onlinePending.value ? null : res.id
        if (onlinePending.value) cart.commodity = []
        if (res.userId && String(member.value?.id) !== String(res.userId)) {
          try {
            member.value = await fetchCashierMemberById(res.userId)
          } catch {
            member.value = { id: res.userId, nickname: res.username || `会员${res.userId}` }
          }
          if (requestId !== orderRequestId) return
        } else if (!res.userId) {
          member.value = null
        }
        cart.member = member.value
        const list = res.items || []
        const unsubmitted = cart.commodity.filter((item: any) => item.fromOrder !== true)
        cart.commodity = onlinePending.value
          ? []
          : [...list.map(normalizeOrderItemForCart), ...unsubmitted]
        if (list.length > 0) {
          cart.discountRate = res.discountRate ?? null
          cart.note = res.note || ''
          cart.uuid = generateUUID()
          cart.sessionNo = props.session.sessionNo
          if (!silent) ElMessage.success('订单数据加载成功')
        }
      } else {
        onlinePending.value = false
        sessionHasOrder.value = false
        currentOrderId.value = null
      }
    } catch (error: any) {
      if (requestId !== orderRequestId) return
      console.error('加载订单数据失败:', error)
      const noOrder =
        error?.response?.status === 404 || String(error?.message || '').includes('暂无订单')
      if (noOrder) {
        onlinePending.value = false
        sessionHasOrder.value = false
        currentOrderId.value = null
      } else if (!silent) {
        ElMessage.warning('加载桌位订单失败，请稍后重试')
      }
    } finally {
      if (requestId === orderRequestId) refreshing.value = false
    }
  }

  // 刷新订单
  const handleRefresh = () => {
    loadTableOrder()
  }

  // 返回
  const handleBack = () => {
    if (cart.commodity.length > 0) {
      ElMessageBox.confirm('当前桌位有未提交菜品，返回后仍保留在该桌会话，确定返回吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
        .then(() => {
          emit('back')
        })
        .catch(() => {
          // 取消
        })
    } else {
      emit('back')
    }
  }

  // 切换商品赠送状态：桌位模式且来自后端订单时调后端接口，否则仅本地切换；有未提交商品时不允许操作后端赠菜
  const toggleGiftStatus = async (index: number) => {
    const item = cart.commodity[index]
    if (!item) return
    const orderItemId = item.orderItemId != null ? item.orderItemId : undefined
    const isFromOrder =
      item.fromOrder === true && orderItemId != null && orderItemId > 0 && currentOrderId.value
    if (isFromOrder) {
      const hasUnsubmitted = cart.commodity.some((i: any) => i.fromOrder !== true)
      if (hasUnsubmitted) {
        ElMessage.warning('请先提交订单后再操作赠菜')
        return
      }
      try {
        await fetchMarkOrderItemsGift({
          orderId: currentOrderId.value!,
          sessionNo: props.session?.sessionNo,
          orderItemIds: [orderItemId],
          isGift: item.isGift ? 0 : 1
        })
        ElMessage.success(item.isGift ? '已取消赠菜' : '已标记为赠菜')
        await loadTableOrder()
      } catch (e: any) {
        ElMessage.error(e?.message || e?.msg || '操作失败')
      }
    } else {
      item.isGift = item.isGift ? 0 : 1
      ElMessage.success(item.isGift ? '已标记为赠菜' : '已取消赠菜')
    }
  }

  // 设置整单折扣
  const setDiscount = (discountRate: number | null) => {
    cart.discountRate = discountRate
  }

  // 更新会员
  const updateMember = (value: any) => {
    member.value = value
    cart.member = value
  }

  // 未提交菜品使用桌台共享购物车，其他顾客和收银端可立即看到变更。
  let sharedCartRequestId = 0
  const refreshSharedCart = async () => {
    const sessionNo = props.session?.sessionNo
    const token = activeSessionToken.value
    if (!sessionNo || !token) return
    const requestId = ++sharedCartRequestId
    try {
      const lines = await fetchSharedCart(sessionNo, token)
      if (requestId !== sharedCartRequestId || props.session?.sessionNo !== sessionNo) return
      if (onlinePending.value) return
      const submitted = cart.commodity.filter((item: any) => item.fromOrder === true)
      const existing = new Map(cart.commodity.map((item: any) => [item.cartItemId, item]))
      cart.commodity = [
        ...submitted,
        ...lines.map((line) => ({
          id: line.dishId,
          cartItemId: line.cartItemId,
          dishName: line.dishName,
          dishImage: line.dishPics || '',
          categoryId: line.categoryId,
          categoryName: line.categoryName,
          price: Number(line.price),
          salePrice: Number(line.basePrice),
          number: Number(line.quantity),
          specText: line.specText || '',
          specKey: line.specText || '',
          isGift: (existing.get(line.cartItemId) as any)?.isGift || 0,
          fromOrder: false
        }))
      ]
      calculateCart()
    } catch (error: any) {
      ElMessage.error(error?.message || '同步桌位购物车失败')
    }
  }

  const updateCart = async (commodity: any) => {
    if (onlinePending.value) return ElMessage.warning('该桌线上订单待顾客支付，不能继续加购')
    const sessionNo = props.session?.sessionNo
    const token = activeSessionToken.value
    if (!sessionNo || !token) return ElMessage.error('桌位会话尚未就绪，请重试')
    try {
      await fetchAddSharedCartItem(
        {
          sessionNo,
          dishId: commodity.id,
          quantity: commodity.number || 1,
          specText: commodity.specText || '',
          extraPrice: Array.isArray(commodity.selectedSpecs)
            ? commodity.selectedSpecs.reduce(
                (sum: number, spec: any) => sum + Number(spec.priceAdjust || 0),
                0
              )
            : 0,
          userId: userStore.info.userId,
          userName: userStore.info.username || userStore.info.nickname || '收银员'
        },
        token
      )
      await refreshSharedCart()
      ElMessage.success('加购成功')
    } catch (error: any) {
      ElMessage.error(error?.message || '加购失败')
    }
  }

  const deleteCart = async (index: number) => {
    const item = cart.commodity[index]
    const sessionNo = props.session?.sessionNo
    const token = activeSessionToken.value
    if (!item?.cartItemId || !sessionNo || !token) return
    try {
      await fetchRemoveSharedCartItem(sessionNo, item.cartItemId, token)
      await refreshSharedCart()
      ElMessage.success('删除成功')
    } catch (error: any) {
      ElMessage.error(error?.message || '删除失败')
    }
  }

  const updateCartItemNumber = async (index: number, number: number) => {
    const item = cart.commodity[index]
    const sessionNo = props.session?.sessionNo
    const token = activeSessionToken.value
    if (!item?.cartItemId || !sessionNo || !token || item.fromOrder === true) return
    try {
      await fetchUpdateSharedCartItem(sessionNo, item.cartItemId, number, token)
    } catch (error: any) {
      ElMessage.error(error?.message || '修改数量失败')
    } finally {
      await refreshSharedCart()
    }
  }

  // 清空购物车
  const emptyCart = async (isClearing = false) => {
    if (onlinePending.value) return
    if (!isClearing && props.session?.sessionNo && activeSessionToken.value) {
      try {
        await fetchClearSharedCart(props.session.sessionNo, activeSessionToken.value)
      } catch (error: any) {
        ElMessage.error(error?.message || '清空桌位购物车失败')
        return
      }
    }
    if (!isClearing && sessionHasOrder.value) {
      cart.commodity = cart.commodity.filter((item: any) => item.fromOrder === true)
      calculateCart()
      ElMessage.success('已清空未提交的加菜')
      return
    }
    cart.uuid = ''
    cart.commodity = []
    cart.sum = 0
    cart.total = 0
    cart.discountRate = null
    cart.note = ''
    cart.member = null
    cart.time = null
    member.value = null
    cart.sessionNo = props.session?.sessionNo || ''

    if (!isClearing) {
      ElMessage.success('清空成功')
    } else {
      ElMessage.success('结算成功')
    }
  }

  // 计算购物车总价和总数量（与订单一致：有 totalPrice 的订单项按实付小计汇总，避免优惠金额重复计算）
  const calculateCart = () => {
    let sum = 0
    let total = 0

    cart.commodity.forEach((item: any) => {
      sum += item.number
      if (!item.isGift) {
        const linePay =
          item.linePayableAmount != null
            ? Number(item.linePayableAmount)
            : item.totalPrice != null && item.totalPrice >= 0
              ? Number(item.totalPrice)
              : item.number * item.price
        total += linePay
      }
    })

    if (cart.discountRate && cart.discountRate > 0 && cart.discountRate < 1) {
      total = total * cart.discountRate
    }

    cart.sum = sum
    cart.total = parseFloat(total.toFixed(2))
    cart.time = formatTime()
    cart.member = member.value
    cart.sessionNo = props.session?.sessionNo || ''
  }

  let pricingTimer: ReturnType<typeof setTimeout> | undefined
  let pricingSequence = 0
  const pricingSignature = computed(() =>
    JSON.stringify({
      storeId: props.table.storeId,
      memberId: member.value?.id,
      discountRate: cart.discountRate,
      items: cart.commodity
        .map((item: any, index: number) => ({
          index,
          dishId: item.id,
          quantity: item.number,
          isGift: item.isGift,
          fromOrder: item.fromOrder,
          extra: Array.isArray(item.selectedSpecs)
            ? item.selectedSpecs.reduce(
                (sum: number, spec: any) => sum + Number(spec.priceAdjust || 0),
                0
              )
            : 0
        }))
        .filter((item: any) => item.fromOrder !== true)
    })
  )

  const refreshCartPricing = async () => {
    const sequence = ++pricingSequence
    const items = cart.commodity
      .map((item: any, index: number) => ({ item, index }))
      .filter(({ item }) => item.fromOrder !== true && !item.isGift)
    if (!props.table.storeId || !items.length) {
      calculateCart()
      return
    }
    try {
      const quote = await fetchPricingQuote({
        storeId: props.table.storeId,
        userId: member.value?.id,
        channel: 'CASHIER',
        items: items.map(({ item, index }) => ({
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
      if (sequence !== pricingSequence) return
      quote.lines.forEach((line) => {
        const item = cart.commodity[Number(line.lineKey)]
        if (!item || item.fromOrder === true) return
        item.price = Number(line.unitSellingPrice)
        item.lineListAmount = Number(line.lineListAmount)
        item.lineDiscountAmount = Number(line.lineDiscountAmount)
        item.linePayableAmount = Number(line.linePayableAmount)
        item.pricingAdjustments = line.adjustments || []
        item.availableCampaigns = line.availableCampaigns || []
      })
      const submittedTotal = cart.commodity
        .filter((item: any) => item.fromOrder === true && !item.isGift)
        .reduce(
          (sum: number, item: any) => sum + Number(item.linePayableAmount ?? item.totalPrice ?? 0),
          0
        )
      const payable = submittedTotal + Number(quote.payableAmount)
      cart.total = Number((cart.discountRate ? payable * cart.discountRate : payable).toFixed(2))
      cart.sum = cart.commodity.reduce((sum, item: any) => sum + Number(item.number || 0), 0)
    } catch (error: any) {
      if (sequence === pricingSequence)
        ElMessage.error(error?.message || '购物车试价失败，请刷新菜品后重试')
    }
  }

  watch(
    pricingSignature,
    () => {
      pricingSequence++
      if (pricingTimer) clearTimeout(pricingTimer)
      pricingTimer = setTimeout(refreshCartPricing, 120)
    },
    { immediate: true }
  )
  onBeforeUnmount(() => pricingTimer && clearTimeout(pricingTimer))

  // 挂单到购物车
  const pendingToCart = (item: any) => {
    if (onlinePending.value) return ElMessage.warning('该桌线上订单待顾客支付，不能恢复挂单')
    cart.uuid = item.uuid
    cart.commodity = JSON.parse(JSON.stringify(item.commodity))
    cart.sum = item.sum
    cart.total = item.total
    cart.discountRate = item.discountRate || null
    cart.note = item.note || ''
    cart.member = item.member
    cart.time = item.time
    cart.sessionNo = props.session?.sessionNo || ''

    if (item.member) {
      member.value = item.member
    } else {
      member.value = null
    }
  }

  // 添加挂单
  const addPending = () => {
    if (cart.commodity.length === 0) {
      ElMessage.error('请先添加商品')
      return
    }

    calculateCart()

    const existIndex = pending.value.findIndex((item) => item.uuid === cart.uuid)

    if (existIndex !== -1) {
      pending.value[existIndex] = JSON.parse(JSON.stringify(cart))
    } else {
      pending.value.unshift(JSON.parse(JSON.stringify(cart)))
    }

    savePending()

    cart.uuid = ''
    cart.commodity = []
    cart.sum = 0
    cart.total = 0
    cart.discountRate = null
    cart.note = ''
    cart.member = null
    cart.time = null
    member.value = null
    cart.sessionNo = props.session?.sessionNo || ''

    ElMessage.success('挂单成功')
  }

  // 删除挂单
  const deletePending = (index: number) => {
    pending.value.splice(index, 1)
    savePending()
    ElMessage.success('删除成功')
  }

  // 清空挂单
  const emptyPending = () => {
    pending.value = []
    localStorage.removeItem(`cashier-pending-table-${scopeKey}-${props.table.id}`)
    ElMessage.success('清空成功')
  }

  // 将购物车商品转为 createOrder/addItems 所需的 cartItems 格式
  const buildCartItemsForOrder = (items = cart.commodity) => {
    return items.map((item: any) => {
      let extraPrice = 0
      if (item.selectedSpecs && Array.isArray(item.selectedSpecs)) {
        extraPrice = item.selectedSpecs.reduce(
          (sum: number, spec: any) => sum + (spec.priceAdjust || 0),
          0
        )
      }
      const basePrice = item.salePrice ?? item.price
      return {
        cartItemId: item.cartItemId,
        dishId: item.id,
        dishName: item.dishName || item.name,
        price: item.price,
        quantity: item.number,
        specText: item.specText || '',
        categoryId: item.categoryId,
        categoryName: item.categoryName || '',
        basePrice: basePrice ?? item.price,
        extraPrice,
        isGift: item.isGift ? 1 : 0
      }
    })
  }

  // 提交订单（桌位模式）：无订单则创建订单，有订单则加菜。不打开支付弹窗。
  const handleSubmitOrder = async () => {
    if (onlinePending.value) return ElMessage.warning('该桌线上订单待顾客支付')
    if (cart.commodity.length === 0) {
      ElMessage.error('请先添加商品')
      return
    }
    calculateCart()
    const sessionNo = props.session?.sessionNo
    if (!sessionNo) return

    submitOrderLoading.value = true
    try {
      let hasOrder = false
      let existingOrderId: string | number | null = null
      try {
        const orderRes = await fetchGetOrderBySession(sessionNo)
        if (orderRes && orderRes.id) {
          hasOrder = true
          existingOrderId = orderRes.id
        }
      } catch {
        // 该会话暂无订单（后端可能返回 404/500），按无订单处理走创建流程
      }

      if (!hasOrder) {
        const createData = {
          idempotencyKey: createOrderIdempotencyKey.value,
          storeId: props.table.storeId,
          tableId: props.table?.id,
          sessionNo,
          userId: member.value?.id,
          orderType: 0,
          totalPrice: cart.total,
          cartItems: buildCartItemsForOrder(),
          note: cart.note || ''
        }
        // 普通下单的 userId 会被后端替换为当前操作员；选择会员时必须走代客下单接口。
        const createRes = member.value?.id
          ? await fetchCashierProxyOrder({ ...createData, userId: member.value.id })
          : await fetchCreateOrder({ ...createData, userId: undefined })
        createOrderIdempotencyKey.value = generateUUID()
        sessionHasOrder.value = true
        if (createRes?.id) currentOrderId.value = createRes.id
        ElMessage.success('订单已提交，可继续加菜或点击「结算」收银')
        cart.commodity = cart.commodity.filter((item: any) => item.fromOrder === true)
        await loadTableOrder()
      } else if (existingOrderId) {
        // 已提交菜品只读；加菜始终保存在独立的本地行中，因此无需再按总数量猜测差值。
        const unsubmittedItems = cart.commodity.filter((item: any) => item.fromOrder !== true)
        const newItems = buildCartItemsForOrder(unsubmittedItems)
        if (newItems.length > 0) {
          await fetchAddItemsToOrder({
            orderId: existingOrderId,
            sessionNo,
            cartItems: newItems,
            note: cart.note || ''
          })
          ElMessage.success('加菜成功，可继续加菜或点击「结算」收银')
          cart.commodity = cart.commodity.filter((item: any) => item.fromOrder === true)
          await loadTableOrder()
        } else {
          ElMessage.info('当前购物车无新增菜品')
        }
      }
    } catch (e: any) {
      console.error('提交订单/加菜失败:', e)
      ElMessage.error(e?.message || e?.msg || '提交失败')
    } finally {
      submitOrderLoading.value = false
    }
  }

  // 结算：仅打开支付弹窗。桌位模式下必须先有订单（通过「提交订单」）才允许结算。
  const handleClearing = () => {
    if (onlinePending.value) return ElMessage.warning('该桌线上订单由顾客在线支付')
    if (cart.commodity.length === 0) {
      ElMessage.error('请先添加商品')
      return
    }
    calculateCart()
    const sessionNo = props.session?.sessionNo
    if (sessionNo && !sessionHasOrder.value) {
      ElMessage.warning('请先点击「提交订单」或「加菜」后再结算')
      return
    }
    payVisible.value = true
  }

  // 支付成功（桌位已结账，会话结束）
  const handlePaySuccess = () => {
    if (cart.uuid) {
      const pendingIndex = pending.value.findIndex((item) => item.uuid === cart.uuid)
      if (pendingIndex !== -1) {
        pending.value.splice(pendingIndex, 1)
        savePending()
      }
    }
    emptyCart(true)
    payVisible.value = false
    sessionHasOrder.value = false
    currentOrderId.value = null

    // 刷新商品列表
    commodityRef.value?.refreshCommodityList()

    // 通知父组件刷新（桌位列表会更新为空闲）
    emit('refresh')
    emit('back')
  }

  // 提供数据给子组件
  provide('cart', {
    cart,
    updateCart,
    deleteCart,
    updateCartItemNumber,
    emptyCart,
    pendingToCart,
    toggleGiftStatus,
    setDiscount
  })

  provide('member', {
    member,
    updateMember
  })

  provide(
    'cashierStoreId',
    computed(() => props.table.storeId)
  )
  provide('isDefaultMember', isDefaultMember)

  provide('pending', {
    pending,
    addPending,
    deletePending,
    emptyPending
  })

  provide('clearing', handleClearing)

  // 打开退菜弹窗（仅桌位会话且有订单时可用）
  const openRefundDish = () => {
    if (!currentOrderId.value) {
      ElMessage.warning('当前无订单，无法退菜')
      return
    }
    refundDishVisible.value = true
  }

  // 退菜成功：刷新订单
  const handleRefundSuccess = () => {
    loadTableOrder()
  }

  // 提供桌位和会话信息给购物车组件（含是否已有订单、提交订单/加菜、退菜）
  provide('tableInfo', {
    table: props.table,
    session: props.session,
    formatDateTime,
    handleBack,
    handleRefresh,
    refreshing,
    hasOrder: sessionHasOrder,
    onlinePending,
    submitOrderLoading,
    submitOrder: handleSubmitOrder,
    currentOrderId,
    openRefundDish
  })

  // 路由离开拦截
  onBeforeRouteLeave((to, from, next) => {
    if (cart.commodity.length === 0) {
      next()
    } else {
      ElMessageBox.confirm('离开当前页后，未提交菜品仍保留在桌位会话，是否继续？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
        .then(() => {
          next()
        })
        .catch(() => {
          // 取消离开
        })
    }
  })

  let closeSocket: (() => void) | undefined
  let realtimeTimer: ReturnType<typeof setTimeout> | undefined
  const refreshFromSocket = () => {
    if (realtimeTimer) clearTimeout(realtimeTimer)
    realtimeTimer = setTimeout(() => loadTableOrder(true), 100)
  }
  watch(
    () => [props.session?.sessionNo, props.session?.sessionToken],
    ([sessionNo, token]) => {
      closeSocket?.()
      closeSocket = undefined
      activeSessionToken.value = token || ''
      if (!sessionNo) return
      loadTableOrder(true)
      refreshSharedCart()
      if (!token) return
      closeSocket = connectTableSessionSocket(
        sessionNo,
        token,
        (type) => {
          if (type === 'SESSION_ENDED') {
            ElMessage.info('该桌会话已结束')
            emit('back')
            emit('refresh')
          } else if (
            ['CART_ITEM_ADDED', 'CART_ITEM_UPDATED', 'CART_ITEM_REMOVED', 'CART_CLEARED'].includes(
              type
            )
          ) {
            refreshSharedCart()
          } else if (
            [
              'CONNECTED',
              'ORDER_CREATED',
              'ORDER_UPDATED',
              'ORDER_PAID',
              'ORDER_CANCELLED'
            ].includes(type)
          ) {
            refreshFromSocket()
          }
        },
        async () => {
          const detail = await fetchSessionDetail(sessionNo)
          if (!detail.sessionToken) throw new Error('桌位会话票据已失效')
          if (props.session?.sessionNo !== sessionNo) throw new Error('桌位已切换')
          activeSessionToken.value = detail.sessionToken
          return detail.sessionToken
        }
      )
    },
    { immediate: true }
  )
  onBeforeUnmount(() => {
    closeSocket?.()
    if (realtimeTimer) clearTimeout(realtimeTimer)
    orderRequestId++
  })
</script>

<style scoped lang="scss">
  .table-cashier-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: linear-gradient(135deg, var(--el-bg-color-page), var(--el-color-primary-light-9));
  }

  // 收银主体区域
  .cashier-main {
    box-sizing: border-box;
    display: flex;
    flex: 1;
    gap: 12px;
    min-height: 0;
    padding: 12px;

    .left-side {
      display: flex;
      flex-shrink: 0;
      gap: 12px;
      width: clamp(440px, 34vw, 510px);
      overflow: hidden;

      .cart-panel {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        background-color: var(--el-bg-color);
        border: 1px solid var(--el-border-color-lighter);
        border-radius: 16px;
        box-shadow: 0 10px 30px rgb(31 71 137 / 6%);
      }

      .function-panel {
        flex-shrink: 0;
        width: 78px;
        overflow: hidden;
        background-color: var(--el-bg-color);
        border: 1px solid var(--el-border-color-lighter);
        border-radius: 16px;
        box-shadow: 0 10px 30px rgb(31 71 137 / 6%);
      }
    }

    .right-side {
      flex: 1;
      min-width: 0;
      overflow: hidden;
    }
  }

  // 响应式布局
  @media screen and (width <= 960px) {
    .cashier-main {
      flex-direction: column;
      height: auto;

      .left-side {
        width: 100%;
        height: auto;

        .cart-panel {
          min-height: 400px;
        }
      }

      .right-side {
        flex: none;
        height: 600px;
      }
    }
  }
</style>
