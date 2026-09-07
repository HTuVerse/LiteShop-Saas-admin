<template>
  <ElDialog
    v-model="dialogVisible"
    title="退菜"
    width="560px"
    align-center
    :close-on-click-modal="false"
    destroy-on-close
    @close="handleClose"
  >
    <div v-loading="loading" class="refund-dialog">
      <template v-if="orderItems.length > 0">
        <div class="refund-tip">请选择要退的菜品及数量：</div>
        <ArtTable :data="orderItems" border size="small" max-height="320" :columns="tableColumns">
          <template #tableColumnsSlot1="{ row }">
            <span>{{ row.dishName }}</span>
            <span v-if="row.specOptionsText" class="spec-text">{{ row.specOptionsText }}</span>
          </template>
          <template #tableColumnsSlot2="{ row }">￥{{ formatMoney(row.price) }}</template>
          <template #tableColumnsSlot4="{ row }">
            <ElInputNumber
              v-model="row.refundQty"
              :min="0"
              :max="row.quantity"
              size="small"
              controls-position="right"
              style="width: 100%"
            />
          </template>
        </ArtTable>
        <ElFormItem label="退菜原因" required class="reason-item">
          <ElInput
            v-model="refundReason"
            type="textarea"
            :rows="3"
            placeholder="请输入退菜原因（必填）"
            maxlength="200"
            show-word-limit
          />
        </ElFormItem>
      </template>
      <ElEmpty v-else-if="!loading" description="暂无订单明细" />
    </div>
    <template #footer>
      <ElButton @click="handleClose">取消</ElButton>
      <ElButton
        v-auth="[
          'restaurant:order:refund',
          'operations:direct-cashier:refund',
          'operations:table-cashier:refund'
        ]"
        type="primary"
        :loading="submitting"
        :disabled="!canSubmit"
        @click="handleSubmit"
      >
        确认退菜
      </ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { useTable } from '@/hooks/core/useTable'
  import { ref, watch, computed } from 'vue'
  import {
    ElDialog,
    ElInputNumber,
    ElInput,
    ElFormItem,
    ElButton,
    ElEmpty,
    ElMessage
  } from 'element-plus'
  import { fetchOrderDetail, fetchRefundDish } from '@/api/cashier'

  const formatMoney = (v: number | string) => {
    const n = typeof v === 'string' ? parseFloat(v) : v
    return isNaN(n) ? '0.00' : n.toFixed(2)
  }

  const props = defineProps<{
    visible: boolean
    orderId: number | null
  }>()

  const emit = defineEmits(['close', 'success'])

  interface RefundableOrderItem {
    id: number
    dishId: number
    dishName: string
    price: number
    quantity: number
    specOptionsText?: string
    refundQty: number
  }

  const dialogVisible = ref(false)
  const submitting = ref(false)
  const refundReason = ref('')

  watch(
    () => props.visible,
    (val) => {
      dialogVisible.value = val
      if (val && props.orderId) {
        replaceSearchParams({ orderId: props.orderId })
        void getData()
      } else if (!val) {
        resetForm()
      }
    }
  )

  watch(
    () => props.orderId,
    (id) => {
      if (dialogVisible.value && id) {
        replaceSearchParams({ orderId: id })
        void getData()
      }
    }
  )

  const canSubmit = computed(() => {
    const hasQty = orderItems.value.some((i) => i.refundQty > 0)
    const reason = (refundReason.value || '').trim()
    return hasQty && reason.length > 0
  })

  const resetForm = () => {
    clearData()
    refundReason.value = ''
  }

  const handleClose = () => {
    emit('close')
  }

  const handleSubmit = async () => {
    if (!props.orderId || !canSubmit.value) return
    const items = orderItems.value
      .filter((i) => i.refundQty > 0)
      .map((i) => ({
        orderItemId: i.id,
        refundQuantity: i.refundQty
      }))
    if (items.length === 0) {
      ElMessage.warning('请选择要退的菜品及数量')
      return
    }
    const reason = (refundReason.value || '').trim()
    if (!reason) {
      ElMessage.warning('请输入退菜原因')
      return
    }
    submitting.value = true
    try {
      await fetchRefundDish({
        orderId: props.orderId,
        refundItems: items,
        refundReason: reason
      })
      ElMessage.success('退菜成功')
      emit('success')
      handleClose()
    } catch (e: any) {
      ElMessage.error(e?.message || e?.msg || '退菜失败')
    } finally {
      submitting.value = false
    }
  }

  const fetchRefundableItems = async (params: { orderId?: number }) => {
    if (!params.orderId)
      return { records: [] as RefundableOrderItem[], total: 0, current: 1, size: 10 }
    const res = await fetchOrderDetail(params.orderId)
    const list = res?.items || res?.orderItems || []
    const records = list.map((item: any) => ({
      id: item.id,
      dishId: item.dishId,
      dishName: item.dishName || '-',
      price: Number(item.price) || 0,
      quantity: Number(item.quantity) || 0,
      specOptionsText: item.specOptionsText || item.specText,
      refundQty: 0
    })) as RefundableOrderItem[]
    return { records, total: records.length, current: 1, size: records.length || 10 }
  }

  const {
    data: orderItems,
    columns: tableColumns,
    loading,
    getData,
    replaceSearchParams,
    clearData
  } = useTable({
    core: {
      apiFn: fetchRefundableItems,
      immediate: false,
      columnsFactory: () => [
        {
          prop: 'dishName',
          label: '菜品',
          minWidth: 120,
          useSlot: true,
          slotName: 'tableColumnsSlot1'
        },
        {
          prop: 'price',
          label: '单价',
          width: 80,
          align: 'right',
          useSlot: true,
          slotName: 'tableColumnsSlot2'
        },
        { prop: 'quantity', label: '订单数量', width: 88, align: 'center' },
        {
          prop: 'tableColumnsColumn4',
          label: '退菜数量',
          width: 120,
          align: 'center',
          useSlot: true,
          slotName: 'tableColumnsSlot4'
        }
      ]
    },
    hooks: {
      onSuccess: () => {
        refundReason.value = ''
      },
      onError: () => ElMessage.error('加载订单失败')
    }
  })
</script>

<style scoped lang="scss">
  .refund-dialog {
    min-height: 120px;
  }

  .refund-tip {
    margin-bottom: 12px;
    font-size: 13px;
    color: var(--el-text-color-regular);
  }

  .spec-text {
    margin-left: 6px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .reason-item {
    margin-top: 16px;
    margin-bottom: 0;
  }
</style>
