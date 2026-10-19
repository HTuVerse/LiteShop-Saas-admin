<template>
  <div class="order-page art-full-height">
    <!-- 搜索栏 -->
    <OrderSearch
      :model-value="searchForm"
      @update:model-value="(value) => Object.assign(searchForm, value)"
      @search="handleSearch"
      @reset="resetSearchParams"
    />

    <ElCard class="art-table-card" shadow="never">
      <!-- 表格头部 -->
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElSpace wrap>
            <ElButton @click="refreshData" v-ripple>刷新数据</ElButton>
            <ElButton
              v-auth="'restaurant:order:delete'"
              type="danger"
              :disabled="selectedRows.length === 0"
              @click="batchDeleteOrders"
              v-ripple
            >
              批量删除 ({{ selectedRows.length }})
            </ElButton>
          </ElSpace>
        </template>
      </ArtTableHeader>

      <!-- 表格 -->
      <ArtTable
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        @selection-change="handleSelectionChange"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />

      <!-- 订单详情弹窗 -->
      <OrderDetail
        v-model:visible="detailVisible"
        :order-id="currentOrderId"
        @print="openReceiptPrintByDetail"
      />

      <!-- 更新订单状态弹窗 -->
      <OrderStatusDialog
        v-model:visible="statusDialogVisible"
        :order="statusDialogOrder"
        :loading="statusUpdating"
        @confirm="confirmUpdateStatus"
      />

      <!-- 小票打印弹窗（与收银预估单打印共用组件） -->
      <ReceiptPrintDialog
        v-model:visible="receiptPrintVisible"
        :order-id="receiptPrintOrderId"
        :store-id="receiptPrintStoreId"
        title="订单小票打印"
      />
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage, ElMessageBox, ElTag, ElButton, ElTooltip } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import {
    fetchGetOrderPageList,
    fetchDeleteOrder,
    fetchBatchDeleteOrder,
    fetchUpdateOrderStatus,
    fetchCancelOrder
  } from '@/api/dish-manage'
  import OrderSearch from './modules/order-search.vue'
  import OrderDetail from './modules/order-detail.vue'
  import OrderStatusDialog from './modules/order-status-dialog.vue'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import ReceiptPrintDialog from '@/views/dish/order/modules/ReceiptPrintDialog.vue'

  defineOptions({ name: 'OrderManage' })

  type OrderListItem = Api.Order.OrderDetailVO

  // 详情弹窗相关
  const detailVisible = ref(false)
  const currentOrderId = ref<number>()

  // 更新订单状态弹窗
  const statusDialogVisible = ref(false)
  const statusDialogOrder = ref<OrderListItem | null>(null)
  const statusUpdating = ref(false)

  // 小票打印弹窗
  const receiptPrintVisible = ref(false)
  const receiptPrintOrderId = ref<number | null>(null)
  const receiptPrintStoreId = ref<number | null>(null)

  // 选中行
  const selectedRows = ref<OrderListItem[]>([])

  // 搜索表单
  const searchForm = reactive<Api.Order.OrderSearchParams>({
    storeId: null,
    tableId: null,
    userId: null,
    orderType: null,
    status: null,
    paymentStatus: null,
    phoneNumber: ''
  })

  // 订单类型配置
  const ORDER_TYPE_CONFIG = {
    在线点餐: { type: 'primary' as const, text: '在线点餐' },
    预点餐: { type: 'warning' as const, text: '预点餐' },
    门店自提: { type: 'success' as const, text: '门店自提' }
  } as const

  // 订单状态配置
  const ORDER_STATUS_CONFIG = {
    已下单: { type: 'info' as const, text: '已下单' },
    已接单: { type: 'primary' as const, text: '已接单' },
    制作中: { type: 'warning' as const, text: '制作中' },
    制作完成: { type: 'success' as const, text: '制作完成' },
    已完成: { type: 'success' as const, text: '已完成' },
    已取消: { type: 'danger' as const, text: '已取消' }
  } as const

  // 支付状态配置
  const PAYMENT_STATUS_CONFIG = {
    未支付: { type: 'danger' as const, text: '未支付' },
    已支付: { type: 'success' as const, text: '已支付' },
    部分退款: { type: 'warning' as const, text: '部分退款' },
    全额退款: { type: 'info' as const, text: '全额退款' }
  } as const

  /**
   * 获取订单类型配置
   */
  const getOrderTypeConfig = (type?: Api.Order.OrderType) => {
    if (!type) return { type: 'info' as const, text: '-' }
    return ORDER_TYPE_CONFIG[type] || { type: 'info' as const, text: '-' }
  }

  /**
   * 获取订单状态配置
   */
  const getOrderStatusConfig = (status?: Api.Order.OrderStatus) => {
    if (!status) return { type: 'info' as const, text: '-' }
    return ORDER_STATUS_CONFIG[status] || { type: 'info' as const, text: '-' }
  }

  /**
   * 获取支付状态配置
   */
  const getPaymentStatusConfig = (status?: Api.Order.PaymentStatus) => {
    if (!status) return { type: 'info' as const, text: '-' }
    return PAYMENT_STATUS_CONFIG[status] || { type: 'info' as const, text: '-' }
  }

  const {
    columns,
    columnChecks,
    data,
    loading,
    pagination,
    getData,
    resetSearchParams,
    handleSizeChange,
    handleCurrentChange,
    refreshData,
    refreshRemove,
    refreshUpdate
  } = useTable({
    // 核心配置
    core: {
      apiFn: fetchGetOrderPageList,
      apiParams: {
        currentPage: 1,
        pageSize: 10,
        storeId: searchForm.storeId,
        tableId: searchForm.tableId,
        userId: searchForm.userId,
        orderType: searchForm.orderType,
        status: searchForm.status,
        paymentStatus: searchForm.paymentStatus,
        phoneNumber: searchForm.phoneNumber
      },
      paginationKey: {
        current: 'currentPage',
        size: 'pageSize'
      },
      columnsFactory: () => [
        { type: 'selection', width: 50, fixed: 'left' },
        { type: 'index', width: 60, label: '序号', fixed: 'left' },
        {
          prop: 'orderNo',
          label: '订单编号',
          width: 180
        },
        {
          prop: 'storeName',
          label: '门店',
          width: 150
        },
        {
          prop: 'tableName',
          label: '餐桌',
          width: 120,
          formatter: (row: OrderListItem) => {
            return h('span', {}, row.tableName || '-')
          }
        },
        {
          prop: 'phoneNumber',
          label: '手机号',
          width: 120,
          formatter: (row: OrderListItem) => {
            return h('span', {}, row.phoneNumber || '-')
          }
        },
        {
          prop: 'diningCount',
          label: '就餐人数',
          width: 100,
          formatter: (row: OrderListItem) => {
            return h('span', {}, row.diningCount ? `${row.diningCount}人` : '-')
          }
        },
        {
          prop: 'orderType',
          label: '订单类型',
          width: 110,
          formatter: (row: OrderListItem) => {
            const config = getOrderTypeConfig(row.orderType)
            return h(ElTag, { type: config.type, size: 'small' }, { default: () => config.text })
          }
        },
        {
          prop: 'totalAmount',
          label: '订单金额',
          width: 110,
          formatter: (row: OrderListItem) => {
            return h(
              'span',
              { style: 'color: #409eff; font-weight: bold' },
              `¥${row.totalAmount.toFixed(2)}`
            )
          }
        },
        {
          prop: 'actualAmount',
          label: '实付金额',
          width: 110,
          formatter: (row: OrderListItem) => {
            return h(
              'span',
              { style: 'color: #f56c6c; font-weight: bold' },
              `¥${row.actualAmount.toFixed(2)}`
            )
          }
        },
        {
          prop: 'paymentStatus',
          label: '支付状态',
          width: 100,
          formatter: (row: OrderListItem) => {
            const config = getPaymentStatusConfig(row.paymentStatus)
            return h(ElTag, { type: config.type }, { default: () => config.text })
          }
        },
        {
          prop: 'status',
          label: '订单状态',
          width: 100,
          formatter: (row: OrderListItem) => {
            const config = getOrderStatusConfig(row.status)
            return h(ElTag, { type: config.type }, { default: () => config.text })
          }
        },
        {
          prop: 'createdAt',
          label: '下单时间',
          width: 180,
          sortable: true
        },
        {
          prop: 'operation',
          label: '操作',
          width: 140,
          fixed: 'right',
          formatter: (row: OrderListItem) => {
            const buttons = [
              // 小票打印按钮
              h(
                ElTooltip,
                {
                  content: '小票打印',
                  placement: 'top',
                  effect: 'dark'
                },
                {
                  default: () =>
                    h(ArtButtonTable, {
                      auth: [
                        'restaurant:printer:print',
                        'restaurant:order:print',
                        'operations:direct-cashier:print',
                        'operations:table-cashier:print'
                      ],
                      icon: 'ri:printer-line',
                      iconColor: '#909399',
                      buttonBgColor: '#f4f4f5',
                      onClick: () => openReceiptPrint(row)
                    })
                }
              ),
              // 查看详情按钮
              h(
                ElTooltip,
                {
                  content: '查看详情',
                  placement: 'top',
                  effect: 'dark'
                },
                {
                  default: () =>
                    h(ArtButtonTable, {
                      icon: 'ri:eye-line',
                      iconColor: '#409eff',
                      buttonBgColor: '#ecf5ff',
                      onClick: () => showOrderDetail(row.id)
                    })
                }
              ),
              // 更新状态按钮
              h(
                ElTooltip,
                {
                  content: '更新状态',
                  placement: 'top',
                  effect: 'dark'
                },
                {
                  default: () =>
                    h(ArtButtonTable, {
                      auth: 'restaurant:order:status',
                      icon: 'ri:refresh-line',
                      iconColor: '#67c23a',
                      buttonBgColor: '#f0f9ff',
                      onClick: () => updateStatus(row),
                      disabled: row.status === '已取消' || row.status === '已完成'
                    })
                }
              ),
              // 取消订单按钮
              h(
                ElTooltip,
                {
                  content: '取消订单',
                  placement: 'top',
                  effect: 'dark'
                },
                {
                  default: () =>
                    h(ArtButtonTable, {
                      auth: [
                        'restaurant:order:cancel',
                        'operations:direct-cashier:cancel',
                        'operations:table-cashier:cancel'
                      ],
                      style: 'margin-top: 5px;',
                      icon: 'ri:close-circle-line',
                      iconColor: '#e6a23c',
                      buttonBgColor: '#fdf6ec',
                      onClick: () => cancelOrder(row),
                      disabled: row.status === '已取消' || row.status === '已完成'
                    })
                }
              ),
              // 删除订单按钮
              h(
                ElTooltip,
                {
                  content: '删除订单',
                  placement: 'top',
                  effect: 'dark'
                },
                {
                  default: () =>
                    h(ArtButtonTable, {
                      auth: 'restaurant:order:delete',
                      type: 'delete',
                      onClick: () => deleteOrder(row)
                    })
                }
              )
            ]

            return h(
              'div',
              {
                style:
                  'display: grid; grid-template-columns: repeat(2, 1fr); gap: 5px; align-items: center;'
              },
              buttons
            )
          }
        }
      ]
    },
    hooks: {
      onError: (error) => {
        ElMessage.error(error.message || '数据加载失败')
      }
    },
    performance: {
      debounceTime: 300
    }
  })

  /**
   * 搜索处理
   */
  const handleSearch = () => {
    getData(searchForm)
  }

  /**
   * 显示订单详情
   */
  const showOrderDetail = (orderId: number): void => {
    currentOrderId.value = orderId
    detailVisible.value = true
  }

  /**
   * 打开小票打印弹窗
   */
  const openReceiptPrint = (row: OrderListItem): void => {
    receiptPrintOrderId.value = row.id
    receiptPrintStoreId.value = (row as any).storeId ?? null
    receiptPrintVisible.value = true
  }

  /**
   * 从订单详情弹窗打开小票打印
   */
  const openReceiptPrintByDetail = (payload: { orderId: number; storeId: number | null }): void => {
    detailVisible.value = false
    receiptPrintOrderId.value = payload.orderId
    receiptPrintStoreId.value = payload.storeId
    receiptPrintVisible.value = true
  }

  /**
   * 打开订单状态更新弹窗
   */
  const updateStatus = (row: OrderListItem): void => {
    statusDialogOrder.value = row
    statusDialogVisible.value = true
  }

  /**
   * 确认更新订单状态
   */
  const confirmUpdateStatus = async (payload: {
    status: number
    statusLabel: string
    remark: string
  }) => {
    if (!statusDialogOrder.value) return

    statusUpdating.value = true
    try {
      if (payload.status === 6) {
        await fetchCancelOrder(statusDialogOrder.value.id, payload.remark || undefined)
      } else {
        await fetchUpdateOrderStatus(statusDialogOrder.value.id, payload.status)
      }
      ElMessage.success(`订单状态已更新为【${payload.statusLabel}】`)
      statusDialogVisible.value = false
      refreshUpdate()
    } catch (error: any) {
      ElMessage.error(error.message || '更新失败')
    } finally {
      statusUpdating.value = false
    }
  }

  /**
   * 取消订单
   */
  const cancelOrder = (row: OrderListItem): void => {
    ElMessageBox.prompt('请输入取消原因', '取消订单', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /.+/,
      inputErrorMessage: '取消原因不能为空'
    })
      .then(async ({ value }) => {
        try {
          await fetchCancelOrder(row.id, value)
          ElMessage.success('订单已取消')
          refreshUpdate()
        } catch (error: any) {
          ElMessage.error(error.message || '取消失败')
        }
      })
      .catch(() => {
        ElMessage.info('已取消操作')
      })
  }

  /**
   * 删除订单
   */
  const deleteOrder = (row: OrderListItem): void => {
    const warningMessage =
      row.status !== '已取消' && row.status !== '已完成'
        ? `订单【${row.orderNo}】当前状态为【${row.status}】，确定要删除吗？此操作不可恢复！`
        : `确定要删除订单【${row.orderNo}】吗？此操作不可恢复！`

    ElMessageBox.confirm(warningMessage, '删除订单', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'error',
      dangerouslyUseHTMLString: false,
      distinguishCancelAndClose: true
    })
      .then(async () => {
        try {
          await fetchDeleteOrder(row.id)
          ElMessage.success('订单已删除')
          refreshRemove()
        } catch (error: any) {
          ElMessage.error(error.message || '删除失败')
        }
      })
      .catch((action) => {
        if (action === 'cancel') {
          ElMessage.info('已取消删除')
        }
      })
  }

  /**
   * 处理表格行选择变化
   */
  const handleSelectionChange = (selection: OrderListItem[]): void => {
    selectedRows.value = selection
  }

  /**
   * 批量删除订单
   */
  const batchDeleteOrders = (): void => {
    if (selectedRows.value.length === 0) {
      ElMessage.warning('请先选择要删除的订单')
      return
    }

    // 统计各状态订单数量
    const statusCount = selectedRows.value.reduce(
      (acc, row) => {
        const status = row.status || '未知'
        acc[status] = (acc[status] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    // 构建提示信息
    const statusInfo = Object.entries(statusCount)
      .map(([status, count]) => `【${status}】${count}个`)
      .join('、')

    ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRows.value.length} 个订单吗？\n包括：${statusInfo}\n\n此操作不可恢复！`,
      '批量删除订单',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'error',
        distinguishCancelAndClose: true
      }
    )
      .then(async () => {
        try {
          const ids = selectedRows.value.map((row) => row.id)
          console.log(ids)
          await fetchBatchDeleteOrder(ids)
          ElMessage.success(`成功删除 ${ids.length} 个订单`)
          selectedRows.value = []
          refreshRemove()
        } catch (error: any) {
          ElMessage.error(error.message || '批量删除失败')
        }
      })
      .catch((action) => {
        if (action === 'cancel') {
          ElMessage.info('已取消批量删除')
        }
      })
  }
</script>

<style lang="scss" scoped>
  .order-page {
    :deep(.el-card) {
      border-radius: 8px;
    }
  }
</style>
