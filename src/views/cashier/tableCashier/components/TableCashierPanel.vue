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
  const scopeKey = useUserStore().scopeKey
  import { ref, provide, reactive, onMounted } from 'vue'
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
    fetchAddItemsToOrder,
    fetchMarkOrderItemsGift
  } from '@/api/cashier'
  import { generateUUID, formatTime } from '@utils/cashier/utils'

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

  // 当前会话订单ID（用于退菜等）
  const currentOrderId = ref<number | null>(null)

  // 退菜弹窗显示
  const refundDishVisible = ref(false)

  // 会员信息
  const member = ref<any>(null)

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

  // 将订单明细项转为购物车商品格式（fromOrder: true 表示来自后端订单；orderItemId 用于赠菜接口；batchNo 为下单批次号）
  // 保留 totalPrice（实付小计）、discountPrice（优惠金额），与订单一致，避免收银金额错误
  const orderItemToCart = (item: any) => {
    const quantity = item.quantity ?? item.number ?? 1
    const totalPrice = item.totalPrice != null ? Number(item.totalPrice) : null
    const discountPrice = item.discountPrice != null ? Number(item.discountPrice) : null
    return {
      id: item.dishId,
      orderItemId: item.id != null ? item.id : undefined,
      batchNo: item.batchNo != null ? Number(item.batchNo) : undefined,
      dishName: item.dishName,
      price: Number(item.price),
      number: quantity,
      totalPrice: totalPrice,
      discountPrice: discountPrice ?? 0,
      dishImage: item.dishImage || item.mainPic || '',
      stock: 999,
      saleStatus: 1,
      categoryId: item.categoryId,
      categoryName: item.categoryName || '',
      specText: item.specText ?? item.specOptionsText ?? '',
      specKey:
        item.specText ?? item.specOptionsText
          ? `spec_${item.dishId}_${item.specText || item.specOptionsText}`
          : '',
      isGift: Number(item.isGift) === 1 ? 1 : 0,
      fromOrder: true
    }
  }

  // 加载桌位订单数据：统一走 fetchGetOrderBySession
  const loadTableOrder = async () => {
    if (!props.session?.sessionNo) {
      return
    }

    refreshing.value = true
    try {
      const res = await fetchGetOrderBySession(props.session.sessionNo)
      if (res && res.id) {
        sessionHasOrder.value = true
        currentOrderId.value = res.id
        const list = res.items || []
        if (list.length > 0) {
          cart.commodity = list.map((item: any) => orderItemToCart(item))
          if (res.userId) {
            member.value = { id: res.userId, nickname: res.username || '会员' }
            cart.member = member.value
          }
          cart.discountRate = res.discountRate ?? null
          cart.note = res.note || ''
          cart.uuid = generateUUID()
          cart.sessionNo = props.session.sessionNo
          ElMessage.success('订单数据加载成功')
        }
      } else {
        sessionHasOrder.value = false
        currentOrderId.value = null
      }
    } catch (error: any) {
      console.error('加载订单数据失败:', error)
      sessionHasOrder.value = false
      currentOrderId.value = null
      if (error?.response?.status !== 404) {
        ElMessage.warning('该桌位暂无订单数据')
      }
    } finally {
      refreshing.value = false
    }
  }

  // 刷新订单
  const handleRefresh = () => {
    loadTableOrder()
  }

  // 返回
  const handleBack = () => {
    if (cart.commodity.length > 0) {
      ElMessageBox.confirm('当前购物车有未结算商品，确定要返回吗？', '提示', {
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

  // 更新购物车
  const updateCart = (commodity: any) => {
    if (!cart.uuid) {
      cart.uuid = generateUUID()
    }

    // 更新会话编号
    cart.sessionNo = props.session?.sessionNo || ''

    // 检查是否有规格
    if (commodity.specKey) {
      const existIndex = cart.commodity.findIndex(
        (item: any) =>
          item.fromOrder !== true &&
          item.id === commodity.id &&
          item.specKey === commodity.specKey
      )

      if (existIndex !== -1) {
        cart.commodity[existIndex].number += commodity.number || 1
      } else {
        cart.commodity.unshift({
          ...commodity,
          number: commodity.number || 1,
          fromOrder: false // 加菜/首次点菜，可直接删
        })
      }
    } else {
      const existIndex = cart.commodity.findIndex(
        (item: any) => item.fromOrder !== true && item.id === commodity.id && !item.specKey
      )

      if (existIndex !== -1) {
        cart.commodity[existIndex].number += commodity.number || 1
      } else {
        cart.commodity.unshift({
          ...commodity,
          number: commodity.number || 1,
          fromOrder: false // 加菜/首次点菜，可直接删
        })
      }
    }

    cart.member = member.value
    ElMessage.success('加购成功')
  }

  // 删除购物车商品
  const deleteCart = (index: number) => {
    cart.commodity.splice(index, 1)
    ElMessage.success('删除成功')
  }

  // 修改商品数量
  const updateCartItemNumber = (index: number, number: number) => {
    if (cart.commodity[index] && cart.commodity[index].fromOrder !== true) {
      cart.commodity[index].number = number
    }
  }

  // 清空购物车
  const emptyCart = (isClearing = false) => {
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
          item.totalPrice != null && item.totalPrice >= 0
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

  // 挂单到购物车
  const pendingToCart = (item: any) => {
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
      const basePrice =
        item.activityPrice > 0 ? item.activityPrice : item.originalPrice ?? item.price
      return {
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
      let existingOrderId: number | null = null
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
          storeId: props.table.storeId,
          tableId: props.table?.id,
          sessionNo,
          orderType: 0,
          totalPrice: cart.total,
          cartItems: buildCartItemsForOrder(),
          note: cart.note || ''
        }
        const createRes = await fetchCreateOrder(createData)
        sessionHasOrder.value = true
        if (createRes?.id) currentOrderId.value = createRes.id
        ElMessage.success('订单已提交，可继续加菜或点击「结算」收银')
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
      ElMessageBox.confirm('离开当前页，当前购物车将被清空，是否继续？', '提示', {
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

  // 初始化
  onMounted(() => {
    // 如果有会话，加载订单数据
    if (props.session?.sessionNo) {
      loadTableOrder()
    }
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
