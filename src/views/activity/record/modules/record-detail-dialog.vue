<!-- 核销记录详情弹窗 -->
<template>
  <ElDialog
    v-model="dialogVisible"
    title="核销记录详情"
    width="520px"
    align-center
    destroy-on-close
    @closed="handleClosed"
  >
    <div v-loading="loading" class="detail-content">
      <ElDescriptions v-if="detail" :column="1" border>
        <ElDescriptionsItem label="记录ID">{{ detail.id }}</ElDescriptionsItem>
        <ElDescriptionsItem label="用户优惠券ID">{{ detail.userCouponId }}</ElDescriptionsItem>
        <ElDescriptionsItem label="核销管理员ID">{{ detail.merchantId }}</ElDescriptionsItem>
        <ElDescriptionsItem label="核销码">{{ detail.verifyCode }}</ElDescriptionsItem>
        <ElDescriptionsItem label="核销状态">
          <ElTag :type="String(detail.status) === '已核销' ? 'success' : 'info'" size="small">
            {{ detail.status }}
          </ElTag>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="核销时间">
          {{ formatTime(detail.verifyTime) }}
        </ElDescriptionsItem>
      </ElDescriptions>
      <ElEmpty v-else-if="!loading" description="暂无详情" />
    </div>
  </ElDialog>
</template>

<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import {
    ElDialog,
    ElDescriptions,
    ElDescriptionsItem,
    ElTag,
    ElEmpty,
    ElMessage
  } from 'element-plus'
  import { fetchGetVerifyRecordDetail } from '@/api/coupon-manage'

  interface Props {
    visible: boolean
    recordId: string | number | null
  }

  interface Emits {
    (e: 'update:visible', value: boolean): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  const dialogVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
  })

  const loading = ref(false)
  const detail = ref<Api.Coupon.VerifyRecord | null>(null)

  function formatTime(time?: string) {
    if (!time) return '-'
    return time.substring(0, 19).replace('T', ' ')
  }

  async function loadDetail() {
    if (props.recordId == null) {
      detail.value = null
      return
    }
    loading.value = true
    detail.value = null
    try {
      const res = await fetchGetVerifyRecordDetail(props.recordId)
      detail.value = res
    } catch (e: any) {
      ElMessage.error(e.message || '获取详情失败')
    } finally {
      loading.value = false
    }
  }

  function handleClosed() {
    detail.value = null
  }

  watch(
    () => [props.visible, props.recordId] as const,
    ([visible, id]) => {
      if (visible && id != null) {
        loadDetail()
      }
    },
    { immediate: true }
  )
</script>

<style lang="scss" scoped>
  .detail-content {
    min-height: 120px;
  }
</style>
