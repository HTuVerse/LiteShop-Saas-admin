<!-- 核销优惠券弹窗：15位核销码输入 + 预览与核销 -->
<template>
  <ElDialog
    :model-value="visible"
    title="核销优惠券"
    width="480px"
    align-center
    :close-on-click-modal="false"
    destroy-on-close
    @update:model-value="onVisibleChange"
    @close="reset"
  >
    <div class="verify-coupon-content">
      <div v-if="!verifyPreviewData" class="verify-input-wrap">
        <ElInput
          v-model="verifyCouponCode"
          placeholder="请输入15位核销码"
          maxlength="15"
          show-word-limit
          clearable
          :loading="verifyPreviewLoading"
          size="large"
          class="verify-code-input"
          @input="onVerifyCodeInput"
        >
          <template #prefix>
            <ElIcon><Ticket /></ElIcon>
          </template>
        </ElInput>
        <div v-if="verifyPreviewError" class="verify-error">{{ verifyPreviewError }}</div>
      </div>
      <VerifyCouponPreview
        v-else
        :data="verifyPreviewData"
        :verify-loading="verifySubmitting"
        @cancel="handleVerifyPreviewCancel"
        @verify="handleVerifySubmit"
      />
    </div>
  </ElDialog>
</template>

<script setup lang="ts">
  import { ref, watch } from 'vue'
  import { ElDialog, ElInput, ElIcon, ElMessage } from 'element-plus'
  import { Ticket } from '@element-plus/icons-vue'
  import VerifyCouponPreview from './VerifyCouponPreview.vue'
  import { fetchVerifyPreview, fetchVerifyCoupon } from '@/api/coupon-manage'

  defineOptions({ name: 'VerifyCouponDialog' })

  const props = defineProps<{
    visible: boolean
  }>()

  const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void
    (e: 'success'): void
  }>()

  const verifyCouponCode = ref('')
  const verifyPreviewData = ref<Api.Coupon.VerifyResultVO | null>(null)
  const verifyPreviewLoading = ref(false)
  const verifyPreviewError = ref('')
  const verifySubmitting = ref(false)

  watch(
    () => props.visible,
    (v) => {
      if (!v) reset()
    }
  )

  function onVisibleChange(val: boolean) {
    emit('update:visible', val)
  }

  function reset() {
    verifyCouponCode.value = ''
    verifyPreviewData.value = null
    verifyPreviewError.value = ''
  }

  function onVerifyCodeInput(val: string) {
    verifyCouponCode.value = val.replace(/\D/g, '').slice(0, 15)
    verifyPreviewError.value = ''
    if (verifyPreviewData.value) verifyPreviewData.value = null
    if (verifyCouponCode.value.length === 15) {
      loadVerifyPreview(verifyCouponCode.value)
    }
  }

  async function loadVerifyPreview(code: string) {
    if (!code || code.length !== 15) return
    verifyPreviewLoading.value = true
    verifyPreviewError.value = ''
    try {
      const data = await fetchVerifyPreview(code)
      verifyPreviewData.value = data ?? null
      if (!data) verifyPreviewError.value = '未查询到优惠券信息'
    } catch (e: any) {
      verifyPreviewData.value = null
      verifyPreviewError.value = e?.message || e?.msg || '查询失败'
    } finally {
      verifyPreviewLoading.value = false
    }
  }

  function handleVerifyPreviewCancel() {
    verifyPreviewData.value = null
    verifyCouponCode.value = ''
    verifyPreviewError.value = ''
  }

  async function handleVerifySubmit() {
    const code = verifyCouponCode.value
    if (!code || !verifyPreviewData.value?.canVerify) return
    verifySubmitting.value = true
    try {
      fetchVerifyCoupon(code).then((res) => {
        if (res) {
          ElMessage.success('核销成功')
        }
      })
      emit('update:visible', false)
      emit('success')
      reset()
    } catch (e: any) {
      ElMessage.error(e?.message || e?.msg || '核销失败')
    } finally {
      verifySubmitting.value = false
    }
  }
</script>

<style scoped lang="scss">
  .verify-coupon-content {
    min-height: 80px;

    .verify-input-wrap {
      .verify-code-input {
        width: 100%;
      }

      .verify-error {
        margin-top: 10px;
        font-size: 13px;
        color: var(--el-color-danger);
      }
    }
  }
</style>
