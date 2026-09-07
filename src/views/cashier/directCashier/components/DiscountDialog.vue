<template>
  <ElDialog
    v-model="visible"
    align-center
    :show-close="false"
    width="min(660px, calc(100vw - 28px))"
    :close-on-click-modal="false"
    class="discount-dialog"
  >
    <div class="discount-content">
      <header class="discount-header">
        <div>
          <h2>整单折扣</h2>
          <p>快捷选择或输入自定义折扣</p>
        </div>
        <img :src="discountHero" alt="" />
        <button class="dialog-close" type="button" aria-label="关闭" @click="visible = false">
          ×
        </button>
      </header>

      <section class="discount-section quick-section">
        <div class="section-heading">
          <h3>快捷折扣</h3>
          <span>选择常用折扣</span>
        </div>
        <div class="quick-buttons">
          <button
            v-for="option in quickDiscounts"
            :key="option.label"
            v-auth="discountPermissions"
            class="quick-discount"
            :class="{ active: isDraftRate(option.rate) }"
            type="button"
            @click="selectDraftDiscount(option.rate)"
          >
            <strong>{{ option.label }}</strong>
            <span>{{ option.caption }}</span>
          </button>
        </div>
      </section>

      <section class="discount-section custom-section">
        <div class="section-heading">
          <h3>自定义折扣</h3>
          <span>输入 1–99 之间的整数</span>
        </div>
        <div class="custom-layout">
          <div class="custom-control-wrap">
            <div class="custom-control">
              <button type="button" aria-label="减少折扣" @click="adjustCustomDiscount(-1)"
                >−</button
              >
              <ElInput
                v-model="customDiscountInput"
                maxlength="2"
                inputmode="numeric"
                placeholder="88"
                @input="handleCustomInput"
              />
              <button type="button" aria-label="增加折扣" @click="adjustCustomDiscount(1)"
                >＋</button
              >
              <span class="discount-unit">折扣值</span>
            </div>
            <p>
              输入 88 即 8.8 折
              <template v-if="customDiscountLabel">，当前为 {{ customDiscountLabel }}</template>
            </p>
          </div>
          <div class="live-preview-card">
            <img :src="discountControl" alt="" />
            <div>
              <strong>实时预览</strong>
              <span>金额随折扣同步更新</span>
            </div>
          </div>
        </div>
      </section>

      <section class="discount-preview">
        <div class="section-heading">
          <h3>优惠预览</h3>
          <span>{{ draftDiscountText }}</span>
        </div>
        <div class="preview-values">
          <div
            ><span>原价</span><strong>￥{{ formatAmount(originalTotal) }}</strong></div
          >
          <div class="saving"
            ><span>优惠金额</span><strong>-￥{{ formatAmount(previewSaving) }}</strong></div
          >
          <div class="payable"
            ><span>折后应收</span><strong>￥{{ formatAmount(previewTotal) }}</strong></div
          >
        </div>
      </section>

      <footer class="discount-footer">
        <span>确认后将同步更新收银金额</span>
        <div>
          <ElButton @click="visible = false">取消</ElButton>
          <ElButton v-auth="discountPermissions" type="primary" @click="handleConfirmDiscount">
            确认应用
          </ElButton>
        </div>
      </footer>
    </div>
  </ElDialog>
</template>

<script setup lang="ts">
  import { computed, inject, ref, watch } from 'vue'
  import { ElButton, ElDialog, ElInput, ElMessage } from 'element-plus'
  import discountHero from '@/assets/images/cashier/discount-hero.png'
  import discountControl from '@/assets/images/cashier/discount-control.png'

  const visible = defineModel<boolean>({ default: false })
  const { cart, setDiscount } = inject<any>('cart')

  const discountPermissions = [
    'restaurant:order:discount',
    'operations:direct-cashier:discount',
    'operations:table-cashier:discount'
  ]
  const quickDiscounts = [
    { label: '无折扣', caption: '原价结算', rate: null },
    { label: '9.5折', caption: '立减 5%', rate: 0.95 },
    { label: '9折', caption: '立减 10%', rate: 0.9 },
    { label: '8.8折', caption: '立减 12%', rate: 0.88 },
    { label: '8.5折', caption: '立减 15%', rate: 0.85 },
    { label: '8折', caption: '立减 20%', rate: 0.8 },
    { label: '7.5折', caption: '立减 25%', rate: 0.75 },
    { label: '7折', caption: '立减 30%', rate: 0.7 }
  ]
  const draftDiscountRate = ref<number | null>(null)
  const customDiscountInput = ref('')

  const originalTotal = computed(() =>
    cart.commodity.reduce((total: number, item: any) => {
      if (item.isGift) return total
      if (item.totalPrice != null && item.discountPrice != null) {
        return total + Number(item.totalPrice) + Number(item.discountPrice)
      }
      return total + Number(item.price || 0) * Number(item.number || 0)
    }, 0)
  )
  const previewTotal = computed(() =>
    Number((originalTotal.value * (draftDiscountRate.value ?? 1)).toFixed(2))
  )
  const previewSaving = computed(() =>
    Number(Math.max(0, originalTotal.value - previewTotal.value).toFixed(2))
  )
  const customDiscountLabel = computed(() => {
    const value = Number(customDiscountInput.value)
    return value >= 1 && value <= 99 ? `${value / 10}折` : ''
  })
  const draftDiscountText = computed(() =>
    draftDiscountRate.value == null
      ? '当前选择：无折扣'
      : `当前选择：${draftDiscountRate.value * 10}折`
  )

  const formatAmount = (value: number) => Number(value || 0).toFixed(2)
  const isDraftRate = (rate: number | null) => draftDiscountRate.value === rate

  const selectDraftDiscount = (rate: number | null) => {
    draftDiscountRate.value = rate
    customDiscountInput.value = rate == null ? '' : String(Math.round(rate * 100))
  }

  const handleCustomInput = (value: string) => {
    const digits = String(value).replace(/\D/g, '').slice(0, 2)
    const numeric = Number(digits)
    customDiscountInput.value = numeric >= 1 && numeric <= 99 ? String(numeric) : ''
    draftDiscountRate.value = customDiscountInput.value ? numeric / 100 : null
  }

  const adjustCustomDiscount = (step: number) => {
    const fallback = cart.discountRate ? Math.round(cart.discountRate * 100) : 88
    const next = Math.min(99, Math.max(1, Number(customDiscountInput.value) || fallback) + step)
    handleCustomInput(String(next))
  }

  const handleConfirmDiscount = () => {
    setDiscount(draftDiscountRate.value)
    visible.value = false
    ElMessage.success(
      draftDiscountRate.value == null ? '已取消折扣' : `已设置 ${draftDiscountRate.value * 10} 折`
    )
  }

  watch(visible, (isVisible) => {
    if (!isVisible) return
    draftDiscountRate.value = cart.discountRate && cart.discountRate < 1 ? cart.discountRate : null
    customDiscountInput.value = draftDiscountRate.value
      ? String(Math.round(draftDiscountRate.value * 100))
      : ''
  })
</script>

<style scoped lang="scss">
  :deep(.discount-dialog) {
    --el-dialog-padding-primary: 0px;
    overflow: hidden;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 18px;
    box-shadow: 0 24px 64px rgb(15 38 86 / 22%);

    .el-dialog__header,
    .el-dialog__footer {
      display: none;
    }

    .el-dialog__body {
      padding: 0 !important;
    }
  }

  .discount-content {
    padding: 0 14px 12px;
    overflow: hidden;
    color: var(--el-text-color-primary);
  }

  .discount-header {
    position: relative;
    display: flex;
    align-items: center;
    min-height: 74px;
    padding: 12px 20px;
    overflow: hidden;
    background: linear-gradient(100deg, var(--el-bg-color) 42%, var(--el-color-primary-light-9));

    h2,
    p {
      position: relative;
      z-index: 2;
      margin: 0;
    }

    h2 {
      font-size: 21px;
      line-height: 1.2;
    }

    p {
      margin-top: 3px;
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }

    img {
      position: absolute;
      top: -48px;
      right: 26px;
      width: 210px;
      height: 155px;
      object-fit: cover;
      opacity: 0.88;
    }
  }

  .dialog-close {
    position: absolute;
    top: 9px;
    right: 11px;
    z-index: 3;
    width: 28px;
    height: 28px;
    padding: 0;
    font-size: 21px;
    line-height: 25px;
    color: var(--el-text-color-secondary);
    cursor: pointer;
    background: color-mix(in srgb, var(--el-bg-color) 82%, transparent);
    border: 0;
    border-radius: 50%;
  }

  .discount-section,
  .discount-preview {
    padding: 9px 12px;
    margin-top: 8px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 10px;
  }

  .section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;

    h3 {
      margin: 0;
      font-size: 14px;
    }

    span {
      font-size: 11px;
      color: var(--el-text-color-secondary);
    }
  }

  .quick-buttons {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
  }

  .quick-discount {
    display: flex;
    flex-direction: column;
    gap: 1px;
    align-items: center;
    min-height: 43px;
    padding: 5px 4px;
    color: var(--el-text-color-primary);
    cursor: pointer;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color);
    border-radius: 7px;
    transition: 0.2s ease;

    strong {
      font-size: 13px;
    }

    span {
      font-size: 10px;
      color: var(--el-text-color-secondary);
    }

    &:hover,
    &.active {
      color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
      border-color: var(--el-color-primary);

      span {
        color: var(--el-color-primary);
      }
    }
  }

  .custom-layout {
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(180px, 0.8fr);
    gap: 10px;
    align-items: center;
  }

  .custom-control-wrap p {
    margin: 4px 0 0;
    font-size: 10px;
    color: var(--el-text-color-secondary);
  }

  .custom-control {
    display: grid;
    grid-template-columns: 36px minmax(72px, 1fr) 36px auto;
    align-items: center;
    max-width: 360px;
    overflow: hidden;
    border: 1px solid var(--el-border-color);
    border-radius: 8px;

    button {
      height: 34px;
      font-size: 18px;
      color: var(--el-text-color-regular);
      cursor: pointer;
      background: var(--el-fill-color-light);
      border: 0;
    }

    :deep(.el-input__wrapper) {
      height: 34px;
      padding: 0 10px;
      box-shadow: none;

      input {
        font-size: 16px;
        font-weight: 700;
        text-align: center;
      }
    }
  }

  .discount-unit {
    padding: 0 8px;
    font-size: 10px;
    color: var(--el-text-color-secondary);
  }

  .live-preview-card {
    display: flex;
    align-items: center;
    min-height: 50px;
    padding: 5px 9px;
    overflow: hidden;
    background: var(--el-color-primary-light-9);
    border-radius: 10px;

    img {
      width: 48px;
      height: 40px;
      object-fit: contain;
    }

    div {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    strong {
      font-size: 12px;
      color: var(--el-color-primary);
    }

    span {
      font-size: 10px;
      color: var(--el-text-color-secondary);
    }
  }

  .discount-preview {
    position: relative;
    overflow: hidden;
    background:
      radial-gradient(circle at 12% 120%, rgb(73 132 255 / 18%), transparent 48%),
      radial-gradient(circle at 92% -30%, rgb(114 166 255 / 20%), transparent 46%),
      linear-gradient(135deg, var(--el-color-primary-light-9), var(--el-color-primary-light-8));
    border-color: color-mix(in srgb, var(--el-color-primary) 18%, transparent);

    .section-heading,
    .preview-values {
      position: relative;
      z-index: 1;
    }
  }

  .preview-values {
    display: grid;
    grid-template-columns: repeat(3, 1fr);

    > div {
      display: flex;
      flex-direction: column;
      gap: 2px;
      align-items: center;
      padding: 0 8px;
      border-right: 1px solid var(--el-border-color);

      &:last-child {
        border-right: 0;
      }
    }

    span {
      font-size: 10px;
      color: var(--el-text-color-secondary);
    }

    strong {
      font-size: 16px;
    }

    .saving strong {
      color: var(--el-color-success);
    }

    .payable strong {
      color: var(--el-color-primary);
    }
  }

  .discount-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 9px;
    margin-top: 9px;
    border-top: 1px solid var(--el-border-color-lighter);

    > span {
      font-size: 11px;
      color: var(--el-text-color-secondary);
    }

    > div {
      display: flex;
      gap: 8px;
    }

    .el-button {
      min-width: 96px;
    }
  }

  @media (height <= 650px) and (width > 620px) {
    .discount-header {
      min-height: 62px;
      padding-block: 8px;
    }

    .discount-section,
    .discount-preview {
      padding-block: 7px;
      margin-top: 6px;
    }

    .quick-discount {
      min-height: 38px;
      padding-block: 3px;
    }

    .discount-footer {
      padding-top: 6px;
      margin-top: 6px;
    }
  }

  @media (width <= 620px) {
    .discount-header img,
    .live-preview-card,
    .discount-footer > span {
      display: none;
    }

    .quick-buttons {
      grid-template-columns: repeat(2, 1fr);
    }

    .custom-layout {
      grid-template-columns: 1fr;
    }

    .discount-footer {
      justify-content: flex-end;
    }
  }
</style>
