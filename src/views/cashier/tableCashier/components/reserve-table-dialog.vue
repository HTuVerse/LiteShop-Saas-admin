<template>
  <ElDialog
    v-model="dialogVisible"
    :title="`当前桌位预约 - ${tableData?.tableNumber || ''} ${tableData?.tableName || ''}`"
    width="min(920px, 94vw)"
    align-center
    :close-on-click-modal="false"
  >
    <template v-if="!creating">
      <div class="toolbar">
        <ElTabs v-model="statusGroup" @tab-change="tabChanged"
          ><ElTabPane label="当前预约" name="active" /><ElTabPane label="预约历史" name="history"
        /></ElTabs>
        <ElButton
          v-auth="[
            'restaurant:table:status',
            'operations:table-cashier:status',
            'operations:table-reservation'
          ]"
          type="primary"
          :disabled="tableData?.status === '停用'"
          @click="openCreate"
          ><Icon icon="ri:add-line" />新增当前桌位预约</ElButton
        >
      </div>
      <ArtTable
        :loading="loading"
        :data="records"
        height="390"
        stripe
        :columns="tableColumns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      >
        <template #empty
          ><ElEmpty :description="statusGroup === 'active' ? '暂无活动预约' : '暂无近期预约'"
        /></template>
        <template #tableColumnsSlot3="{ row }"
          ><div>{{ fmt(row.expectedArrivalTime) }}</div
          ><small>至 {{ fmt(row.expectedEndTime) }}</small></template
        >
        <template #tableColumnsSlot4="{ row }"
          ><ElTag :type="tagType(row.status)">{{ row.statusDesc }}</ElTag></template
        >
        <template #tableColumnsSlot5="{ row }">{{ row.reservationRemark || '-' }}</template>
      </ArtTable>
    </template>
    <template v-else>
      <div class="heading"
        ><ElButton link @click="creating = false"
          ><Icon icon="ri:arrow-left-line" />返回当前桌位预约</ElButton
        ><strong>新增当前桌位预约</strong></div
      >
      <ArtForm ref="formRef" :model="form" :rules="rules" label-width="110px">
        <div class="grid">
          <ElFormItem label="手机号码" prop="reservationPhone"
            ><ElInput
              v-model="form.reservationPhone"
              maxlength="11"
              clearable
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
            :rows="4"
            maxlength="200"
            show-word-limit
        /></ElFormItem>
      </ArtForm>
      <div class="footer"
        ><ElButton @click="creating = false">取消新增</ElButton
        ><ElButton type="primary" :loading="saving" @click="submit">保存当前桌位预约</ElButton></div
      >
    </template>
  </ElDialog>
</template>
<script setup lang="ts">
  import { useTable } from '@/hooks/core/useTable'
  import { computed, nextTick, reactive, ref, watch } from 'vue'
  import { Icon } from '@iconify/vue'
  import { ElMessage, type FormInstance, type FormRules, type TagProps } from 'element-plus'
  import {
    fetchCreateTableReservation,
    fetchTableReservationPage,
    type TableItem,
    type TableReservationItem
  } from '@/api/cashier'
  const props = defineProps<{ visible: boolean; tableData: TableItem | null }>(),
    emit = defineEmits<{
      (e: 'update:visible', v: boolean): void
      (e: 'success'): void
    }>()
  const dialogVisible = computed({
      get: () => props.visible,
      set: (v) => emit('update:visible', v)
    }),
    statusGroup = ref<'active' | 'history'>('active'),
    saving = ref(false),
    creating = ref(false),
    formRef = ref<FormInstance>()
  const form = reactive({
    reservationPhone: '',
    peopleCount: 1,
    expectedArrivalTime: '',
    expectedEndTime: '',
    reservationRemark: ''
  })
  const rules: FormRules = {
    reservationPhone: [
      { required: true, message: '请输入手机号', trigger: 'blur' },
      { pattern: /^1\d{10}$/, message: '请输入正确的11位手机号', trigger: 'blur' }
    ],
    peopleCount: [{ required: true, message: '请输入预约人数', trigger: 'change' }],
    expectedArrivalTime: [{ required: true, message: '请选择预计到店时间', trigger: 'change' }],
    expectedEndTime: [{ required: true, message: '请选择预计结束时间', trigger: 'change' }]
  }
  watch(
    () => props.visible,
    (v) => {
      if (v) {
        statusGroup.value = 'active'
        creating.value = false
        replaceSearchParams({ tableId: props.tableData?.id, statusGroup: statusGroup.value })
        void getData()
      }
    }
  )
  async function tabChanged() {
    replaceSearchParams({ tableId: props.tableData?.id, statusGroup: statusGroup.value })
    await getData()
  }
  const pad = (n: number) => String(n).padStart(2, '0'),
    value = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
        d.getMinutes()
      )}:00`,
    digits = (v: unknown) =>
      String(v || '')
        .replace(/\D/g, '')
        .slice(0, 11)
  function openCreate() {
    const start = new Date(Date.now() + 3600000)
    start.setMinutes(Math.ceil(start.getMinutes() / 10) * 10, 0, 0)
    Object.assign(form, {
      reservationPhone: '',
      peopleCount: Math.min(props.tableData?.seats || 1, 30),
      expectedArrivalTime: value(start),
      expectedEndTime: value(new Date(start.getTime() + 7200000)),
      reservationRemark: ''
    })
    creating.value = true
    nextTick(() => formRef.value?.clearValidate())
  }
  async function submit() {
    if (!formRef.value || !props.tableData) return
    await formRef.value.validate()
    const a = new Date(form.expectedArrivalTime.replace(' ', 'T')).getTime(),
      b = new Date(form.expectedEndTime.replace(' ', 'T')).getTime()
    if (a < Date.now() - 300000) return void ElMessage.warning('预计到店时间不能早于当前时间')
    if (b <= a) return void ElMessage.warning('预计结束时间必须晚于到店时间')
    saving.value = true
    try {
      await fetchCreateTableReservation({
        ...form,
        tableId: props.tableData.id,
        reservationRemark: form.reservationRemark || undefined
      })
      ElMessage.success('当前桌位预约创建成功')
      creating.value = false
      statusGroup.value = 'active'
      replaceSearchParams({ tableId: props.tableData.id, statusGroup: statusGroup.value })
      await refreshCreate()
      emit('success')
    } catch (e: any) {
      ElMessage.error(e?.message || e?.msg || '预约保存失败')
    } finally {
      saving.value = false
    }
  }
  const fmt = (v?: string) => v?.slice(0, 16) || '-',
    past = (d: Date) => d.getTime() < new Date().setHours(0, 0, 0, 0),
    tagType = (s: number) =>
      ({ 0: 'warning', 1: 'success', 2: 'info', 3: 'info', 4: 'danger' }[s] as TagProps['type'])

  const {
    data: records,
    columns: tableColumns,
    loading,
    pagination,
    getData,
    replaceSearchParams,
    handleSizeChange,
    handleCurrentChange,
    refreshCreate
  } = useTable({
    core: {
      apiFn: fetchTableReservationPage,
      apiParams: { currentPage: 1, pageSize: 10 },
      paginationKey: { current: 'currentPage', size: 'pageSize' },
      immediate: false,
      columnsFactory: () => [
        { label: '手机号', prop: 'reservationPhone', width: 130 },
        { label: '人数', prop: 'peopleCount', width: 76, align: 'center' },
        {
          prop: 'tableColumnsColumn3',
          label: '预约时段',
          minWidth: 235,
          useSlot: true,
          slotName: 'tableColumnsSlot3'
        },
        {
          prop: 'tableColumnsColumn4',
          label: '状态',
          width: 90,
          align: 'center',
          useSlot: true,
          slotName: 'tableColumnsSlot4'
        },
        {
          label: '备注',
          prop: 'reservationRemark',
          minWidth: 145,
          showOverflowTooltip: true,
          useSlot: true,
          slotName: 'tableColumnsSlot5'
        }
      ]
    },
    hooks: {
      onError: (error) => ElMessage.error(error.message || '预约记录加载失败')
    }
  })
</script>
<style scoped lang="scss">
  .toolbar {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
  }
  .toolbar :deep(.el-tabs__header) {
    margin-bottom: 12px;
  }
  .footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 16px;
  }
  .heading {
    display: flex;
    gap: 18px;
    align-items: center;
    margin-bottom: 24px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 18px;
  }
  small,
  .muted {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  @media (max-width: 768px) {
    .toolbar {
      flex-direction: column;
      gap: 8px;
    }
    .grid {
      grid-template-columns: 1fr;
    }
  }
</style>
