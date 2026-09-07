<template>
  <div class="page art-full-height">
    <ElCard shadow="never" class="search-card">
      <ArtForm :model="search" class="reservation-search-form">
        <div  class="search-primary-row">
          <ElFormItem label="门店">
            <ElSelect
              v-model="search.storeId"
              clearable
              filterable
              placeholder="全部授权门店"
              :loading="storesLoading"
              @change="searchStoreChanged"
            >
              <ElOption
                v-for="s in storeOptions"
                :key="s.value"
                :label="s.label"
                :value="s.value"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="桌位">
            <ElSelect
              v-model="search.tableId"
              clearable
              filterable
              :disabled="!search.storeId"
              :loading="filterTablesLoading"
              placeholder="请先选择门店"
            >
              <ElOption
                v-for="t in filterTables"
                :key="t.id"
                :label="tableLabel(t)"
                :value="t.id"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="手机号">
            <ElInput
              v-model="search.phone"
              clearable
              maxlength="11"
              placeholder="请输入手机号"
              @input="search.phone = digits($event)"
            />
          </ElFormItem>

          <div class="search-actions">
            <ElButton type="primary" @click="query">查询</ElButton>
            <ElButton @click="reset">重置</ElButton>
            <ElButton
              class="expand-button"
              text
              type="primary"
              :aria-expanded="searchExpanded"
              aria-controls="reservation-more-filters"
              @click="searchExpanded = !searchExpanded"
            >
              {{ searchExpanded ? '收起' : '展开' }}
              <Icon :icon="searchExpanded ? 'ri:arrow-up-s-line' : 'ri:arrow-down-s-line'" />
            </ElButton>
          </div>
        </div>
        <div id="reservation-more-filters" v-show="searchExpanded" class="search-more-row">
          <ElFormItem label="状态">
            <ElSelect v-model="search.status" clearable placeholder="全部状态">
              <ElOption
                v-for="s in statuses"
                :key="s.value"
                :label="s.label"
                :value="s.value"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label-width="100px" class="arrival-range" label="预约到店时间">
            <ElDatePicker
              v-model="search.range"
              type="datetimerange"
              value-format="YYYY-MM-DD HH:mm:ss"
              format="YYYY-MM-DD HH:mm"
              range-separator="至"
              start-placeholder="开始时间"
              end-placeholder="结束时间"
            />
          </ElFormItem>
        </div>
      </ArtForm>
    </ElCard>
    <ElCard shadow="never" class="list-card">
      <div class="header"
        ><div><h3>预约管理</h3><span>统一管理授权门店的桌位预约</span></div
        ><ElButton
          type="primary"
          :disabled="storesLoading || storesError || !storeOptions.length"
          @click="openCreate"
          ><Icon icon="ri:add-line" />新增预约</ElButton
        ></div
      >
      <ArtTable
        :loading="loading"
        :data="rows"
        stripe
        height="100%"
        :columns="tableColumns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      >
        <template #empty><ElEmpty description="暂无预约记录" /></template>
        <template #tableColumnsSlot1="{ row }">{{
          row.storeName || storeName(row.storeId)
        }}</template>
        <template #tableColumnsSlot2="{ row }">{{
          [row.tableNumber, row.tableName].filter(Boolean).join(' / ') || '-'
        }}</template>
        <template #tableColumnsSlot5="{ row }"
          ><div>{{ fmt(row.expectedArrivalTime) }}</div
          ><small>至 {{ fmt(row.expectedEndTime) }}</small></template
        >
        <template #tableColumnsSlot6="{ row }"
          ><ElTag :type="tagType(row.status)">{{ row.statusDesc }}</ElTag></template
        >
        <template #tableColumnsSlot7="{ row }">{{ row.reservationRemark || '-' }}</template>
      </ArtTable>
    </ElCard>
    <ElDialog
      v-model="visible"
      :title="mode === 'create' ? '新增预约' : '编辑待到店预约'"
      width="min(720px, 92vw)"
      align-center
      :close-on-click-modal="false"
    >
      <ArtForm ref="formRef" :model="form" :rules="rules" label-width="105px" :disabled="saving">
        <div class="grid">
          <ElFormItem label="预约门店" prop="storeId"
            ><ElSelect
              v-model="form.storeId"
              filterable
              :loading="storesLoading"
              :disabled="mode === 'edit'"
              style="width: 100%"
              @change="storeChanged"
              ><ElOption
                v-for="s in storeOptions"
                :key="s.value"
                :label="s.label"
                :value="s.value" /></ElSelect
          ></ElFormItem>
          <ElFormItem label="预约桌位" prop="tableId"
            ><ElSelect
              v-model="form.tableId"
              filterable
              :loading="tablesLoading"
              :disabled="mode === 'edit' || !form.storeId"
              placeholder="请先选择门店"
              style="width: 100%"
              ><ElOption
                v-for="t in tables"
                :key="t.id"
                :label="tableLabel(t)"
                :value="t.id"
                :disabled="t.status === '停用'" /></ElSelect
          ></ElFormItem>
          <ElFormItem label="手机号码" prop="reservationPhone"
            ><ElInput
              v-model="form.reservationPhone"
              maxlength="11"
              @input="form.reservationPhone = digits($event)"
          /></ElFormItem>
          <ElFormItem label="预约人数" prop="peopleCount"
            ><ElInputNumber v-model="form.peopleCount" :min="1" :max="30" style="width: 100%"
          /></ElFormItem>
          <ElFormItem label="预计到店" prop="expectedArrivalTime"
            ><ElDatePicker
              v-model="form.expectedArrivalTime"
              type="datetime"
              value-format="YYYY-MM-DD HH:mm:ss"
              format="YYYY-MM-DD HH:mm"
              :disabled-date="past"
              style="width: 100%"
          /></ElFormItem>
          <ElFormItem label="预计结束" prop="expectedEndTime"
            ><ElDatePicker
              v-model="form.expectedEndTime"
              type="datetime"
              value-format="YYYY-MM-DD HH:mm:ss"
              format="YYYY-MM-DD HH:mm"
              :disabled-date="past"
              style="width: 100%"
          /></ElFormItem>
        </div>
        <ElFormItem label="备注信息"
          ><ElInput
            v-model="form.reservationRemark"
            type="textarea"
            :rows="3"
            maxlength="200"
            show-word-limit
        /></ElFormItem>
      </ArtForm>
      <template #footer
        ><ElButton @click="visible = false">取消</ElButton
        ><ElButton type="primary" :loading="saving" @click="submit">保存预约</ElButton></template
      >
    </ElDialog>
    <OpenTableDialog
      v-model:visible="arrivalVisible"
      :table-data="arrivalTable"
      :reservation-data="arrivalReservation"
      @success="arrivalSuccess"
    />
  </div>
</template>
<script setup lang="ts">
  import { useTable } from '@/hooks/core/useTable'
  import { h, nextTick, onMounted, reactive, ref } from 'vue'
  import { Icon } from '@iconify/vue'
  import {
    ElMessage,
    ElMessageBox,
    type FormInstance,
    type FormRules,
    type TagProps
  } from 'element-plus'
  import {
    fetchCancelTableReservation,
    fetchCreateTableReservation,
    fetchNoShowTableReservation,
    fetchTablePageList,
    fetchTableReservationPage,
    fetchUpdateTableReservation,
    type TableItem,
    type TableReservationItem,
    type TableReservationPayload
  } from '@/api/cashier'
  import { useManagedStores } from '@/views/device/composables/useManagedStores'
  import type { Id } from '@/types/backend'
  import OpenTableDialog from '../tableCashier/components/open-table-dialog.vue'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  defineOptions({ name: 'TableReservationManage' })
  const statuses = [
    { label: '待到店', value: 0 },
    { label: '已到店', value: 1 },
    { label: '已完成', value: 2 },
    { label: '已取消', value: 3 },
    { label: '已爽约', value: 4 }
  ]
  const {
    storeOptions,
    storesLoading,
    storesError,
    loadStores,
    resolveStoreId,
    defaultStoreId,
    storeRules
  } = useManagedStores()
  const search = reactive({
    storeId: undefined as string | undefined,
    tableId: undefined as Id | undefined,
    phone: '',
    status: undefined as number | undefined,
    range: [] as string[]
  })
  const searchExpanded = ref(false)
  const visible = ref(false),
    saving = ref(false),
    tablesLoading = ref(false),
    tables = ref<TableItem[]>([]),
    filterTablesLoading = ref(false),
    filterTables = ref<TableItem[]>([]),
    arrivalVisible = ref(false),
    arrivalTable = ref<TableItem | null>(null),
    arrivalReservation = ref<TableReservationItem | null>(null)
  const mode = ref<'create' | 'edit'>('create'),
    formRef = ref<FormInstance>()
  const form = reactive({
    id: undefined as Id | undefined,
    storeId: undefined as string | undefined,
    tableId: undefined as Id | undefined,
    reservationPhone: '',
    peopleCount: 1,
    expectedArrivalTime: '',
    expectedEndTime: '',
    reservationRemark: ''
  })
  const rules: FormRules = {
    storeId: storeRules,
    tableId: [{ required: true, message: '请选择预约桌位', trigger: 'change' }],
    reservationPhone: [
      { required: true, message: '请输入手机号', trigger: 'blur' },
      { pattern: /^1\d{10}$/, message: '请输入正确的11位手机号', trigger: 'blur' }
    ],
    peopleCount: [{ required: true, message: '请输入预约人数', trigger: 'change' }],
    expectedArrivalTime: [{ required: true, message: '请选择预计到店时间', trigger: 'change' }],
    expectedEndTime: [{ required: true, message: '请选择预计结束时间', trigger: 'change' }]
  }
  async function loadTables(storeId?: string, selected?: TableReservationItem) {
    tables.value = []
    if (!storeId) return
    tablesLoading.value = true
    try {
      const all: TableItem[] = []
      let currentPage = 1
      for (;;) {
        const r: any = await fetchTablePageList({ currentPage, pageSize: 100, storeId })
        all.push(...(r?.records || []))
        if (!r?.records?.length || all.length >= Number(r?.total || 0)) break
        currentPage++
      }
      if (selected && !all.some((t) => String(t.id) === String(selected.tableId)))
        all.unshift({
          id: Number(selected.tableId),
          tableNumber: selected.tableNumber || String(selected.tableId),
          tableName: selected.tableName,
          seats: selected.peopleCount,
          status: '未知',
          storeId: selected.storeId
        })
      tables.value = all
    } catch (e: any) {
      ElMessage.error(e?.message || '桌位加载失败')
    } finally {
      tablesLoading.value = false
    }
  }
  async function loadFilterTables(storeId?: string) {
    filterTables.value = []
    if (!storeId) return
    filterTablesLoading.value = true
    try {
      const all: TableItem[] = []
      let currentPage = 1
      for (;;) {
        const r: any = await fetchTablePageList({ currentPage, pageSize: 100, storeId })
        const records = r?.records || []
        all.push(...records)
        if (!records.length || all.length >= Number(r?.total || 0)) break
        currentPage++
      }
      filterTables.value = all
    } catch (e: any) {
      ElMessage.error(e?.message || '桌位筛选项加载失败')
    } finally {
      filterTablesLoading.value = false
    }
  }
  async function searchStoreChanged(storeId?: string) {
    search.tableId = undefined
    await loadFilterTables(storeId)
  }
  async function query() {
    replaceSearchParams({
      storeId: search.storeId,
      tableId: search.tableId,
      phone: search.phone || undefined,
      status: search.status,
      startTime: search.range?.[0],
      endTime: search.range?.[1]
    })
    await getData()
  }
  async function reset() {
    Object.assign(search, {
      storeId: undefined,
      tableId: undefined,
      phone: '',
      status: undefined,
      range: []
    })
    filterTables.value = []
    await resetSearchParams()
  }
  const digits = (v: unknown) =>
      String(v || '')
        .replace(/\D/g, '')
        .slice(0, 11),
    pad = (n: number) => String(n).padStart(2, '0'),
    dateValue = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
        d.getMinutes()
      )}:00`
  function defaults() {
    const start = new Date(Date.now() + 3600000)
    start.setMinutes(Math.ceil(start.getMinutes() / 10) * 10, 0, 0)
    return { start: dateValue(start), end: dateValue(new Date(start.getTime() + 7200000)) }
  }
  async function openCreate() {
    mode.value = 'create'
    const t = defaults()
    Object.assign(form, {
      id: undefined,
      storeId: resolveStoreId(search.storeId) ?? defaultStoreId.value,
      tableId: undefined,
      reservationPhone: '',
      peopleCount: 1,
      expectedArrivalTime: t.start,
      expectedEndTime: t.end,
      reservationRemark: ''
    })
    visible.value = true
    await loadTables(form.storeId)
    await nextTick()
    formRef.value?.clearValidate()
  }
  async function openEdit(row: TableReservationItem) {
    if (row.status !== 0) return
    const storeId = resolveStoreId(row.storeId)
    if (!storeId) return void ElMessage.error('该预约门店不在当前授权范围内')
    mode.value = 'edit'
    Object.assign(form, {
      id: row.id,
      storeId,
      tableId: row.tableId,
      reservationPhone: row.reservationPhone,
      peopleCount: row.peopleCount,
      expectedArrivalTime: row.expectedArrivalTime,
      expectedEndTime: row.expectedEndTime,
      reservationRemark: row.reservationRemark || ''
    })
    visible.value = true
    await loadTables(storeId, row)
    await nextTick()
    formRef.value?.clearValidate()
  }
  async function storeChanged(v?: string) {
    form.tableId = undefined
    await loadTables(v)
  }
  async function submit() {
    if (!formRef.value) return
    await formRef.value.validate()
    const a = new Date(form.expectedArrivalTime.replace(' ', 'T')).getTime(),
      b = new Date(form.expectedEndTime.replace(' ', 'T')).getTime()
    if (a < Date.now() - 300000) return void ElMessage.warning('预计到店时间不能早于当前时间')
    if (b <= a) return void ElMessage.warning('预计结束时间必须晚于到店时间')
    saving.value = true
    try {
      const data: TableReservationPayload = {
        id: form.id,
        tableId: form.tableId!,
        reservationPhone: form.reservationPhone,
        peopleCount: form.peopleCount,
        expectedArrivalTime: form.expectedArrivalTime,
        expectedEndTime: form.expectedEndTime,
        reservationRemark: form.reservationRemark || undefined
      }
      mode.value === 'edit'
        ? await fetchUpdateTableReservation(data)
        : await fetchCreateTableReservation(data)
      ElMessage.success(mode.value === 'edit' ? '预约已更新' : '预约创建成功')
      visible.value = false
      await (mode.value === 'edit' ? refreshUpdate() : refreshCreate())
    } catch (e: any) {
      ElMessage.error(e?.message || e?.msg || '预约保存失败')
    } finally {
      saving.value = false
    }
  }
  async function cancel(row: TableReservationItem) {
    try {
      const { value } = await ElMessageBox.prompt('可填写取消原因（选填）', '取消预约', {
        inputValidator: (t) => !t || t.length <= 200 || '取消原因不能超过200个字符'
      })
      await fetchCancelTableReservation(row.id, value || undefined)
      ElMessage.success('预约已取消')
      await refreshUpdate()
    } catch (e: any) {
      if (e !== 'cancel' && e !== 'close') ElMessage.error(e?.message || '取消预约失败')
    }
  }
  async function noShow(row: TableReservationItem) {
    try {
      await ElMessageBox.confirm('确认将该预约标记为爽约？', '标记爽约', { type: 'warning' })
      await fetchNoShowTableReservation(row.id)
      ElMessage.success('已标记爽约')
      await refreshUpdate()
    } catch (e: any) {
      if (e !== 'cancel' && e !== 'close') ElMessage.error(e?.message || '标记爽约失败')
    }
  }
  async function arrive(row: TableReservationItem) {
    const storeId = resolveStoreId(row.storeId)
    if (!storeId) return void ElMessage.error('该预约门店不在当前授权范围内')
    await loadTables(storeId, row)
    const table = tables.value.find((item) => String(item.id) === String(row.tableId))
    if (!table) return void ElMessage.error('预约桌位不存在或已无权访问')
    if (table.status === '停用') return void ElMessage.warning('该桌位已停用，请先在餐桌管理中恢复')
    arrivalTable.value = table
    arrivalReservation.value = row
    arrivalVisible.value = true
  }
  async function arrivalSuccess() {
    arrivalReservation.value = null
    arrivalTable.value = null
    await refreshUpdate()
  }
  const fmt = (v?: string) => v?.slice(0, 16) || '-',
    storeName = (id?: Id) => storeOptions.value.find((s) => s.value === String(id))?.label || '-',
    tableLabel = (t: TableItem) =>
      `${t.tableNumber}${t.tableName ? ` / ${t.tableName}` : ''}${
        t.seats ? `（${t.seats}人）` : ''
      }`,
    past = (d: Date) => d.getTime() < new Date().setHours(0, 0, 0, 0),
    tagType = (s: number) =>
      ({ 0: 'warning', 1: 'success', 2: 'info', 3: 'info', 4: 'danger' })[s] as TagProps['type']
  onMounted(async () => {
    await loadStores()
    search.storeId = defaultStoreId.value
    await loadFilterTables(search.storeId)
    await query()
  })

  const {
    data: rows,
    columns: tableColumns,
    loading,
    pagination,
    getData,
    resetSearchParams,
    replaceSearchParams,
    handleSizeChange,
    handleCurrentChange,
    refreshCreate,
    refreshUpdate
  } = useTable({
    core: {
      apiFn: fetchTableReservationPage,
      apiParams: {
        currentPage: 1,
        pageSize: 20
      },
      paginationKey: {
        current: 'currentPage',
        size: 'pageSize'
      },
      immediate: false,
      columnsFactory: () => [
        {
          prop: 'tableColumnsColumn1',
          label: '门店',
          minWidth: 145,
          useSlot: true,
          slotName: 'tableColumnsSlot1'
        },
        {
          prop: 'tableColumnsColumn2',
          label: '桌号/桌名',
          minWidth: 140,
          useSlot: true,
          slotName: 'tableColumnsSlot2'
        },
        { prop: 'reservationPhone', label: '手机号', width: 125 },
        { prop: 'peopleCount', label: '人数', width: 70, align: 'center' },
        {
          prop: 'tableColumnsColumn5',
          label: '预约时段',
          minWidth: 220,
          useSlot: true,
          slotName: 'tableColumnsSlot5'
        },
        {
          prop: 'tableColumnsColumn6',
          label: '状态',
          width: 90,
          align: 'center',
          useSlot: true,
          slotName: 'tableColumnsSlot6'
        },
        {
          label: '备注',
          prop: 'reservationRemark',
          minWidth: 150,
          showOverflowTooltip: true,
          useSlot: true,
          slotName: 'tableColumnsSlot7'
        },
        {
          prop: 'operation',
          label: '操作',
          width: 100,
          fixed: 'right',
          formatter: (row: TableReservationItem) =>
            row.status === 0
              ? h(
                  'div',
                  {
                    style: 'display: flex; gap: 5px; flex-wrap: wrap; align-items: center;'
                  },
                  [
                    h(ArtButtonTable, {
                      auth: ['restaurant:table:open', 'operations:table-cashier:open'],
                      icon: 'ri:login-box-line',
                      label: '办理到店',
                      iconColor: '#67c23a',
                      buttonBgColor: '#f0f9eb',
                      style: 'margin-right: 0;',
                      onClick: () => arrive(row)
                    }),
                    h(ArtButtonTable, {
                      type: 'edit',
                      label: '编辑预约',
                      style: 'margin-right: 0;',
                      onClick: () => openEdit(row)
                    }),
                    h(ArtButtonTable, {
                      icon: 'ri:close-circle-line',
                      label: '取消预约',
                      iconColor: '#e6a23c',
                      buttonBgColor: '#fdf6ec',
                      style: 'margin-right: 0;',
                      onClick: () => cancel(row)
                    }),
                    h(ArtButtonTable, {
                      icon: 'ri:user-unfollow-line',
                      label: '标记爽约',
                      iconColor: '#f56c6c',
                      buttonBgColor: '#fef0f0',
                      style: 'margin-right: 0;',
                      onClick: () => noShow(row)
                    })
                  ]
                )
              : h('span', { class: 'muted' }, '-')
        }
      ]
    },
    hooks: {
      onError: (error) => ElMessage.error(error.message || '预约记录加载失败')
    }
  })
</script>
<style scoped lang="scss">
  .page {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .search-card :deep(.el-card__body) {
    padding-bottom: 0;
  }
  .search-primary-row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
    gap: 0 16px;
    align-items: start;
  }
  .search-more-row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
    gap: 0 16px;
    margin-top: 12px;
  }
  .search-more-row .arrival-range {
    grid-column: span 2;
  }
  .search-actions {
    display: flex;
    flex-wrap: nowrap;
    gap: 8px;
    justify-self: end;
  }
  .search-actions :deep(.el-button) {
    margin-left: 0;
  }
  .reservation-search-form :deep(.el-form-item) {
    min-width: 0;
    margin-bottom: 0;
  }
  .reservation-search-form :deep(.el-form-item__content),
  .reservation-search-form :deep(.el-select),
  .reservation-search-form :deep(.el-input),
  .reservation-search-form :deep(.el-date-editor) {
    min-width: 0;
    width: 100%;
  }
  .list-card {
    flex: 1;
    min-height: 0;
  }
  .list-card :deep(.el-card__body) {
    display: flex;
    flex-direction: column;
    height: 100%;
    box-sizing: border-box;
    overflow: hidden;
  }
  .list-card :deep(.art-table) {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    height: auto !important;
  }
  .list-card :deep(.art-table > .el-table) {
    flex: 1;
    min-height: 0;
    height: auto !important;
  }
  .list-card :deep(.art-table > .pagination) {
    flex-shrink: 0;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }
  .header h3 {
    margin: 0 0 4px;
    font-size: 17px;
  }
  .header span,
  small,
  .muted {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 18px;
  }

  @media (max-width: 1199px) {
    .search-primary-row,
    .search-more-row {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .search-actions {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 768px) {
    .header {
      align-items: flex-start;
      gap: 12px;
    }
    .grid,
    .search-primary-row,
    .search-more-row {
      grid-template-columns: minmax(0, 1fr);
    }
    .search-more-row .arrival-range,
    .search-actions {
      grid-column: auto;
    }
    .search-actions {
      flex-wrap: wrap;
      justify-self: stretch;
    }
  }
</style>
