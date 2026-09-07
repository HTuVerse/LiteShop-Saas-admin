<!-- 核销优惠券预览：优惠券样式展示 + 取消/核销按钮 -->
<template>
  <div class="verify-preview">
    <div class="coupon-card" :class="{ disabled: !data?.canVerify }">
      <!-- 左侧：面值/类型（与 CouponTypeEnum：0满减 1整单折扣 2菜品免单 一致） -->
      <div class="coupon-left">
        <template v-if="data?.couponType === 1">
          <span class="value-num">{{ formatDiscount(data.couponValue) }}</span>
          <span class="value-unit">折</span>
        </template>
        <template v-else-if="data?.couponType === 2">
          <span class="value-num free">免单</span>
        </template>
        <template v-else>
          <span class="value-unit small">¥</span>
          <span class="value-num">{{ data?.couponValue ?? 0 }}</span>
        </template>
        <div class="coupon-type">{{ couponTypeText }}</div>
      </div>
      <!-- 右侧：信息 -->
      <div class="coupon-right">
        <div class="coupon-name">{{ data?.couponName ?? '-' }}</div>
        <div v-if="data?.minAmount != null && data.minAmount > 0" class="coupon-condition">
          满 {{ data.minAmount }} 元可用
        </div>
        <div v-else class="coupon-condition">无门槛</div>
        <div class="coupon-time">
          {{ formatTime(data?.startTime) }} 至 {{ formatTime(data?.expireTime) }}
        </div>
        <div v-if="data?.userName" class="coupon-user">用户：{{ data.userName }}</div>
        <div v-if="data?.verifyTime" class="coupon-verify-time">
          核销时间：{{ formatTime(data.verifyTime) }}
        </div>
        <div
          v-if="data?.verifyMessage"
          class="verify-msg"
          :class="data.canVerify ? 'success' : 'warning'"
        >
          {{ data.verifyMessage }}
        </div>
      </div>
    </div>
    <div class="preview-actions">
      <ElButton @click="$emit('cancel')">取消</ElButton>
      <ElButton
        v-auth="[
          'operations:verify-record:verify',
          'marketing:coupon:verify',
          'operations:direct-cashier:verify',
          'operations:table-cashier:verify'
        ]"
        type="primary"
        :disabled="!data?.canVerify"
        :loading="verifyLoading"
        @click="$emit('verify')"
      >
        核销
      </ElButton>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { ElButton } from 'element-plus'

  /** 与后端 CouponTypeEnum 一致：0-满减券 1-整单折扣券 2-菜品免单券 */
  const COUPON_TYPE_MAP: Record<number, string> = {
    0: '满减券',
    1: '整单折扣券',
    2: '菜品免单券'
  }

  defineOptions({ name: 'VerifyCouponPreview' })

  const props = withDefaults(
    defineProps<{
      data: Api.Coupon.VerifyResultVO | null
      verifyLoading?: boolean
    }>(),
    { verifyLoading: false }
  )

  defineEmits<{
    (e: 'cancel'): void
    (e: 'verify'): void
  }>()

  const couponTypeText = computed(() =>
    props.data ? (COUPON_TYPE_MAP[props.data.couponType] ?? '优惠券') : ''
  )

  function formatDiscount(value: number) {
    if (value == null) return '-'
    const v = Number(value)
    if (v >= 1) return v
    return (v * 10).toFixed(1)
  }

  function formatTime(str?: string) {
    if (!str) return '-'
    try {
      const d = new Date(str)
      if (isNaN(d.getTime())) return str
      const y = d.getFullYear()
      const M = (d.getMonth() + 1).toString().padStart(2, '0')
      const D = d.getDate().toString().padStart(2, '0')
      const h = d.getHours().toString().padStart(2, '0')
      const m = d.getMinutes().toString().padStart(2, '0')
      return `${y}-${M}-${D} ${h}:${m}`
    } catch {
      return str
    }
  }
</script>

<style scoped lang="scss">
  .verify-preview {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .coupon-card {
    display: flex;
    overflow: hidden;
    background: linear-gradient(135deg, #fff8f0 0%, #fff 50%, #f0f9ff 100%);
    border: 1px solid var(--el-border-color);
    border-radius: 10px;
    box-shadow: 0 2px 12px rgb(0 0 0 / 6%);

    &.disabled {
      background: linear-gradient(135deg, #f5f5f5 0%, #fafafa 100%);
      opacity: 0.85;
    }
  }

  .coupon-left {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 110px;
    min-height: 100px;
    padding: 12px 8px;
    color: #fff;
    background: linear-gradient(
      180deg,
      var(--el-color-primary-light-5) 0%,
      var(--el-color-primary) 100%
    );

    .value-num {
      font-size: 28px;
      font-weight: 700;
      line-height: 1.2;

      &.free {
        font-size: 22px;
      }
    }

    .value-unit {
      margin-left: 2px;
      font-size: 14px;

      &.small {
        margin-right: 2px;
        font-size: 16px;
      }
    }

    .coupon-type {
      margin-top: 6px;
      font-size: 12px;
      opacity: 0.95;
    }

    .disabled & {
      background: linear-gradient(180deg, #a0a0a0 0%, #707070 100%);
    }
  }

  .coupon-right {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 4px;
    padding: 12px 14px;

    .coupon-name {
      font-size: 15px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }

    .coupon-condition,
    .coupon-time,
    .coupon-user,
    .coupon-verify-time {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }

    .verify-msg {
      padding: 4px 8px;
      margin-top: 6px;
      font-size: 13px;
      border-radius: 4px;

      &.success {
        color: var(--el-color-success);
        background: var(--el-color-success-light-9);
      }

      &.warning {
        color: var(--el-color-warning);
        background: var(--el-color-warning-light-9);
      }
    }
  }

  .preview-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }
</style>
