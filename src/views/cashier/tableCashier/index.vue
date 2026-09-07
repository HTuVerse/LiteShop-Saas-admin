<template>
  <div class="table-cashier-page art-full-height">
    <!-- 桌位列表视图 -->
    <div v-if="!selectedTable" class="table-list-container">
      <ElCard class="cashier-store-card" shadow="never">
        <div class="cashier-hero">
          <div class="hero-content">
            <div class="hero-topline">
              <div class="page-heading">
                <span class="heading-icon">
                  <img :src="cashierIcon" alt="餐桌收银" />
                </span>
                <div>
                  <h2>餐桌收银</h2>
                  <p>实时查看桌位状态，快速开台或进入当前用餐会话</p>
                </div>
              </div>
              <div class="store-control">
                <ElSelect
                  v-model="selectedStoreId"
                  filterable
                  clearable
                  :loading="storesLoading"
                  :disabled="storesLoading"
                  :placeholder="storesError ? '门店加载失败' : '请选择收银门店'"
                  :no-data-text="storesError ? '门店加载失败，请重试' : '暂无有权限的门店'"
                  @change="handleStoreChange"
                >
                  <template #prefix><Icon icon="ri:store-2-fill" /></template>
                  <ElOption
                    v-for="store in storeOptions"
                    :key="store.value"
                    :label="store.label"
                    :value="store.value"
                  />
                </ElSelect>
                <ElButton v-if="storesError" :loading="storesLoading" @click="loadAvailableStores">
                  重试
                </ElButton>
              </div>
            </div>

            <div class="hero-stats">
              <div v-for="item in summaryStats" :key="item.status" :class="item.className">
                <span class="stat-icon">
                  <img :src="item.image" :alt="`${item.status}桌位插图`" />
                </span>
                <span class="stat-copy">
                  <small>{{ item.status }}</small>
                  <strong>{{ item.count }}<em>张</em></strong>
                </span>
              </div>
            </div>
          </div>
          <div class="hero-illustration" aria-hidden="true">
            <img :src="heroIllustration" alt="" />
          </div>
        </div>
      </ElCard>

      <!-- 搜索栏 -->
      <TableSearch
        v-if="selectedStoreId"
        :model-value="searchForm"
        :loading="loading"
        @update:model-value="(value) => Object.assign(searchForm, value)"
        @search="handleSearch"
        @reset="resetSearchParams"
        @refresh="refreshData"
        @clear="clearAllSessions"
      />

      <ElCard class="art-table-card" style="margin-top: 0" shadow="never">
        <div class="region-toolbar">
          <div class="region-tabs">
            <button
              v-for="region in regionOptions"
              :key="region.value"
              type="button"
              :class="{ active: selectedRegion === region.value }"
              @click="handleRegionChange(region.value)"
            >
              <Icon icon="ri:map-pin-2-line" />
              {{ region.label }}
              <span>{{ region.count }}</span>
            </button>
          </div>
        </div>

        <!-- 桌位卡片网格 -->
        <div class="table-grid-wrapper" v-loading="loading">
          <ElScrollbar class="table-scrollbar">
            <div class="table-grid">
              <TableCard
                v-for="table in data"
                :key="table.id"
                :table="table"
                :session-start-time="table.sessionStartTime"
                :session-duration-minutes="table.sessionDurationMinutes"
                @click="handleSelectTable"
                @reservation="handleReservation"
              />
            </div>

            <ElEmpty v-if="!selectedStoreId" description="请先选择收银门店，再查看该门店桌位" />
            <ElEmpty v-else-if="!loading && data.length === 0" description="当前门店暂无桌位数据" />
          </ElScrollbar>
        </div>

        <!-- 分页 -->
        <div v-if="selectedStoreId" class="pagination-wrapper">
          <ElPagination
            v-model:current-page="pagination.current"
            v-model:page-size="pagination.size"
            :page-sizes="[20, 40, 60, 100]"
            :total="pagination.total"
            :background="true"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </ElCard>
    </div>

    <!-- 桌位收银视图 -->
    <div v-else class="cashier-view">
      <TableCashierPanel
        :table="selectedTable"
        :session="currentSession"
        @back="handleBack"
        @refresh="refreshData"
      />
    </div>

    <!-- 开桌对话框 -->
    <OpenTableDialog
      v-model:visible="openTableDialogVisible"
      :table-data="tableToOpen"
      @success="handleOpenTableSuccess"
    />
    <ReserveTableDialog
      v-model:visible="reserveTableDialogVisible"
      :table-data="tableToReserve"
      @success="handleReserveSuccess"
    />
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, computed, onMounted } from 'vue'
  import { Icon } from '@iconify/vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import {
    fetchTablePageList,
    fetchSessionDetail,
    type TableItem,
    type SessionVO
  } from '@/api/cashier'
  import { fetchClearAllSessions } from '@/api/dish-manage'
  import { useManagedStores } from '@/views/device/composables/useManagedStores'
  import TableSearch from './components/table-search.vue'
  import OpenTableDialog from './components/open-table-dialog.vue'
  import ReserveTableDialog from './components/reserve-table-dialog.vue'
  import TableCard from './components/TableCard.vue'
  import TableCashierPanel from './components/TableCashierPanel.vue'
  import heroIllustration from '@/assets/images/table/table-cashier-hero.png'
  import cashierIcon from '@/assets/images/table/table-cashier-hero-new.png'
  import allTableIllustration from '@/assets/images/table/table-status-all.png'
  import availableTableIllustration from '@/assets/images/table/table-status-available.png'
  import inUseTableIllustration from '@/assets/images/table/table-status-in-use.png'
  import reservedTableIllustration from '@/assets/images/table/table-status-reserved.png'
  import disabledTableIllustration from '@/assets/images/table/table-status-disabled.png'

  defineOptions({ name: 'TableCashier' })

  const reserveTableDialogVisible = ref(false)
  const tableToReserve = ref<TableItem | null>(null)
  const selectedStoreId = ref<string>()
  const { storeOptions, storesLoading, storesError, loadStores, resolveStoreId, defaultStoreId } =
    useManagedStores()
  let tableRequestId = 0
  const handleReservation = (table: TableItem) => {
    tableToReserve.value = table
    reserveTableDialogVisible.value = true
  }

  const handleReserveSuccess = async () => {
    await refreshData()
  }

  // 加载状态
  const loading = ref(false)

  // 搜索表单
  const searchForm = reactive({
    tableNumber: '',
    tableName: '',
    status: ''
  })

  // 当前门店完整桌位数据，用于前端自动生成区域分类。
  const allTables = ref<TableItem[]>([])
  const selectedRegion = ref('__all__')

  // 分页配置
  const pagination = reactive({
    current: 1,
    size: 20,
    total: 0
  })

  const normalizeRegion = (location?: string) => {
    const normalized = String(location || '')
      .trim()
      .replace(/\s+/g, ' ')
    return normalized || '未分区'
  }

  const regionOptions = computed(() => {
    const regionCounts = new Map<string, number>()
    allTables.value.forEach((table) => {
      const region = normalizeRegion(table.location)
      regionCounts.set(region, (regionCounts.get(region) || 0) + 1)
    })
    return [
      { label: '全部区域', value: '__all__', count: allTables.value.length },
      ...Array.from(regionCounts, ([region, count]) => ({ label: region, value: region, count }))
    ]
  })

  const filteredTables = computed(() => {
    if (selectedRegion.value === '__all__') return allTables.value
    return allTables.value.filter(
      (table) => normalizeRegion(table.location) === selectedRegion.value
    )
  })

  const data = computed(() => {
    const start = (pagination.current - 1) * pagination.size
    return filteredTables.value.slice(start, start + pagination.size)
  })

  const summaryStats = computed(() => {
    const statuses = [
      { status: '全部桌位', className: 'all', image: allTableIllustration },
      { status: '空闲', className: 'available', image: availableTableIllustration },
      { status: '使用中', className: 'in-use', image: inUseTableIllustration },
      { status: '有预约', className: 'reserved', image: reservedTableIllustration },
      { status: '停用', className: 'disabled', image: disabledTableIllustration }
    ]
    return statuses.map((item) => ({
      ...item,
      count:
        item.className === 'all'
          ? allTables.value.length
          : item.className === 'reserved'
          ? allTables.value.filter((table) => table.nextReservation).length
          : allTables.value.filter((table) => table.status === item.status).length
    }))
  })

  // 选中的桌位
  const selectedTable = ref<TableItem | null>(null)

  // 当前会话
  const currentSession = ref<SessionVO | null>(null)

  // 开桌对话框
  const openTableDialogVisible = ref(false)
  const tableToOpen = ref<TableItem | null>(null)

  // 状态文案 -> 后端数字
  const statusMap: Record<string, number | undefined> = {
    空闲: 0,
    使用中: 1,
    停用: 3
  }

  // 获取桌位列表数据
  const getData = async (params?: Record<string, any>) => {
    const storeId = resolveStoreId(selectedStoreId.value)
    if (!storeId) {
      tableRequestId++
      allTables.value = []
      selectedRegion.value = '__all__'
      pagination.total = 0
      loading.value = false
      return
    }
    const currentRequest = ++tableRequestId
    loading.value = true
    try {
      const statusNum = searchForm.status ? statusMap[searchForm.status] : undefined
      const requestParams = {
        tableNumber: searchForm.tableNumber || undefined,
        tableName: searchForm.tableName || undefined,
        status: statusNum,
        ...params,
        // 门店范围始终以当前授权下拉的选择为准，不允许附加参数覆盖。
        storeId
      }

      let tables: any[] = []
      let currentPage = 1
      let total = 0
      do {
        const tableRes = await fetchTablePageList({
          ...requestParams,
          currentPage,
          pageSize: 200
        })
        if (currentRequest !== tableRequestId || storeId !== selectedStoreId.value) return
        const pageRecords = Array.isArray(tableRes) ? tableRes : tableRes?.records || []
        tables.push(...pageRecords)
        total = Array.isArray(tableRes) ? tables.length : tableRes?.total || tables.length
        if (!pageRecords.length) break
        currentPage++
      } while (tables.length < total)

      // 根据 status 与 sessionNo 严格判断桌位状态（有 sessionNo 视为使用中）
      allTables.value = tables.map((table) => ({
        ...table,
        status: table.sessionNo ? '使用中' : table.status ?? '空闲'
      }))
      if (!regionOptions.value.some((region) => region.value === selectedRegion.value)) {
        selectedRegion.value = '__all__'
      }
      pagination.total = filteredTables.value.length
      const lastPage = Math.max(1, Math.ceil(pagination.total / pagination.size))
      pagination.current = Math.min(pagination.current, lastPage)
    } catch (error: any) {
      if (currentRequest !== tableRequestId) return
      console.error('加载桌位列表失败:', error)
      ElMessage.error(error.message || '加载桌位列表失败')
      allTables.value = []
      pagination.total = 0
    } finally {
      if (currentRequest === tableRequestId) loading.value = false
    }
  }

  const handleStoreChange = () => {
    tableRequestId++
    selectedTable.value = null
    currentSession.value = null
    tableToOpen.value = null
    openTableDialogVisible.value = false
    allTables.value = []
    selectedRegion.value = '__all__'
    pagination.current = 1
    pagination.total = 0
    if (selectedStoreId.value) getData()
  }

  const loadAvailableStores = async () => {
    const previousStoreId = selectedStoreId.value
    const loaded = await loadStores()
    if (!loaded) {
      selectedStoreId.value = undefined
      handleStoreChange()
      return
    }
    selectedStoreId.value = resolveStoreId(previousStoreId) || defaultStoreId.value || undefined
    handleStoreChange()
  }

  // 搜索处理
  const handleSearch = () => {
    pagination.current = 1
    getData()
  }

  // 重置搜索参数
  const resetSearchParams = () => {
    searchForm.tableNumber = ''
    searchForm.tableName = ''
    searchForm.status = ''
    pagination.current = 1
    getData()
  }

  // 刷新数据
  const refreshData = () => {
    getData()
  }

  /**
   * 一键清空所有会话（与桌位管理页一致）
   */
  const clearAllSessions = () => {
    const storeId = resolveStoreId(selectedStoreId.value)
    if (!storeId) {
      ElMessage.warning('请先选择收银门店')
      return
    }
    const storeName =
      storeOptions.value.find((store) => store.value === storeId)?.label || '当前门店'
    ElMessageBox.confirm(
      `确定要清空“${storeName}”所有餐桌的会话吗？\n这将结束该门店所有进行中的会话并恢复桌位为空闲。\n此操作通常用于每日打烊或系统重置。`,
      '清空当前门店会话',
      {
        confirmButtonText: '确定清空',
        cancelButtonText: '取消',
        type: 'error',
        confirmButtonClass: 'el-button--danger'
      }
    )
      .then(async () => {
        try {
          const res = await fetchClearAllSessions(storeId)
          ElMessage.success(`${storeName}会话清空成功，共清除 ${res.clearedSessionCount} 个会话`)
          refreshData()
          if (selectedTable.value) {
            selectedTable.value = null
            currentSession.value = null
          }
        } catch (error: any) {
          ElMessage.error(error?.message || error?.msg || '清空会话失败')
        }
      })
      .catch(() => {
        ElMessage.info('已取消操作')
      })
  }

  // 分页大小变化
  const handleSizeChange = (size: number) => {
    pagination.size = size
    pagination.current = 1
  }

  // 当前页变化
  const handleCurrentChange = (page: number) => {
    pagination.current = page
  }

  const handleRegionChange = (region: string) => {
    selectedRegion.value = region
    pagination.current = 1
    pagination.total = filteredTables.value.length
  }

  // 选择桌位
  const handleSelectTable = async (table: TableItem) => {
    if (table.status === '停用') {
      ElMessage.warning('该桌位已停用')
      return
    }

    // 有 sessionNo 表示已开桌，拉取会话详情后进入收银台
    if (table.sessionNo) {
      const storeId = selectedStoreId.value
      try {
        const detail = await fetchSessionDetail(table.sessionNo)
        if (storeId !== selectedStoreId.value) return
        currentSession.value = detail ?? null
      } catch {
        if (storeId !== selectedStoreId.value) return
        currentSession.value = null
      }
      selectedTable.value = table
      return
    }

    // 无 sessionNo 表示空闲，弹出开桌对话框
    tableToOpen.value = table
    openTableDialogVisible.value = true
  }

  // 开桌成功回调
  const handleOpenTableSuccess = async (session: SessionVO) => {
    let sessionWithOrders = session
    if (session?.sessionNo) {
      try {
        const detail = await fetchSessionDetail(session.sessionNo)
        sessionWithOrders = detail ?? session
      } catch {
        sessionWithOrders = session
      }
    }
    const table = allTables.value.find((t) => t.id === sessionWithOrders.tableId)
    if (table) {
      table.sessionNo = sessionWithOrders.sessionNo
      table.status = '使用中'
      selectedTable.value = table
      currentSession.value = sessionWithOrders
    }
  }

  // 返回桌位列表
  const handleBack = () => {
    selectedTable.value = null
    currentSession.value = null
    // 刷新桌位列表
    refreshData()
  }

  // 初始化
  onMounted(() => {
    loadAvailableStores()
  })
</script>

<style scoped lang="scss">
  .table-cashier-page {
    display: flex;
    flex-direction: column;
  }

  // 桌位列表容器
  .table-list-container {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  }

  .cashier-store-card {
    overflow: hidden;
    border: 1px solid rgb(95 141 174 / 12%);
    border-radius: 16px;

    :deep(.el-card__body) {
      padding: 0;
    }
  }

  .cashier-hero {
    position: relative;
    display: flex;
    min-height: 112px;
    overflow: hidden;
    background: radial-gradient(circle at 8% 0%, rgb(45 128 255 / 10%), transparent 32%),
      linear-gradient(105deg, #f8fbff 0%, #f3f9ff 66%, #fff 100%);
  }

  .hero-content {
    position: relative;
    z-index: 2;
    display: flex;
    flex: 1 1 68%;
    flex-direction: column;
    min-width: 0;
    padding: 9px 12px;
  }

  .hero-topline {
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
  }

  .page-heading {
    display: flex;
    gap: 10px;
    align-items: center;

    h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 750;
      line-height: 1.35;
      color: var(--el-text-color-primary);
    }

    p {
      margin: 3px 0 0;
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
  }

  .heading-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 46px;
    height: 46px;
    overflow: hidden;
    background: linear-gradient(145deg, #e8fff3, #d8f8e8);
    border: 1px solid rgb(20 174 101 / 12%);
    border-radius: 12px;
    box-shadow: 0 6px 14px rgb(8 159 84 / 12%);

    img {
      width: 42px;
      height: 42px;
      object-fit: contain;
    }
  }

  .store-control {
    display: flex;
    flex: 0 0 auto;
    gap: 8px;
    align-items: center;

    :deep(.el-select) {
      width: 200px;
    }

    :deep(.el-select__wrapper) {
      min-height: 34px;
      border-radius: 10px;
      box-shadow: 0 0 0 1px rgb(91 111 128 / 14%) inset;
    }
  }

  .hero-stats {
    display: grid;
    grid-template-columns: repeat(5, minmax(82px, 1fr));
    gap: 6px;
    margin-top: 8px;

    > div {
      display: flex;
      gap: 6px;
      align-items: center;
      min-width: 0;
      height: 48px;
      padding: 4px 7px 4px 4px;
      background: rgb(255 255 255 / 72%);
      border: 1px solid rgb(113 145 180 / 11%);
      border-radius: 9px;

      &.available {
        color: #0aa66a;
        background: linear-gradient(135deg, rgb(255 255 255 / 82%), rgb(225 251 242 / 78%));
      }

      &.in-use {
        color: #f05f58;
        background: linear-gradient(135deg, rgb(255 255 255 / 82%), rgb(255 236 235 / 80%));
      }

      &.reserved {
        color: #d98b14;
        background: linear-gradient(135deg, rgb(255 255 255 / 82%), rgb(255 245 220 / 82%));
      }

      &.disabled {
        color: #66758a;
        background: linear-gradient(135deg, rgb(255 255 255 / 82%), rgb(235 240 247 / 84%));
      }
    }
  }

  .stat-icon {
    flex: 0 0 auto;
    width: 40px;
    height: 40px;
    overflow: hidden;

    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  }

  .stat-copy {
    display: flex;
    flex-direction: column;
    min-width: 0;

    small {
      overflow: hidden;
      font-size: 11px;
      color: #687990;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    strong {
      margin-top: 1px;
      font-size: 17px;
      line-height: 1;
      color: #102240;

      em {
        margin-left: 3px;
        font-size: 10px;
        font-style: normal;
        font-weight: 500;
        color: #8190a3;
      }
    }
  }

  .hero-illustration {
    position: relative;
    flex: 0 0 10%;
    min-width: 220px;
    overflow: hidden;

    &::before {
      position: absolute;
      inset: 0;
      z-index: 1;
      content: '';
      background: linear-gradient(90deg, #f3f9ff 0%, rgb(243 249 255 / 20%) 32%, transparent 68%);
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: 58% 54%;
    }
  }

  .art-table-card {
    flex: 1;
    min-height: 0;
    border: 1px solid rgb(95 121 143 / 10%);
    border-radius: 16px;

    :deep(.el-card__body) {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 13px;
    }
  }

  .region-toolbar {
    display: flex;
    gap: 14px;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 9px;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .region-tabs {
    display: flex;
    flex: 1;
    gap: 6px;
    min-width: 0;
    overflow-x: auto;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }

    button {
      display: inline-flex;
      flex: 0 0 auto;
      gap: 5px;
      align-items: center;
      height: 32px;
      padding: 0 10px;
      font-size: 12px;
      color: var(--el-text-color-regular);
      cursor: pointer;
      background: transparent;
      border: 0;
      border-radius: 8px;
      transition: 0.18s ease;

      span {
        padding: 1px 5px;
        font-size: 10px;
        color: var(--el-text-color-secondary);
        background: var(--el-fill-color-light);
        border-radius: 999px;
      }

      &:hover {
        color: var(--el-color-primary);
        background: var(--el-color-primary-light-9);
      }

      &.active {
        color: #fff;
        background: linear-gradient(135deg, #3987ff, #2468ef);
        box-shadow: 0 5px 12px rgb(37 104 239 / 20%);

        span {
          color: #fff;
          background: rgb(255 255 255 / 18%);
        }
      }
    }
  }

  .table-total {
    flex: 0 0 auto;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    white-space: nowrap;
  }

  .table-grid-wrapper {
    flex: 1;
    min-height: 0;
    overflow: hidden;

    .table-scrollbar {
      height: 100%;
    }

    :deep(.el-scrollbar__view) {
      min-height: 100%;
    }
  }

  .table-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 10px;
    padding: 8px 3px 20px;
  }

  .pagination-wrapper {
    display: flex;
    flex-shrink: 0;
    justify-content: center;
    padding-top: 10px;
    margin-top: 5px;
    border-top: 1px solid var(--el-border-color-lighter);
  }

  .cashier-view {
    height: 100%;
    min-height: 0;
    overflow: auto;
    -webkit-overflow-scrolling: touch;
  }

  @media screen and (width <= 900px) {
    .hero-illustration {
      display: none;
    }
  }

  @media screen and (width <= 768px) {
    .hero-topline {
      align-items: stretch;
    }

    .hero-topline,
    .store-control {
      flex-direction: column;
    }

    .store-control {
      align-items: stretch;

      :deep(.el-select) {
        width: 100%;
      }
    }

    .hero-stats {
      grid-template-columns: repeat(3, minmax(82px, 1fr));
    }
  }

  @media screen and (width <= 480px) {
    .hero-stats {
      grid-template-columns: repeat(2, minmax(82px, 1fr));
    }
  }
</style>
