<template>
  <div class="store-page art-full-height">
    <!-- 搜索栏 -->
    <StoreSearch
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
            <ElButton
              v-auth="'restaurant:store:add'"
              @click="showDialog('add')"
              v-ripple
              type="primary"
              >新增门店</ElButton
            >
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

      <!-- 门店弹窗 -->
      <StoreDialog
        v-model:visible="dialogVisible"
        :type="dialogType"
        :store-data="currentStoreData"
        @submit="handleDialogSubmit"
        @addSuccess="refreshCreate"
        @editSuccess="refreshUpdate"
      />
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage, ElMessageBox, ElTag, ElButton } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import {
    fetchGetStorePageList,
    fetchDeleteStore,
    fetchUpdateStoreStatus
  } from '@/api/dish-manage'
  import StoreSearch from './modules/store-search.vue'
  import StoreDialog from './modules/store-dialog.vue'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'

  defineOptions({ name: 'StoreManage' })

  type StoreListItem = Api.Store.StoreListItem

  // 弹窗相关
  const dialogType = ref<'add' | 'edit'>('add')
  const dialogVisible = ref(false)
  const currentStoreData = ref<Partial<StoreListItem>>({})

  // 选中行
  const selectedRows = ref<StoreListItem[]>([])

  // 搜索表单
  const searchForm = reactive<Api.Store.StoreSearchParams>({
    storeName: '',
    status: null
  })

  // 门店状态配置
  const STORE_STATUS_CONFIG = {
    停业: { type: 'danger' as const, text: '停业' },
    营业中: { type: 'success' as const, text: '营业中' },
    休息中: { type: 'warning' as const, text: '休息中' }
  } as const

  // 支付模式配置
  const PAYMENT_MODE_CONFIG = {
    线上支付: { type: 'primary' as const, text: '线上支付' },
    线下支付: { type: 'info' as const, text: '线下支付' }
  } as const

  // 取餐模式配置
  const PICKUP_MODE_CONFIG = {
    送上桌: { type: 'success' as const, text: '送上桌' },
    叫号自取: { type: 'warning' as const, text: '叫号自取' }
  } as const

  /**
   * 获取门店状态配置
   */
  const getStoreStatusConfig = (status?: Api.Store.StoreStatus) => {
    console.log(status)
    if (!status) return { type: 'info' as const, text: '未知' }
    return (
      STORE_STATUS_CONFIG[status] || {
        type: 'info' as const,
        text: '未知'
      }
    )
  }

  /**
   * 获取支付模式配置
   */
  const getPaymentModeConfig = (mode?: Api.Store.PaymentMode) => {
    if (!mode) return { type: 'info' as const, text: '-' }
    return PAYMENT_MODE_CONFIG[mode] || { type: 'info' as const, text: '-' }
  }

  /**
   * 获取取餐模式配置
   */
  const getPickupModeConfig = (mode?: Api.Store.PickupMode) => {
    if (!mode) return { type: 'info' as const, text: '-' }
    return PICKUP_MODE_CONFIG[mode] || { type: 'info' as const, text: '-' }
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
    refreshCreate,
    refreshRemove,
    refreshUpdate
  } = useTable({
    // 核心配置
    core: {
      apiFn: fetchGetStorePageList,
      apiParams: {
        currentPage: 1,
        pageSize: 10,
        storeName: searchForm.storeName,
        status: searchForm.status
      },
      paginationKey: {
        current: 'currentPage',
        size: 'pageSize'
      },
      columnsFactory: () => [
        { type: 'index', width: 60, label: '序号' },
        {
          prop: 'storeName',
          label: '门店名称',
          width: 180,
          fixed: 'left'
        },
        {
          prop: 'storeCode',
          label: '门店编码',
          width: 120
        },
        {
          prop: 'address',
          label: '门店地址',
          minWidth: 200
        },
        {
          prop: 'phone',
          label: '联系电话',
          width: 130
        },
        {
          prop: 'businessHours',
          label: '营业时间',
          width: 150
        },
        {
          prop: 'paymentMode',
          label: '支付模式',
          width: 110,
          formatter: (row: StoreListItem) => {
            const config = getPaymentModeConfig(row.paymentMode)
            return h(ElTag, { type: config.type, size: 'small' }, { default: () => config.text })
          }
        },
        {
          prop: 'pickupMode',
          label: '取餐模式',
          width: 110,
          formatter: (row: StoreListItem) => {
            const config = getPickupModeConfig(row.pickupMode)
            return h(ElTag, { type: config.type, size: 'small' }, { default: () => config.text })
          }
        },
        {
          prop: 'allowPreOrder',
          label: '预点单',
          width: 90,
          formatter: (row: StoreListItem) => {
            const text = row.allowPreOrder === '是' ? '允许' : '禁止'
            const type = row.allowPreOrder === '是' ? 'success' : 'info'
            return h(ElTag, { type, size: 'small' }, { default: () => text })
          }
        },
        {
          prop: 'isPrint',
          label: '小票打印',
          width: 100,
          formatter: (row: StoreListItem) => {
            const text = row.isPrint === '是' ? '开启' : '关闭'
            const type = row.isPrint === '是' ? 'success' : 'info'
            return h(ElTag, { type, size: 'small' }, { default: () => text })
          }
        },
        {
          prop: 'status',
          label: '状态',
          width: 100,
          formatter: (row: StoreListItem) => {
            const statusConfig = getStoreStatusConfig(row.status)
            return h(ElTag, { type: statusConfig.type }, { default: () => statusConfig.text })
          }
        },
        {
          prop: 'createdAt',
          label: '创建时间',
          width: 180,
          sortable: true
        },
        {
          prop: 'operation',
          label: '操作',
          width: 120,
          fixed: 'right',
          formatter: (row: StoreListItem) =>
            h('div', { style: 'display: flex; gap: 5px;flex-wrap: wrap; align-items: center;' }, [
              h(ArtButtonTable, {
                auth: 'restaurant:store:edit',
                type: 'edit',
                onClick: () => showDialog('edit', row)
              }),
              h(ArtButtonTable, {
                auth: 'restaurant:store:delete',
                type: 'delete',
                onClick: () => deleteStore(row)
              }),
              h(ArtButtonTable, {
                auth: 'restaurant:store:status',
                icon:
                  row.status === '停业'
                    ? 'ic:outline-not-started'
                    : 'material-symbols:motion-photos-paused-outline',
                iconColor: row.status === '停业' ? '#67C23A' : '#E6A23C',
                buttonBgColor:
                  row.status === '停业' ? 'rgba(103, 194, 58, 0.12)' : 'rgba(230, 162, 60, 0.12)',
                onClick: () => toggleStoreStatus(row)
              })
            ])
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
   * 显示门店弹窗
   */
  const showDialog = (type: 'add' | 'edit', row?: StoreListItem): void => {
    dialogType.value = type
    currentStoreData.value = row || {}
    nextTick(() => {
      dialogVisible.value = true
    })
  }

  /**
   * 删除门店
   */
  const deleteStore = (row: StoreListItem): void => {
    ElMessageBox.confirm(`确定要删除门店【${row.storeName}】吗？`, '删除门店', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'error'
    })
      .then(async () => {
        try {
          await fetchDeleteStore(row.id)
          ElMessage.success('删除成功')
          refreshRemove()
        } catch (error: any) {
          ElMessage.error(error.message || '删除失败')
        }
      })
      .catch(() => {
        ElMessage.info('已取消删除')
      })
  }

  /**
   * 切换门店状态
   */
  const toggleStoreStatus = (row: StoreListItem): void => {
    const targetStatus = row.status === '停业' ? 1 : 0
    const statusText = targetStatus === 1 ? '启用' : '停业'

    ElMessageBox.confirm(`确定要${statusText}门店【${row.storeName}】吗？`, `${statusText}门店`, {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(async () => {
        try {
          await fetchUpdateStoreStatus(row.id, targetStatus)
          ElMessage.success(`${statusText}成功`)
          refreshUpdate()
        } catch (error: any) {
          ElMessage.error(error.message || `${statusText}失败`)
        }
      })
      .catch(() => {
        ElMessage.info(`已取消${statusText}`)
      })
  }

  /**
   * 处理弹窗提交事件
   */
  const handleDialogSubmit = () => {
    dialogVisible.value = false
    currentStoreData.value = {}
  }

  /**
   * 处理表格行选择变化
   */
  const handleSelectionChange = (selection: StoreListItem[]): void => {
    selectedRows.value = selection
  }
</script>

<style lang="scss" scoped>
  .store-page {
    :deep(.el-card) {
      border-radius: 8px;
    }
  }
</style>
