<template>
  <ElDialog
    v-model="dialogVisible"
    :title="`开桌 - ${tableData?.tableNumber || ''} ${tableData?.tableName || ''}`"
    width="500px"
    align-center
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <ArtForm ref="formRef" :model="formData" :rules="rules" label-width="100px">
      <ElFormItem label="桌位信息">
        <div class="table-info-display">
          <div class="info-item">
            <span class="label">桌位编号：</span>
            <span class="value">{{ tableData?.tableNumber }}</span>
          </div>
          <div class="info-item">
            <span class="label">桌位名称：</span>
            <span class="value">{{ tableData?.tableName || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="label">可容纳人数：</span>
            <span class="value">{{ tableData?.seats }}人</span>
          </div>
          <div v-if="tableData?.location" class="info-item">
            <span class="label">位置区域：</span>
            <span class="value">{{ tableData?.location }}</span>
          </div>
        </div>
      </ElFormItem>

      <ElFormItem v-if="reservationData" label="预约信息">
        <div class="reservation-info">
          <div>手机号：{{ reservationData.reservationPhone }}</div>
          <div>预约时段：{{ reservationData.expectedArrivalTime }} 至 {{ reservationData.expectedEndTime }}</div>
          <div v-if="reservationData.reservationRemark">备注：{{ reservationData.reservationRemark }}</div>
        </div>
      </ElFormItem>

      <ElFormItem label="就餐人数" prop="peopleCount">
        <ElInputNumber
          v-model="formData.peopleCount"
          :min="1"
          :max="30"
          placeholder="请输入就餐人数"
          style="width: 100%"
        />
      </ElFormItem>

      <ElFormItem label="备注信息" prop="remark">
        <ElInput
          v-model="formData.remark"
          type="textarea"
          :rows="3"
          placeholder="请输入备注信息（可选）"
          maxlength="200"
          show-word-limit
        />
      </ElFormItem>
    </ArtForm>

    <template #footer>
      <ElButton @click="handleClose">取消</ElButton>
      <ElButton
        v-auth="['restaurant:table:open', 'operations:table-cashier:open']"
        type="primary"
        :loading="loading"
        @click="handleSubmit"
        >确认开桌</ElButton
      >
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { ref, reactive, watch, computed, nextTick } from 'vue'
  import { ElMessage } from 'element-plus'
  import type { FormInstance, FormRules } from 'element-plus'
  import { fetchAdminOpenTable, type TableReservationItem } from '@/api/cashier'
  import { useUserStore } from '@/store/modules/user'

  interface Props {
    visible: boolean
    tableData: any
    reservationData?: TableReservationItem | null
  }

  interface Emits {
    (e: 'update:visible', value: boolean): void
    (e: 'success', session: any): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  const userStore = useUserStore()
  const formRef = ref<FormInstance>()
  const loading = ref(false)

  const dialogVisible = computed({
    get: () => props.visible,
    set: (val) => emit('update:visible', val)
  })

  // 表单数据
  const formData = reactive({
    peopleCount: 1,
    remark: ''
  })

  // 表单验证规则
  const rules: FormRules = {
    peopleCount: [
      { required: true, message: '请输入就餐人数', trigger: 'blur' },
      { type: 'number', min: 1, max: 30, message: '就餐人数必须在1-30之间', trigger: 'blur' }
    ]
  }

  // 监听对话框打开，重置表单
  watch(
    () => props.visible,
    (val) => {
      if (val) {
        formData.peopleCount = props.reservationData?.peopleCount || props.tableData?.seats || 1
        formData.remark = props.reservationData?.reservationRemark || ''
        nextTick(() => {
          formRef.value?.clearValidate()
        })
      }
    }
  )

  // 关闭对话框
  const handleClose = () => {
    dialogVisible.value = false
  }

  // 提交表单
  const handleSubmit = async () => {
    if (!formRef.value) return

    try {
      await formRef.value.validate()

      loading.value = true

      const params = {
        tableId: props.tableData.id,
        reservationId: props.reservationData?.id,
        peopleCount: formData.peopleCount,
        operatorId: userStore.info?.id || 0,
        operatorName: userStore.info?.username || '管理员',
        remark: formData.remark || undefined
      }

      const res = await fetchAdminOpenTable(params)

      ElMessage.success('开桌成功')
      emit('success', res)
      handleClose()
    } catch (error: any) {
      console.error('开桌失败:', error)
      ElMessage.error(error.message || '开桌失败')
    } finally {
      loading.value = false
    }
  }
</script>

<style scoped lang="scss">
  .table-info-display {
    width: 100%;
    padding: 16px;
    background-color: var(--el-fill-color-light);
    border-radius: 8px;

    .info-item {
      display: flex;
      align-items: center;
      margin-bottom: 8px;

      &:last-child {
        margin-bottom: 0;
      }

      .label {
        min-width: 100px;
        font-size: 14px;
        color: var(--el-text-color-secondary);
      }

      .value {
        font-size: 14px;
        font-weight: 500;
        color: var(--el-text-color-primary);
      }
    }
  }

  .reservation-info {
    width: 100%;
    padding: 12px 14px;
    line-height: 1.8;
    color: var(--el-color-warning-dark-2);
    background: var(--el-color-warning-light-9);
    border-radius: 8px;
  }
</style>
