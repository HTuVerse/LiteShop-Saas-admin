<template>
  <ElDialog
    v-model="dialogVisible"
    class="order-detail-dialog"
    width="min(1280px, 94vw)"
    align-center
    append-to-body
    destroy-on-close
    :show-close="false"
  >
    <template #header>
      <div class="dialog-header">
        <div class="header-main">
          <div class="title-line">
            <h2>订单详情</h2>
            <span class="order-number">#{{ orderDetail?.orderNo || '—' }}</span>
            <ElTag
              v-if="orderDetail?.status"
              :type="getOrderStatusTag(orderDetail.status).type"
              effect="dark"
              round
            >
              {{ orderDetail.status }}
            </ElTag>
          </div>

          <div v-if="orderDetail" class="order-meta">
            <span class="meta-item">
              <ElIcon><Clock /></ElIcon>
              下单时间 {{ formatDateTime(orderDetail.createdAt) }}
            </span>
            <span v-if="finishTime" class="meta-item success">
              <ElIcon><CircleCheckFilled /></ElIcon>
              完成时间 {{ formatDateTime(finishTime) }}
            </span>
            <span v-if="diningDuration" class="meta-item">
              <ElIcon><KnifeFork /></ElIcon>
              用餐时长 {{ diningDuration }}
            </span>
            <span class="meta-item">
              <ElIcon><Tickets /></ElIcon>
              订单类型 {{ orderDetail.orderType || '—' }}
            </span>
          </div>
        </div>

        <div class="header-actions">
          <ElButton :icon="Printer" @click="handlePrint">打印小票</ElButton>
          <ElButton
            text
            circle
            class="close-button"
            aria-label="关闭"
            @click="dialogVisible = false"
          >
            <ElIcon><Close /></ElIcon>
          </ElButton>
        </div>
      </div>
    </template>

    <div v-loading="loading" class="dialog-content">
      <template v-if="orderDetail">
        <div class="overview-grid">
          <section class="overview-card table-card">
            <img :src="tableIllustration" alt="餐桌" class="table-illustration" />
            <div class="table-copy">
              <div class="table-title-row">
                <strong>{{ orderDetail.tableName || '未分配餐桌' }}</strong>
                <span>{{ orderDetail.storeName || '门店订单' }}</span>
              </div>
              <div class="table-meta">
                <span
                  ><ElIcon><User /></ElIcon>{{ orderDetail.diningCount || 0 }} 人</span
                >
                <span
                  ><ElIcon><Location /></ElIcon>{{ orderDetail.storeName || '—' }}</span
                >
              </div>
              <p>{{ orderDetail.sessionNo ? `用餐批次 ${orderDetail.sessionNo}` : '当前订单' }}</p>
            </div>
          </section>

          <section class="overview-card customer-card">
            <div class="section-heading compact">
              <h3>顾客信息</h3>
              <span v-if="orderDetail.userId" class="member-badge">
                <ElIcon><UserFilled /></ElIcon>会员
              </span>
            </div>
            <div class="customer-main">
              <div class="customer-avatar">{{ customerInitial }}</div>
              <div class="customer-copy">
                <strong>{{ orderDetail.username || '到店顾客' }}</strong>
                <span>{{ maskPhone(orderDetail.phoneNumber) }}</span>
              </div>
            </div>
            <div class="customer-tags">
              <span>{{ orderDetail.paymentStatus || '支付状态未知' }}</span>
              <span v-if="orderDetail.paymentMode">{{ orderDetail.paymentMode }}</span>
              <span v-if="orderDetail.userId">会员顾客</span>
            </div>
          </section>

          <section class="pickup-card" :class="{ 'is-code': !!orderDetail.pickupCode }">
            <div class="pickup-copy">
              <span class="pickup-label">{{ orderDetail.pickupCode ? '取餐码' : '订单状态' }}</span>
              <strong>{{ orderDetail.pickupCode || orderDetail.status || '处理中' }}</strong>
              <p>{{ orderDetail.pickupCode ? '请凭取餐码到取餐口取餐' : statusDescription }}</p>
            </div>
            <img
              :src="orderDetail.pickupCode ? pickupIllustration : receiptIllustration"
              :alt="orderDetail.pickupCode ? '取餐' : '订单状态'"
              class="pickup-illustration"
            />
          </section>
        </div>

        <div class="detail-grid">
          <section class="products-section">
            <div class="section-heading products-heading">
              <div>
                <h3>商品明细</h3>
                <span>共 {{ orderDetail.items?.length || 0 }} 件商品</span>
              </div>
              <span class="quantity-summary">合计 {{ totalQuantity }} 份</span>
            </div>

            <div class="products-table-wrap">
              <ArtTable
                class="products-table"
                :data="productRows"
                :columns="productColumns"
                :span-method="productSpanMethod"
                :row-class-name="productRowClassName"
                :show-table-header="false"
                height="100%"
                empty-text="暂无商品明细"
              >
                <template #index="{ row }">
                  <div v-if="row.kind === 'batch'" class="batch-divider">
                    <span>{{ row.label }}</span>
                    <small>共 {{ row.itemCount }} 件，{{ row.quantity }} 份</small>
                  </div>
                  <span v-else>{{ row.index }}</span>
                </template>
                <template #product="{ row }">
                  <div v-if="row.kind === 'item'" class="product-cell">
                    <div class="product-image">
                      <img
                        v-if="row.item.mainPic || row.item.dishImage"
                        :src="row.item.mainPic || row.item.dishImage"
                        :alt="row.item.dishName"
                        @error="hideBrokenImage"
                      />
                      <span>{{ row.item.dishName?.slice(0, 1) || '餐' }}</span>
                    </div>
                    <div class="product-copy">
                      <strong>{{ row.item.dishName }}</strong>
                      <div v-if="getItemLabels(row.item).length" class="product-tags">
                        <span v-for="label in getItemLabels(row.item)" :key="label">{{
                          label
                        }}</span>
                      </div>
                    </div>
                  </div>
                </template>
                <template #price="{ row }">
                  <span v-if="row.kind === 'item'">¥ {{ formatMoney(row.item.unitListPrice ?? row.item.unitSellingPrice) }}</span>
                </template>
                <template #quantity="{ row }">
                  <span v-if="row.kind === 'item'">{{ row.item.quantity }} 份</span>
                </template>
                <template #subtotal="{ row }">
                  <strong v-if="row.kind === 'item'"
                    >¥ {{ formatMoney(getSubtotal(row.item)) }}</strong
                  >
                </template>
              </ArtTable>
            </div>
          </section>

          <aside class="sidebar">
            <section class="side-card amount-card">
              <div class="section-heading icon-heading">
                <span class="heading-icon"
                  ><ElIcon><Tickets /></ElIcon
                ></span>
                <h3>金额信息</h3>
              </div>
              <div class="amount-list">
                <div class="amount-row">
                  <span>商品总额</span>
                  <strong>¥ {{ formatMoney(orderDetail.totalAmount) }}</strong>
                </div>
                <div v-if="(orderDetail.discountAmount || 0) > 0" class="amount-row discount">
                  <span>优惠金额</span>
                  <strong>- ¥ {{ formatMoney(orderDetail.discountAmount) }}</strong>
                </div>
                <div v-if="(orderDetail.serviceFee || 0) > 0" class="amount-row">
                  <span>服务费</span>
                  <strong>¥ {{ formatMoney(orderDetail.serviceFee) }}</strong>
                </div>
                <div class="amount-row total">
                  <span>实付金额</span>
                  <strong>¥ {{ formatMoney(orderDetail.actualAmount) }}</strong>
                </div>
              </div>
              <div class="payment-info">
                <div>
                  <span>支付方式</span>
                  <strong>{{ orderDetail.paymentType || '—' }}</strong>
                </div>
                <div>
                  <span>支付时间</span>
                  <strong>{{ formatDateTime(orderDetail.paymentTime) }}</strong>
                </div>
                <div v-if="orderDetail.paymentNo">
                  <span>支付流水号</span>
                  <strong class="payment-number">{{ orderDetail.paymentNo }}</strong>
                </div>
              </div>
            </section>

            <section
              v-if="orderDetail.note || orderDetail.cancelReason"
              class="side-card note-card"
            >
              <div class="section-heading icon-heading">
                <span class="heading-icon"
                  ><ElIcon><Document /></ElIcon
                ></span>
                <h3>{{ orderDetail.cancelReason ? '取消信息' : '订单备注' }}</h3>
              </div>
              <p :class="{ danger: !!orderDetail.cancelReason }">
                {{ orderDetail.cancelReason || orderDetail.note }}
              </p>
            </section>
          </aside>
        </div>
      </template>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <ElButton size="large" @click="dialogVisible = false">关闭</ElButton>
        <ElButton type="primary" size="large" :icon="Printer" @click="handlePrint">
          打印小票
        </ElButton>
      </div>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import {
    CircleCheckFilled,
    Clock,
    Close,
    Document,
    KnifeFork,
    Location,
    Printer,
    Tickets,
    User,
    UserFilled
  } from '@element-plus/icons-vue'
  import { fetchGetOrderDetail } from '@/api/dish-manage'
  import { useTable } from '@/hooks/core/useTable'
  import tableIllustration from '@/assets/images/system/order-table.png'
  import pickupIllustration from '@/assets/images/system/order-pickup.png'
  import receiptIllustration from '@/assets/images/system/order-receipt.png'

  interface Props {
    visible: boolean
    orderId?: number
  }

  interface PrintPayload {
    orderId: number
    storeId: number | null
  }

  interface OrderBatchGroup {
    key: string
    label: string
    items: Api.Order.OrderItem[]
    quantity: number
    startIndex: number
  }

  type ProductTableRow =
    | {
        kind: 'batch'
        key: string
        label: string
        itemCount: number
        quantity: number
      }
    | {
        kind: 'item'
        key: string
        index: number
        item: Api.Order.OrderItem
      }

  interface Emits {
    (e: 'update:visible', value: boolean): void
    (e: 'print', value: PrintPayload): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  const dialogVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
  })

  const loading = ref(false)
  const orderDetail = ref<Api.Order.OrderDetailVO | null>(null)

  const finishTime = computed(() => {
    if (
      !orderDetail.value ||
      !['制作完成', '已完成', '已取消'].includes(orderDetail.value.status || '')
    ) {
      return ''
    }
    return (
      orderDetail.value.diningEndTime ||
      orderDetail.value.cancelTime ||
      orderDetail.value.updatedAt ||
      ''
    )
  })

  const diningDuration = computed(() => {
    const start = orderDetail.value?.createdAt
    const end = finishTime.value
    if (!start || !end) return ''

    const duration = new Date(end).getTime() - new Date(start).getTime()
    if (!Number.isFinite(duration) || duration <= 0) return ''

    const minutes = Math.floor(duration / 60000)
    if (minutes < 60) return `${Math.max(1, minutes)} 分钟`
    return `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分钟`
  })

  const totalQuantity = computed(() =>
    (orderDetail.value?.items || []).reduce((total, item) => total + Number(item.quantity || 0), 0)
  )

  const batchGroups = computed<OrderBatchGroup[]>(() => {
    const groups = new Map<string, Api.Order.OrderItem[]>()

    for (const item of orderDetail.value?.items || []) {
      const batchValue =
        item.batchNo === undefined || item.batchNo === null ? '1' : String(item.batchNo)
      const items = groups.get(batchValue) || []
      items.push(item)
      groups.set(batchValue, items)
    }

    let startIndex = 0
    return Array.from(groups.entries()).map(([batchValue, items]) => {
      const group: OrderBatchGroup = {
        key: batchValue,
        label: /^\d+$/.test(batchValue)
          ? `以下为第 ${batchValue} 批次商品`
          : `以下为批次 ${batchValue} 的商品`,
        items,
        quantity: items.reduce((total, item) => total + Number(item.quantity || 0), 0),
        startIndex
      }
      startIndex += items.length
      return group
    })
  })

  const productRows = computed<ProductTableRow[]>(() =>
    batchGroups.value.flatMap((group) => [
      {
        kind: 'batch' as const,
        key: `batch-${group.key}`,
        label: group.label,
        itemCount: group.items.length,
        quantity: group.quantity
      },
      ...group.items.map((item, itemIndex) => ({
        kind: 'item' as const,
        key: `item-${group.key}-${item.id || itemIndex}`,
        index: group.startIndex + itemIndex + 1,
        item
      }))
    ])
  )

  const { columns: productColumns } = useTable({
    core: {
      apiFn: async (): Promise<ProductTableRow[]> => [],
      immediate: false,
      columnsFactory: () => [
        { prop: 'index', label: '#', width: 54, className: 'index-column', useSlot: true },
        { prop: 'product', label: '商品名称', minWidth: 250, useSlot: true },
        {
          prop: 'price',
          label: '单价',
          width: 112,
          align: 'right',
          className: 'money-column',
          useSlot: true
        },
        {
          prop: 'quantity',
          label: '数量',
          width: 90,
          align: 'center',
          className: 'quantity-column',
          useSlot: true
        },
        {
          prop: 'subtotal',
          label: '小计',
          width: 112,
          align: 'right',
          className: 'money-column subtotal',
          useSlot: true
        }
      ]
    }
  })

  const productSpanMethod = ({
    row: rawRow,
    columnIndex
  }: {
    row: Record<string, any>
    columnIndex: number
  }) => {
    const row = rawRow as ProductTableRow
    if (row.kind !== 'batch') return [1, 1]
    return columnIndex === 0 ? [1, productColumns.value.length] : [0, 0]
  }

  const productRowClassName = ({ row }: { row: Record<string, any> }) =>
    (row as ProductTableRow).kind === 'batch' ? 'batch-divider-row' : 'product-row'

  const customerInitial = computed(() => {
    const customer = orderDetail.value?.username || orderDetail.value?.phoneNumber || '顾'
    return customer.slice(0, 1).toUpperCase()
  })

  const statusDescription = computed(() => {
    const descriptions: Record<string, string> = {
      已下单: '订单已提交，等待门店接单',
      已接单: '门店已接单，正在准备商品',
      制作中: '后厨正在制作，请耐心等候',
      制作完成: '商品已制作完成，可以取餐',
      已完成: '订单已完成，感谢您的光临',
      已取消: '订单已取消'
    }
    return descriptions[orderDetail.value?.status || ''] || '订单正在处理中'
  })

  const getOrderStatusTag = (status?: Api.Order.OrderStatus) => {
    const statusMap: Record<
      string,
      { type: 'primary' | 'success' | 'warning' | 'danger' | 'info' }
    > = {
      已下单: { type: 'info' },
      已接单: { type: 'primary' },
      制作中: { type: 'warning' },
      制作完成: { type: 'success' },
      已完成: { type: 'success' },
      已取消: { type: 'danger' }
    }
    return status ? statusMap[status] || { type: 'info' as const } : { type: 'info' as const }
  }

  const formatMoney = (value?: number | null): string => Number(value || 0).toFixed(2)

  const formatDateTime = (value?: string | null): string => value || '—'

  const maskPhone = (phone?: string): string => {
    if (!phone) return '未留手机号'
    if (phone.length < 7) return phone
    return `${phone.slice(0, 3)} **** ${phone.slice(-4)}`
  }

  const getSpecText = (item: Api.Order.OrderItem): string =>
    item.specOptionsText || item.specInfo || ''

  const getSubtotal = (item: Api.Order.OrderItem): number => item.totalPrice ?? item.subtotal ?? 0

  const parseSpecInfo = (specInfo?: string): string[] => {
    if (!specInfo?.trim()) return []
    const trimmedSpec = specInfo.trim()

    try {
      if (trimmedSpec.startsWith('[') || trimmedSpec.startsWith('{')) {
        const parsed = JSON.parse(trimmedSpec)
        if (Array.isArray(parsed)) {
          return parsed.map((item: Record<string, unknown>) => {
            if (item.specName && item.specValue) return `${item.specName}: ${item.specValue}`
            return String(item.value || item)
          })
        }
        if (typeof parsed === 'object' && parsed !== null) {
          return Object.entries(parsed).map(([key, value]) => `${key}: ${value}`)
        }
      }

      if (trimmedSpec.includes(':')) {
        return trimmedSpec
          .split(trimmedSpec.includes(';') ? ';' : ',')
          .map((item) => item.trim())
          .filter(Boolean)
      }

      if (trimmedSpec.includes(',')) {
        return trimmedSpec
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      }

      return [trimmedSpec]
    } catch {
      return [trimmedSpec]
    }
  }

  const getItemLabels = (item: Api.Order.OrderItem): string[] => {
    const labels = [...parseSpecInfo(getSpecText(item))]
    if (item.note) labels.push(item.note)
    return labels
  }

  const hideBrokenImage = (event: Event) => {
    ;(event.target as HTMLImageElement).style.display = 'none'
  }

  const handlePrint = () => {
    if (!orderDetail.value) return
    emit('print', {
      orderId: orderDetail.value.id,
      storeId: orderDetail.value.storeId ?? null
    })
  }

  const loadOrderDetail = async () => {
    if (!props.orderId) return

    loading.value = true
    try {
      orderDetail.value = await fetchGetOrderDetail(props.orderId)
    } catch (error: any) {
      ElMessage.error(error.message || '加载订单详情失败')
    } finally {
      loading.value = false
    }
  }

  watch(
    () => [props.visible, props.orderId] as const,
    ([visible, orderId]) => {
      if (visible && orderId) loadOrderDetail()
    },
    { immediate: true }
  )
</script>

<style scoped lang="scss">
  .dialog-header {
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
    padding-right: 2px;
  }

  .header-main {
    display: flex;
    flex: 1;
    gap: 20px;
    align-items: center;
    min-width: 0;
  }

  .title-line {
    display: flex;
    flex: 0 0 auto;
    gap: 9px;
    align-items: center;
    white-space: nowrap;

    h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      line-height: 28px;
      color: #14213d;
    }

    .order-number {
      font-size: 13px;
      font-weight: 500;
      color: #50617f;
    }
  }

  .order-meta {
    display: flex;
    flex: 1;
    flex-wrap: wrap;
    gap: 2px 16px;
    min-width: 0;
    margin: 0;
    font-size: 12px;
    line-height: 20px;
    color: #60708e;

    .meta-item {
      display: inline-flex;
      gap: 5px;
      align-items: center;
      white-space: nowrap;

      .el-icon {
        font-size: 14px;
        color: #3f7ff5;
      }

      &.success .el-icon {
        color: #24b47e;
      }
    }
  }

  .header-actions {
    display: flex;
    flex: 0 0 auto;
    gap: 8px;
    align-items: center;

    .el-button:not(.is-text) {
      height: 34px;
      padding: 0 13px;
      color: #223354;
      border-color: #cfdbef;
    }

    .close-button {
      width: 34px;
      height: 34px;
      margin-left: 2px;
      font-size: 22px;
      color: #223354;
    }
  }

  .dialog-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  .overview-grid {
    display: grid;
    flex: 0 0 122px;
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.9fr) minmax(0, 1fr);
    gap: 12px;
    min-height: 0;
  }

  .overview-card,
  .pickup-card,
  .products-section,
  .side-card {
    overflow: hidden;
    border: 1px solid #e2e9f4;
    border-radius: 12px;
  }

  .overview-card {
    min-height: 0;
    background: linear-gradient(135deg, #f8fbff 0%, #f0f5ff 100%);
  }

  .table-card {
    display: flex;
    align-items: center;
    padding: 8px 14px 7px 6px;

    .table-illustration {
      width: 45%;
      max-width: 145px;
      height: 104px;
      object-fit: contain;
    }
  }

  .table-copy {
    min-width: 0;
    padding-left: 6px;

    .table-title-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;

      strong {
        font-size: 21px;
        line-height: 1.2;
        color: #101c3b;
      }

      span {
        padding: 4px 7px;
        font-size: 12px;
        color: #2669e8;
        background: #dce9ff;
        border-radius: 6px;
      }
    }

    .table-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 14px;
      margin-top: 9px;
      font-size: 13px;
      color: #536583;

      span {
        display: inline-flex;
        gap: 6px;
        align-items: center;
      }

      .el-icon {
        font-size: 15px;
        color: #496891;
      }
    }

    p {
      margin: 6px 0 0;
      font-size: 12px;
      color: #77859d;
    }
  }

  .customer-card {
    padding: 13px 16px;
    background: linear-gradient(145deg, #fff 0%, #f8fbff 100%);
  }

  .section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;

    h3 {
      margin: 0;
      font-size: 17px;
      font-weight: 700;
      color: #14213d;
    }

    &.compact {
      gap: 12px;
      justify-content: flex-start;
    }
  }

  .member-badge {
    display: inline-flex;
    gap: 4px;
    align-items: center;
    padding: 4px 8px;
    font-size: 11px;
    color: #fff;
    background: #2fc185;
    border-radius: 12px;
  }

  .customer-main {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-top: 9px;
  }

  .customer-avatar {
    display: grid;
    flex: 0 0 auto;
    place-items: center;
    width: 36px;
    height: 36px;
    font-size: 15px;
    font-weight: 700;
    color: #fff;
    background: linear-gradient(145deg, #b9d1ff, #568df5);
    border: 3px solid #e8f0ff;
    border-radius: 50%;
  }

  .customer-copy {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;

    strong {
      overflow: hidden;
      font-size: 15px;
      color: #1b2946;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    span {
      font-size: 13px;
      color: #5f708e;
    }
  }

  .customer-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;

    span {
      padding: 3px 7px;
      font-size: 11px;
      color: #60708d;
      background: #eff4fc;
      border-radius: 5px;
    }
  }

  .pickup-card {
    position: relative;
    display: flex;
    align-items: center;
    min-height: 0;
    padding: 13px 10px 10px 22px;
    background: linear-gradient(135deg, #fff7eb 0%, #fff0e2 100%);
    border-color: #ffead6;

    &:not(.is-code) {
      background: linear-gradient(135deg, #eff7ff 0%, #f4fffb 100%);
      border-color: #dcebf6;
    }
  }

  .pickup-copy {
    z-index: 1;
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 150px;

    .pickup-label {
      font-size: 16px;
      font-weight: 700;
      color: #1c2947;
    }

    strong {
      margin-top: 3px;
      font-size: clamp(28px, 3vw, 38px);
      font-weight: 800;
      line-height: 1.05;
      color: #2f73ed;
      letter-spacing: 5px;
    }

    p {
      margin: 6px 0 0;
      font-size: 12px;
      line-height: 1.5;
      color: #6c665f;
    }
  }

  .pickup-card:not(.is-code) .pickup-copy strong {
    font-size: 22px;
    letter-spacing: 1px;
  }

  .pickup-illustration {
    align-self: flex-end;
    width: 42%;
    max-width: 125px;
    height: 105px;
    object-fit: contain;
  }

  .detail-grid {
    display: grid;
    flex: 1;
    grid-template-columns: minmax(0, 1fr) 342px;
    gap: 12px;
    min-height: 0;
    margin-top: 12px;
  }

  .products-section {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    background: #fff;
  }

  .products-heading {
    flex: 0 0 46px;
    min-height: 46px;
    padding: 0 20px;

    > div {
      display: flex;
      gap: 12px;
      align-items: baseline;
    }

    span {
      font-size: 13px;
      color: #657490;
    }

    .quantity-summary {
      padding: 5px 9px;
      color: #3f6db9;
      background: #f0f5ff;
      border-radius: 6px;
    }
  }

  .products-table-wrap {
    flex: 1;
    min-height: 0;
    overflow: auto;
    overscroll-behavior: contain;
    border-top: 1px solid #edf1f7;
  }

  .products-table {
    height: 100%;
    width: 100%;
    min-width: 630px;
    font-size: 13px;
    color: #18233f;

    :deep(.el-table__header-wrapper th.el-table__cell) {
      font-weight: 500;
      color: #566784;
      background: #f7f9fd;
    }

    :deep(.el-table__body tr:hover > td.el-table__cell) {
      background: #f9fbff;
    }

    :deep(.batch-divider-row td.el-table__cell) {
      height: 32px;
      padding: 0 18px;
      background: #f1f6ff;
      border-top: 1px solid #dce8fb;
      border-bottom: 1px solid #dce8fb;
    }

    :deep(.batch-divider-row:hover > td.el-table__cell) {
      background: #f1f6ff;
    }

    :deep(.index-column .cell) {
      padding-left: 20px;
    }

    :deep(.money-column .cell) {
      padding-right: 20px;
      white-space: nowrap;
    }

    :deep(.quantity-column .cell) {
      white-space: nowrap;
    }

    :deep(.subtotal strong) {
      font-size: 15px;
      font-weight: 700;
      color: #101b36;
    }
  }

  .batch-divider {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    font-weight: 600;
    color: #2e67bf;

    small {
      font-size: 11px;
      font-weight: 400;
      color: #7588a7;
    }
  }

  .product-cell {
    display: flex;
    gap: 12px;
    align-items: center;
    min-width: 0;
    padding: 6px 12px 6px 0;
  }

  .product-image {
    position: relative;
    display: grid;
    flex: 0 0 auto;
    place-items: center;
    width: 44px;
    height: 44px;
    overflow: hidden;
    font-weight: 700;
    color: #a76a2e;
    background: linear-gradient(145deg, #fff4df, #f1ddbd);
    border-radius: 9px;

    img {
      position: absolute;
      inset: 0;
      z-index: 1;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .product-copy {
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 0;

    strong {
      overflow: hidden;
      font-size: 14px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .product-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;

    span {
      padding: 2px 6px;
      font-size: 10px;
      color: #687995;
      background: #f1f5fb;
      border-radius: 4px;
    }
  }

  .sidebar {
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-height: 0;
    overflow: hidden;
  }

  .side-card {
    padding: 14px 16px;
    background: #fff;
  }

  .icon-heading {
    gap: 10px;
    justify-content: flex-start;

    .heading-icon {
      display: grid;
      place-items: center;
      width: 24px;
      height: 24px;
      color: #fff;
      background: linear-gradient(145deg, #4c8eff, #1761e8);
      border-radius: 6px;
    }
  }

  .amount-list {
    margin-top: 9px;
  }

  .amount-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 5px 0;
    font-size: 14px;
    color: #5f6f8c;

    strong {
      font-size: 15px;
      color: #1d2a45;
    }

    &.discount strong {
      color: #f04444;
    }

    &.total {
      padding: 10px 0 9px;
      margin-top: 5px;
      font-size: 16px;
      font-weight: 700;
      color: #17223c;
      border-top: 1px solid #e5ebf4;
      border-bottom: 1px solid #e5ebf4;

      strong {
        font-size: 23px;
        color: #216be8;
      }
    }
  }

  .payment-info {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 10px;

    > div {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      justify-content: space-between;
      font-size: 13px;
      color: #60708e;
    }

    strong {
      max-width: 205px;
      overflow: hidden;
      font-weight: 500;
      color: #243451;
      text-align: right;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .payment-number {
      font-size: 11px;
    }
  }

  .note-card {
    min-height: 0;
    background: linear-gradient(135deg, #fbfdff, #f1f7ff);

    p {
      display: -webkit-box;
      margin: 8px 0 0 34px;
      overflow: hidden;
      font-size: 13px;
      line-height: 1.7;
      color: #526480;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 3;

      &.danger {
        color: #d64d4d;
      }
    }
  }

  .dialog-footer {
    display: flex;
    justify-content: space-between;

    .el-button {
      min-width: 126px;
    }

    .el-button--primary {
      min-width: 156px;
    }
  }

  @media (width <= 1080px) {
    .header-main {
      gap: 14px;
    }

    .order-meta {
      gap: 2px 10px;

      .meta-item:nth-child(2),
      .meta-item:nth-child(3) {
        display: none;
      }
    }

    .detail-grid {
      grid-template-columns: minmax(0, 1fr) 310px;
    }

    .table-illustration {
      width: 38% !important;
    }
  }

  @media (width <= 760px) {
    .dialog-header {
      min-height: 34px;
    }

    .header-actions {
      position: absolute;
      top: 12px;
      right: 12px;

      .el-button:not(.close-button) {
        display: none;
      }
    }

    .title-line {
      padding-right: 40px;

      h2 {
        font-size: 20px;
      }
    }

    .order-meta {
      display: none;
    }

    .overview-grid {
      flex-basis: 106px;
      grid-template-columns: 1fr 1fr;
    }

    .customer-card {
      display: none;
    }

    .pickup-card {
      padding-left: 14px;
    }

    .pickup-illustration {
      display: none;
    }

    .detail-grid {
      grid-template-rows: auto minmax(0, 1fr);
      grid-template-columns: 1fr;
    }

    .products-section {
      grid-row: 2;
    }

    .sidebar {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-row: 1;

      .amount-card {
        display: grid;
        grid-template-columns: 1fr 1fr;
        column-gap: 14px;
      }

      .amount-list,
      .payment-info {
        padding: 0;
        margin: 0;
      }

      .icon-heading {
        display: none;
      }

      .note-card {
        display: flex;
        align-items: center;

        p {
          margin: 0;
        }
      }
    }

    .dialog-footer {
      gap: 10px;

      .el-button {
        flex: 1;
        min-width: 0;
      }
    }
  }
</style>

<style lang="scss">
  .order-detail-dialog {
    display: flex;
    flex-direction: column;
    height: min(760px, calc(100vh - 24px));
    overflow: hidden;
    border: 1px solid rgb(218 226 239 / 85%);
    border-radius: 15px;
    box-shadow: 0 24px 70px rgb(25 48 86 / 22%);

    .el-dialog__header {
      flex: 0 0 auto;
      padding: 12px 22px;
      margin: 0;
      border-bottom: 1px solid #edf1f7;
    }

    .el-dialog__body {
      flex: 1;
      min-height: 0;
      padding: 12px 22px;
      overflow: hidden;
    }

    .el-dialog__footer {
      flex: 0 0 auto;
      padding: 10px 22px;
      border-top: 1px solid #edf1f7;
    }
  }

  @media (width <= 760px) {
    .order-detail-dialog {
      width: calc(100vw - 24px) !important;
      height: calc(100vh - 24px);

      .el-dialog__header {
        padding: 10px 16px;
      }

      .el-dialog__body {
        padding: 10px 16px;
        overflow: hidden;
      }

      .el-dialog__footer {
        padding: 12px 16px;
      }
    }
  }
</style>
