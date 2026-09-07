<!-- 活动奖品配置弹窗 -->
<template>
  <ElDialog
    v-model="dialogVisible"
    :title="`活动奖品配置 - ${activityData?.name || ''}`"
    width="900px"
    align-center
    destroy-on-close
  >
    <div class="activity-prize">
      <!-- 操作栏 -->
      <div class="flex justify-between mb-4">
        <ElButton v-auth="'marketing:lottery:prize'" type="primary" @click="showAddPrizeDialog"
          >添加奖品到活动</ElButton
        >
        <div class="flex items-center gap-2">
          <ElTag type="info"> 总奖品数: {{ activityPrizeList.length }} </ElTag>
          <ElTag type="success"> 总库存: {{ totalStock }} </ElTag>
        </div>
      </div>

      <!-- 活动奖品列表 -->
      <ArtTable
        :data="activityPrizeList"
        v-loading="loading"
        max-height="400px"
        :columns="tableColumns"
      >
        <template #tableColumnsSlot2="{ row }">
          <ElImage
            v-if="row.imgUrl"
            :src="row.imgUrl"
            style="width: 50px; height: 50px; border-radius: 4px"
            fit="cover"
            :preview-src-list="[row.imgUrl]"
            preview-teleported
          />
          <span v-else style="color: #909399">-</span>
        </template>
        <template #tableColumnsSlot4="{ row }">
          <ElTag :type="getPrizeTypeConfig(row.type).type" size="small">
            {{ getPrizeTypeConfig(row.type).text }}
          </ElTag>
        </template>
        <template #tableColumnsSlot5="{ row }">
          {{ row.probability ? `${(row.probability * 100).toFixed(2)}%` : '-' }}
        </template>
        <template #tableColumnsSlot6="{ row }">
          <div class="flex flex-col gap-1">
            <ElProgress
              :percentage="
                row.totalStock > 0 ? Math.round((row.surplusStock / row.totalStock) * 100) : 0
              "
              :stroke-width="10"
              :format="() => `${row.surplusStock}/${row.totalStock}`"
            />
            <div class="text-xs text-gray-500">
              已发放: {{ row.totalStock - row.surplusStock }}
            </div>
          </div>
        </template>
        <template #tableColumnsSlot7="{ row }">
          <ElTag :type="row.enabled === 1 ? 'success' : 'danger'" size="small">
            {{ row.enabled === 1 ? '启用' : '禁用' }}
          </ElTag>
        </template>
      </ArtTable>
    </div>

    <!-- 添加奖品子弹窗 -->
    <ElDialog
      v-model="addPrizeDialogVisible"
      title="添加奖品到活动"
      width="500px"
      align-center
      append-to-body
      destroy-on-close
    >
      <ArtForm
        ref="addPrizeFormRef"
        :model="addPrizeFormData"
        :rules="addPrizeRules"
        label-width="100px"
      >
        <ElFormItem label="选择奖品" prop="prizeId">
          <ElSelect
            v-model="addPrizeFormData.prizeId"
            placeholder="请选择奖品"
            style="width: 100%"
            filterable
          >
            <ElOption
              v-for="prize in availablePrizes"
              :key="prize.id"
              :label="prize.name"
              :value="prize.id ?? ''"
            >
              <div class="flex items-center justify-between">
                <span>{{ prize.name }}</span>
                <ElTag size="small" :type="getPrizeTypeConfig(prize.type).type">
                  {{ getPrizeTypeConfig(prize.type).text }}
                </ElTag>
              </div>
            </ElOption>
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="初始库存" prop="totalStock">
          <ElInputNumber
            v-model="addPrizeFormData.totalStock"
            :min="1"
            :max="999999"
            placeholder="请输入初始库存"
            style="width: 100%"
          />
        </ElFormItem>
      </ArtForm>

      <template #footer>
        <ElButton @click="addPrizeDialogVisible = false">取消</ElButton>
        <ElButton
          v-auth="'marketing:lottery:prize'"
          type="primary"
          :loading="addPrizeLoading"
          @click="handleAddPrize"
          >添加</ElButton
        >
      </template>
    </ElDialog>

    <!-- 库存调整子弹窗 -->
    <ElDialog
      v-model="stockDialogVisible"
      :title="stockDialogType === 'increase' ? '增加库存' : '扣减库存'"
      width="400px"
      align-center
      append-to-body
      destroy-on-close
    >
      <ArtForm ref="stockFormRef" :model="stockFormData" :rules="stockRules" label-width="100px">
        <ElFormItem label="奖品名称">
          <ElInput :value="currentPrize?.name" disabled />
        </ElFormItem>
        <ElFormItem label="当前库存">
          <ElInput
            :value="`${currentPrize?.surplusStock || 0} / ${currentPrize?.totalStock || 0}`"
            disabled
          />
        </ElFormItem>
        <ElFormItem :label="stockDialogType === 'increase' ? '增加数量' : '扣减数量'" prop="amount">
          <ElInputNumber
            v-model="stockFormData.amount"
            :min="1"
            :max="stockDialogType === 'decrease' ? currentPrize?.surplusStock || 1 : 999999"
            placeholder="请输入数量"
            style="width: 100%"
          />
        </ElFormItem>
      </ArtForm>

      <template #footer>
        <ElButton @click="stockDialogVisible = false">取消</ElButton>
        <ElButton
          v-auth="'marketing:lottery:stock'"
          :type="stockDialogType === 'increase' ? 'primary' : 'warning'"
          :loading="stockLoading"
          @click="handleStockChange"
        >
          确定
        </ElButton>
      </template>
    </ElDialog>

    <template #footer>
      <ElButton @click="dialogVisible = false">关闭</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { useTable } from '@/hooks/core/useTable'
  import { h, ref, reactive, computed, watch } from 'vue'
  import type { FormInstance, FormRules } from 'element-plus'
  import {
    ElDialog,
    ElButton,
    ElInput,
    ElImage,
    ElTag,
    ElProgress,
    ElFormItem,
    ElSelect,
    ElOption,
    ElInputNumber,
    ElMessage,
    ElMessageBox
  } from 'element-plus'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import {
    fetchGetActivityPrizes,
    fetchGetEnabledPrizeList,
    fetchAddActivityPrize,
    fetchRemoveActivityPrize,
    fetchIncreaseInventory,
    fetchDeductInventory
  } from '@/api/lottery-manage'
  import {
    PrizeTypeEnumMap,
    BooleanEnumMap,
    convertListToNumber,
    getEnumNumber,
    getEnumText
  } from '@/utils/enum'

  interface Props {
    visible: boolean
    activityData?: Partial<Api.Lottery.ActivityListItem>
  }

  interface Emits {
    (e: 'update:visible', value: boolean): void
    (e: 'success'): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  // 对话框显示控制
  const dialogVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
  })

  const allPrizeList = ref<Api.Lottery.PrizeListItem[]>([])

  // 奖品类型展示配置
  const getPrizeTypeConfig = (type: Api.Lottery.PrizeType | string | undefined) => {
    const num = getEnumNumber(type as any, PrizeTypeEnumMap)
    const text = getEnumText(type as any, PrizeTypeEnumMap) || '未知'
    let tagType: 'success' | 'warning' | 'info' | 'danger' = 'info'

    if (num === 0) tagType = 'success'
    else if (num === 1) tagType = 'warning'
    else if (num === 2) tagType = 'info'
    else if (num === 3) tagType = 'danger'

    return { type: tagType, text }
  }

  // 计算总库存
  const totalStock = computed(() => {
    return activityPrizeList.value.reduce((sum, item) => sum + (item.surplusStock || 0), 0)
  })

  // 可添加的奖品（排除已添加的）
  const availablePrizes = computed(() => {
    const addedIds = new Set(activityPrizeList.value.map((item) => item.id))
    return allPrizeList.value.filter((prize) => !addedIds.has(prize.id))
  })

  // 添加奖品弹窗
  const addPrizeDialogVisible = ref(false)
  const addPrizeFormRef = ref<FormInstance>()
  const addPrizeLoading = ref(false)
  const addPrizeFormData = reactive({
    prizeId: undefined as number | undefined,
    totalStock: 100
  })

  const addPrizeRules: FormRules = {
    prizeId: [{ required: true, message: '请选择奖品', trigger: 'change' }],
    totalStock: [{ required: true, message: '请输入初始库存', trigger: 'blur' }]
  }

  // 库存调整弹窗
  const stockDialogVisible = ref(false)
  const stockDialogType = ref<'increase' | 'decrease'>('increase')
  const stockFormRef = ref<FormInstance>()
  const stockLoading = ref(false)
  const currentPrize = ref<Api.Lottery.ActivityPrizeVO | null>(null)
  const stockFormData = reactive({
    amount: 10
  })

  const stockRules: FormRules = {
    amount: [{ required: true, message: '请输入数量', trigger: 'blur' }]
  }

  // 获取所有可用奖品
  const fetchAllPrizes = async () => {
    try {
      const result = await fetchGetEnabledPrizeList()
      allPrizeList.value = result || []
    } catch (error: any) {
      console.error('获取奖品列表失败', error)
    }
  }

  // 显示添加奖品弹窗
  const showAddPrizeDialog = () => {
    addPrizeFormData.prizeId = undefined
    addPrizeFormData.totalStock = 100
    addPrizeDialogVisible.value = true
  }

  // 添加奖品
  const handleAddPrize = async () => {
    try {
      if (!addPrizeFormRef.value) return

      const valid = await addPrizeFormRef.value.validate()
      if (!valid) return

      addPrizeLoading.value = true

      await fetchAddActivityPrize({
        activityId: props.activityData?.id!,
        prizeId: addPrizeFormData.prizeId!,
        totalStock: addPrizeFormData.totalStock
      })

      ElMessage.success('添加成功')
      addPrizeDialogVisible.value = false
      await refreshCreate()
      emit('success')
    } catch (error: any) {
      ElMessage.error(error.message || '添加失败')
    } finally {
      addPrizeLoading.value = false
    }
  }

  // 移除奖品
  const handleRemovePrize = (row: Api.Lottery.ActivityPrizeVO) => {
    ElMessageBox.confirm(`确定要从活动中移除奖品「${row.name}」吗？`, '移除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(async () => {
        try {
          await fetchRemoveActivityPrize(props.activityData?.id!, row.id!)
          ElMessage.success('移除成功')
          await refreshRemove()
          emit('success')
        } catch (error: any) {
          ElMessage.error(error.message || '移除失败')
        }
      })
      .catch(() => {
        ElMessage.info('已取消')
      })
  }

  // 显示库存调整弹窗
  const showStockDialog = (row: Api.Lottery.ActivityPrizeVO, type: 'increase' | 'decrease') => {
    currentPrize.value = row
    stockDialogType.value = type
    stockFormData.amount = 10
    stockDialogVisible.value = true
  }

  // 库存调整
  const handleStockChange = async () => {
    try {
      if (!stockFormRef.value) return

      const valid = await stockFormRef.value.validate()
      if (!valid) return

      stockLoading.value = true

      if (stockDialogType.value === 'increase') {
        await fetchIncreaseInventory(
          props.activityData?.id!,
          currentPrize.value?.id!,
          stockFormData.amount
        )
        ElMessage.success('库存增加成功')
      } else {
        await fetchDeductInventory(
          props.activityData?.id!,
          currentPrize.value?.id!,
          stockFormData.amount
        )
        ElMessage.success('库存扣减成功')
      }

      stockDialogVisible.value = false
      await refreshUpdate()
    } catch (error: any) {
      ElMessage.error(error.message || '操作失败')
    } finally {
      stockLoading.value = false
    }
  }

  // 监听对话框显示
  watch(
    () => props.visible,
    (visible) => {
      if (visible) {
        replaceSearchParams({ activityId: props.activityData?.id })
        void getData()
        void fetchAllPrizes()
      }
    },
    { immediate: true }
  )

  const fetchActivityPrizeRows = (params: { activityId?: number }) =>
    params.activityId
      ? fetchGetActivityPrizes(params.activityId)
      : Promise.resolve([] as Api.Lottery.ActivityPrizeVO[])

  const {
    data: activityPrizeList,
    columns: tableColumns,
    loading,
    getData,
    replaceSearchParams,
    refreshCreate,
    refreshUpdate,
    refreshRemove
  } = useTable({
    core: {
      apiFn: fetchActivityPrizeRows,
      immediate: false,
      columnsFactory: () => [
        { prop: 'id', label: 'ID', width: 60 },
        {
          prop: 'imgUrl',
          label: '图片',
          width: 80,
          align: 'center',
          useSlot: true,
          slotName: 'tableColumnsSlot2'
        },
        { prop: 'name', label: '奖品名称', minWidth: 120 },
        {
          prop: 'type',
          label: '奖品类型',
          width: 100,
          useSlot: true,
          slotName: 'tableColumnsSlot4'
        },
        {
          prop: 'probability',
          label: '中奖概率',
          width: 100,
          align: 'center',
          useSlot: true,
          slotName: 'tableColumnsSlot5'
        },
        {
          prop: 'tableColumnsColumn6',
          label: '库存情况',
          width: 200,
          useSlot: true,
          slotName: 'tableColumnsSlot6'
        },
        {
          prop: 'enabled',
          label: '状态',
          width: 80,
          align: 'center',
          useSlot: true,
          slotName: 'tableColumnsSlot7'
        },
        {
          prop: 'operation',
          label: '操作',
          width: 120,
          fixed: 'right',
          formatter: (row: Api.Lottery.ActivityPrizeVO) =>
            h('div', { class: 'flex items-center flex-wrap gap-1' }, [
              h(ArtButtonTable, {
                auth: 'marketing:lottery:stock',
                icon: 'ri:add-circle-line',
                iconColor: '#67c23a',
                buttonBgColor: '#f0f9eb',
                label: '增加库存',
                onClick: () => showStockDialog(row, 'increase')
              }),
              h(ArtButtonTable, {
                auth: 'marketing:lottery:stock',
                icon: 'ri:indeterminate-circle-line',
                iconColor: '#e6a23c',
                buttonBgColor: '#fdf6ec',
                label: '扣减库存',
                onClick: () => showStockDialog(row, 'decrease')
              }),
              h(ArtButtonTable, {
                auth: 'marketing:lottery:prize',
                type: 'delete',
                onClick: () => handleRemovePrize(row)
              })
            ])
        }
      ]
    },
    transform: {
      dataTransformer: (data) =>
        convertListToNumber(data, {
          type: PrizeTypeEnumMap,
          enabled: BooleanEnumMap
        }) as Api.Lottery.ActivityPrizeVO[]
    }
  })
</script>

<style lang="scss" scoped>
  .activity-prize {
    min-height: 300px;
  }
</style>
