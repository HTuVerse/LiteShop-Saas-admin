<template>
  <div class="cashier-container">
    <!-- 左侧区域 -->
    <div class="left-side">
      <!-- 购物车区域 -->
      <div class="cart-panel">
        <Cart @clearing="handleClearing" />
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

    <!-- 支付弹窗 -->
    <Pay :visible="payVisible" @cancel="payVisible = false" @success="handlePaySuccess" />
  </div>
</template>

<script setup lang="ts">
  import { computed, ref, provide, reactive, watch } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { onBeforeRouteLeave } from 'vue-router'
  import Cart from '@views/cashier/directCashier/components/Cart.vue'
  import FunctionArea from '@views/cashier/directCashier/components/FunctionArea.vue'
  import Commodity from '@views/cashier/directCashier/components/Commodity.vue'
  import Pay from '@views/cashier/directCashier/components/Pay.vue'
  import { generateUUID, formatTime } from '@utils/cashier/utils'
  import { useUserStore } from '@/store/modules/user'
  const cashierSession = useUserStore()
  const cashierStoreId = computed(() => cashierSession.cashierStoreId)
  provide('cashierStoreId', cashierStoreId)
  const lastPaidOrder = ref<{ orderId: string | number; storeId: string | number | null } | null>(null)
  provide('lastPaidOrder', lastPaidOrder)
  watch(cashierStoreId, () => { lastPaidOrder.value = null })
  const pendingKey =
    'cashier-pending:' + cashierSession.scopeKey + ':' + cashierSession.cashierStoreId

  defineOptions({ name: 'Cashier' })

  // 支付弹窗显示状态
  const payVisible = ref(false)

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
    discountRate: null as number | null, // 整单折扣率（例如：0.8表示8折）
    note: '', // 订单备注
    member: null as any,
    time: null as string | null
  })

  // 是否需要默认选中用户
  const isDefaultMember = false

  // 挂单列表
  const pending = ref<any[]>([])

  // 从 localStorage 加载挂单数据
  const loadPending = () => {
    const data = localStorage.getItem(pendingKey)
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
    localStorage.setItem(pendingKey, JSON.stringify(pending.value))
  }

  // 切换商品赠送状态
  const toggleGiftStatus = (index: number) => {
    if (cart.commodity[index]) {
      cart.commodity[index].isGift = cart.commodity[index].isGift ? 0 : 1
      ElMessage.success(cart.commodity[index].isGift ? '已标记为赠菜' : '已取消赠菜')
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
      // 首次触发，生成 UUID
      cart.uuid = generateUUID()
    }

    // 检查是否有规格
    if (commodity.specKey) {
      // 带规格的商品
      const existIndex = cart.commodity.findIndex(
        (item: any) => item.id === commodity.id && item.specKey === commodity.specKey
      )

      if (existIndex !== -1) {
        // 已存在相同规格，累加数量
        cart.commodity[existIndex].number += commodity.number || 1
      } else {
        // 新增
        cart.commodity.unshift({
          ...commodity,
          number: commodity.number || 1
        })
      }
    } else {
      // 不带规格的商品
      const existIndex = cart.commodity.findIndex(
        (item: any) => item.id === commodity.id && !item.specKey
      )

      if (existIndex !== -1) {
        // 已存在，累加数量
        cart.commodity[existIndex].number += commodity.number || 1
      } else {
        // 新增
        cart.commodity.unshift({
          ...commodity,
          number: commodity.number || 1
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
    if (cart.commodity[index]) {
      cart.commodity[index].number = number
    }
  }

  // 清空购物车
  const emptyCart = (isClearing = false) => {
    cart.uuid = ''
    cart.commodity = []
    cart.sum = 0
    cart.total = 0
    cart.discountRate = null
    cart.note = ''
    cart.member = null
    cart.time = null
    member.value = null

    if (!isClearing) {
      ElMessage.success('清空成功')
    } else {
      ElMessage.success('结算成功')
    }
  }

  // 计算购物车总价和总数量
  const calculateCart = () => {
    let sum = 0
    let total = 0

    cart.commodity.forEach((item: any) => {
      sum += item.number
      // 赠菜不计入总价
      if (!item.isGift) {
        total += item.number * item.price
      }
    })

    // 应用整单折扣
    if (cart.discountRate && cart.discountRate > 0 && cart.discountRate < 1) {
      total = total * cart.discountRate
    }

    cart.sum = sum
    cart.total = parseFloat(total.toFixed(2))
    cart.time = formatTime()
    cart.member = member.value
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

    // 检查是否已存在相同的挂单
    const existIndex = pending.value.findIndex((item) => item.uuid === cart.uuid)

    if (existIndex !== -1) {
      // 更新已存在的挂单
      pending.value[existIndex] = JSON.parse(JSON.stringify(cart))
    } else {
      // 新增挂单
      pending.value.unshift(JSON.parse(JSON.stringify(cart)))
    }

    savePending()

    // 清空当前购物车
    cart.uuid = ''
    cart.commodity = []
    cart.sum = 0
    cart.total = 0
    cart.discountRate = null
    cart.note = ''
    cart.member = null
    cart.time = null
    member.value = null

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
    localStorage.removeItem(pendingKey)
    ElMessage.success('清空成功')
  }

  // 结算
  const handleClearing = () => {
    if (cart.commodity.length === 0) {
      ElMessage.error('请先添加商品')
      return
    }
    calculateCart()
    payVisible.value = true
  }

  // 支付成功
  const handlePaySuccess = (printedOrder?: {
    orderId?: string | number
    storeId?: string | number | null
  }) => {
    if (printedOrder?.orderId) {
      lastPaidOrder.value = {
        orderId: printedOrder.orderId,
        storeId: printedOrder.storeId ?? cashierStoreId.value ?? null
      }
    }
    // 如果是挂单中的订单，删除挂单
    if (cart.uuid) {
      const pendingIndex = pending.value.findIndex((item) => item.uuid === cart.uuid)
      if (pendingIndex !== -1) {
        pending.value.splice(pendingIndex, 1)
        savePending()
      }
    }
    emptyCart(true)
    payVisible.value = false

    // 刷新商品列表（更新库存）
    commodityRef.value?.refreshCommodityList()
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

  provide('isDefaultMember', isDefaultMember)

  provide('pending', {
    pending,
    addPending,
    deletePending,
    emptyPending
  })

  provide('clearing', handleClearing)

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
</script>

<style scoped lang="scss">
  .cashier-container {
    box-sizing: border-box;
    display: flex;
    gap: 8px;
    height: var(--art-full-height, calc(100vh - 92px));

    min-height: 0;
    padding: 8px;
    overflow: hidden;
    background: linear-gradient(135deg, var(--el-bg-color-page), var(--el-color-primary-light-9));
  }

  .left-side {
    display: flex;
    flex-shrink: 0;
    gap: 8px;
    width: clamp(380px, 31vw, 460px);
    min-height: 0;
    overflow: hidden;

    .cart-panel {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      background-color: var(--el-bg-color);
      border: 1px solid var(--el-border-color-lighter);
      border-radius: 12px;
      box-shadow: 0 10px 30px rgb(31 71 137 / 6%);
    }

    .function-panel {
      flex-shrink: 0;
      width: 68px;
      overflow: hidden;
      background-color: var(--el-bg-color);
      border: 1px solid var(--el-border-color-lighter);
      border-radius: 12px;
      box-shadow: 0 10px 30px rgb(31 71 137 / 6%);
    }
  }

  .right-side {
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }

  // 响应式布局
  @media screen and (width <= 760px) {
    .cashier-container {
      flex-direction: column;
      height: auto;
      min-height: calc(100vh - 100px);
      overflow: visible;
    }

    .left-side {
      width: 100%;
      height: auto;

      .cart-panel {
        min-height: 400px;
      }

      .function-panel {
        width: 68px;
      }
    }

    .right-side {
      flex: none;
      height: 520px;
    }
  }
</style>
