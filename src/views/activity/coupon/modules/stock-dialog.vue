<template>
  <ElDialog v-model="dialogVisible" :title="`调整库存 · ${couponData?.name || ''}`" width="760px" destroy-on-close>
    <p>当前剩余 {{ couponData?.remainCount ?? 0 }} 张，累计总量 {{ couponData?.totalCount ?? 0 }} 张。</p>
    <ArtForm ref="formRef" :model="formData" :rules="rules" label-width="90px">
      <ElFormItem label="增减数量" prop="delta">
        <ElInputNumber v-model="formData.delta" :min="-999999" :max="999999" :step="1" />
        <span class="form-tip">正数补库，负数减库</span>
      </ElFormItem>
      <ElFormItem label="调整原因" prop="reason">
        <ElInput v-model="formData.reason" maxlength="200" show-word-limit placeholder="填写补库或减库原因" />
      </ElFormItem>
    </ArtForm>
    <div class="history-title">最近调整记录</div>
    <ArtTable :data="data" :columns="columns" :loading="loading" :pagination="pagination"
      @pagination:size-change="handleSizeChange" @pagination:current-change="handleCurrentChange" />
    <template #footer>
      <ElButton @click="dialogVisible = false">关闭</ElButton>
      <ElButton v-auth="'marketing:coupon:edit'" type="primary" :loading="submitting" @click="submit">确认调整</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { computed, reactive, ref, watch } from 'vue'
  import { ElButton, ElDialog, ElFormItem, ElInput, ElInputNumber, ElMessage } from 'element-plus'
  import type { FormInstance, FormRules } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import { fetchAdjustCouponStock, fetchCouponStockAdjustments } from '@/api/coupon-manage'

  const props = defineProps<{ visible: boolean; couponData?: Partial<Api.Coupon.CouponListItem> }>()
  const emit = defineEmits<{ (e: 'update:visible', value: boolean): void; (e: 'success'): void }>()
  const dialogVisible = computed({ get: () => props.visible, set: (value) => emit('update:visible', value) })
  const formRef = ref<FormInstance>()
  const submitting = ref(false)
  const formData = reactive({ delta: 0, reason: '' })
  const rules: FormRules = {
    delta: [{ validator: (_rule, value, callback) => callback(Number.isInteger(value) && value !== 0
      ? undefined : new Error('请输入非零整数')), trigger: 'change' }],
    reason: [{ required: true, message: '请填写调整原因', trigger: 'blur' }]
  }
  const { data, columns, loading, pagination, getData, refreshData, handleSizeChange, handleCurrentChange } = useTable({
    core: {
      immediate: false,
      apiFn: (params: { currentPage: number; pageSize: number }) =>
        fetchCouponStockAdjustments(props.couponData!.id!, params.currentPage, params.pageSize),
      apiParams: { currentPage: 1, pageSize: 10 },
      paginationKey: { current: 'currentPage', size: 'pageSize' },
      columnsFactory: () => [
        { prop: 'createTime', label: '调整时间', width: 170 },
        { prop: 'delta', label: '增减', width: 85 },
        { prop: 'beforeCount', label: '调整前', width: 85 },
        { prop: 'afterCount', label: '调整后', width: 85 },
        { prop: 'operatorId', label: '操作人ID', width: 155 },
        { prop: 'reason', label: '原因', minWidth: 160 }
      ]
    }
  })

  watch(() => props.visible, (visible) => {
    if (!visible || !props.couponData?.id) return
    formData.delta = 0
    formData.reason = ''
    getData({ currentPage: 1, pageSize: 10 })
  })

  const submit = async () => {
    if (!props.couponData?.id || !formRef.value || submitting.value) return
    try {
      await formRef.value.validate()
      submitting.value = true
      await fetchAdjustCouponStock({ couponId: props.couponData.id, delta: formData.delta, reason: formData.reason.trim() })
      ElMessage.success('库存调整成功')
      emit('success')
      refreshData()
      dialogVisible.value = false
    } catch (error: any) {
      if (error instanceof Error) ElMessage.error(error.message || '库存调整失败')
    } finally {
      submitting.value = false
    }
  }
</script>

<style scoped>
  .form-tip { margin-left: 12px; color: #909399; font-size: 12px; }
  .history-title { margin: 20px 0 10px; font-weight: 600; }
</style>
