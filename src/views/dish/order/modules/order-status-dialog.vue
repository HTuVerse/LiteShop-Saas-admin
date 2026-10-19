<template>
  <ElDialog
    v-model="dialogVisible"
    class="order-status-dialog"
    width="min(980px, calc(100vw - 28px))"
    align-center
    append-to-body
    destroy-on-close
    :show-close="false"
    :close-on-click-modal="false"
    @open="resetForm"
  >
    <template #header>
      <div class="status-dialog-header">
        <div class="header-title-wrap">
          <span class="header-icon">
            <ElIcon><RefreshRight /></ElIcon>
          </span>
          <div>
            <h2>更新订单状态</h2>
            <p>请选择新的订单状态，系统将自动记录更新时间</p>
          </div>
        </div>

        <img class="header-illustration" :src="placedIllustration" alt="订单状态更新" />

        <button class="dialog-close" type="button" aria-label="关闭" @click="dialogVisible = false">
          <ElIcon><Close /></ElIcon>
        </button>
      </div>
    </template>

    <div v-if="order" class="status-dialog-content">
      <section class="order-summary" aria-label="订单信息">
        <div class="order-number-row">
          <span>订单号</span>
          <strong>#{{ order.orderNo || '—' }}</strong>
          <ElTooltip content="复制订单号" placement="top">
            <button class="copy-button" type="button" aria-label="复制订单号" @click="copyOrderNo">
              <ElIcon><CopyDocument /></ElIcon>
            </button>
          </ElTooltip>
        </div>

        <div class="order-meta">
          <span class="meta-item">
            <span class="meta-icon"
              ><ElIcon><KnifeFork /></ElIcon
            ></span>
            {{ diningType }}
          </span>
          <i></i>
          <span class="meta-item">
            <span class="meta-icon neutral"
              ><ElIcon><Clock /></ElIcon
            ></span>
            下单时间&nbsp;&nbsp;{{ order.createdAt || '—' }}
          </span>
          <i></i>
          <span class="meta-item">
            <span class="meta-icon neutral"
              ><ElIcon><Dish /></ElIcon
            ></span>
            {{ tableDescription }}
          </span>
        </div>
      </section>

      <section class="status-section">
        <h3>选择新的订单状态</h3>
        <div class="status-grid" role="radiogroup" aria-label="订单状态">
          <button
            v-for="option in statusOptions"
            :key="option.value"
            class="status-card"
            :class="[
              `is-${option.theme}`,
              { 'is-selected': selectedStatus === option.value, 'is-current': option.value === currentStatusValue }
            ]"
            type="button"
            role="radio"
            :aria-checked="selectedStatus === option.value"
            :disabled="option.value === currentStatusValue"
            @click="selectedStatus = option.value"
          >
            <span v-if="option.value === currentStatusValue" class="current-badge">当前</span>
            <span class="check-indicator">
              <ElIcon v-if="selectedStatus === option.value"><Check /></ElIcon>
            </span>
            <span class="status-illustration">
              <img :src="option.illustration" :alt="option.label" />
            </span>
            <strong>{{ option.label }}</strong>
            <span class="status-description">{{ option.description }}</span>
          </button>
        </div>
      </section>

      <section class="remark-section">
        <label for="order-status-remark">
          备注说明
          <span>{{ selectedStatus === OrderStatusCode.CANCELLED ? '（必填）' : '（可选）' }}</span>
        </label>
        <ElInput
          id="order-status-remark"
          v-model="remark"
          type="textarea"
          :rows="2"
          maxlength="200"
          show-word-limit
          resize="none"
          :placeholder="
            selectedStatus === OrderStatusCode.CANCELLED
              ? '取消订单时必须填写原因'
              : '请输入备注信息...'
          "
        />
      </section>
    </div>

    <template #footer>
      <div class="status-dialog-footer">
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="loading" :disabled="!canSubmit" @click="submitStatus">
          确认更新
        </ElButton>
      </div>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { ElButton, ElDialog, ElIcon, ElInput, ElMessage, ElTooltip } from 'element-plus'
  import {
    Check,
    Clock,
    Close,
    CopyDocument,
    Dish,
    KnifeFork,
    RefreshRight
  } from '@element-plus/icons-vue'
  import placedIllustration from '@/assets/images/system/order-status-placed.png'
  import acceptedIllustration from '@/assets/images/system/order-status-accepted.png'
  import cookingIllustration from '@/assets/images/system/order-status-cooking.png'
  import preparedIllustration from '@/assets/images/system/order-status-prepared.png'
  import completedIllustration from '@/assets/images/system/order-status-completed.png'
  import cancelledIllustration from '@/assets/images/system/order-status-cancelled.png'
  import {
    getOrderStatusCode,
    ORDER_STATUS_DEFINITIONS,
    OrderStatusCode,
    type OrderStatusLabel
  } from '@/utils/constants/order'

  type OrderListItem = Api.Order.OrderDetailVO

  interface StatusOption {
    label: OrderStatusLabel
    value: OrderStatusCode
    description: string
    theme: 'blue' | 'cyan' | 'orange' | 'green' | 'purple' | 'red'
    illustration: string
  }

  const props = defineProps<{
    visible: boolean
    order: OrderListItem | null
    loading?: boolean
  }>()

  const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void
    (e: 'confirm', payload: { status: number; statusLabel: string; remark: string }): void
  }>()

  const dialogVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
  })

  const optionPresentation: Record<
    OrderStatusCode,
    Pick<StatusOption, 'theme' | 'illustration'>
  > = {
    [OrderStatusCode.PLACED]: { theme: 'blue', illustration: placedIllustration },
    [OrderStatusCode.ACCEPTED]: { theme: 'cyan', illustration: acceptedIllustration },
    [OrderStatusCode.PREPARING]: { theme: 'orange', illustration: cookingIllustration },
    [OrderStatusCode.PREPARED]: { theme: 'green', illustration: preparedIllustration },
    [OrderStatusCode.COMPLETED]: { theme: 'purple', illustration: completedIllustration },
    [OrderStatusCode.CANCELLED]: { theme: 'red', illustration: cancelledIllustration }
  }

  const statusOptions = computed<StatusOption[]>(() => {
    return ORDER_STATUS_DEFINITIONS.map((item) => ({
      label: item.label,
      value: item.code,
      description: item.description,
      ...optionPresentation[item.code]
    }))
  })

  const selectedStatus = ref<number>()
  const remark = ref('')

  const currentStatusValue = computed(() =>
    getOrderStatusCode(props.order?.status as OrderStatusLabel | undefined)
  )

  const canSubmit = computed(
    () =>
      Boolean(props.order && selectedStatus.value) &&
      selectedStatus.value !== currentStatusValue.value &&
      (selectedStatus.value !== OrderStatusCode.CANCELLED || Boolean(remark.value.trim())) &&
      !props.loading
  )

  const diningType = computed(() => {
    if (props.order?.tableName) return '堂食'
    return props.order?.orderType || '订单'
  })

  const tableDescription = computed(() => {
    if (!props.order) return '—'
    if (props.order.tableName) {
      return `桌台  ${props.order.tableName}${
        props.order.diningCount ? ` · ${props.order.diningCount}人桌` : ''
      }`
    }
    return props.order.storeName || '未分配桌台'
  })

  const resetForm = () => {
    selectedStatus.value = undefined
    remark.value = ''
  }

  const copyOrderNo = async () => {
    if (!props.order?.orderNo) return
    try {
      await navigator.clipboard.writeText(props.order.orderNo)
      ElMessage.success('订单号已复制')
    } catch {
      ElMessage.warning('复制失败，请手动复制')
    }
  }

  const submitStatus = () => {
    if (!canSubmit.value || !selectedStatus.value) return
    const selectedOption = statusOptions.value.find(
      (option) => option.value === selectedStatus.value
    )
    if (!selectedOption) return
    emit('confirm', {
      status: selectedOption.value,
      statusLabel: selectedOption.label,
      remark: remark.value.trim()
    })
  }
</script>

<style scoped lang="scss">
  .status-dialog-header {
    position: relative;
    display: flex;
    align-items: center;
    min-height: 82px;
    padding: 12px 24px;
    overflow: hidden;
    background:
      radial-gradient(circle at 82% 110%, rgb(117 169 255 / 18%), transparent 40%),
      linear-gradient(112deg, #fff 0%, #fbfdff 58%, #f4f8ff 100%);
  }

  .header-title-wrap {
    z-index: 2;
    display: flex;
    gap: 14px;
    align-items: center;

    h2 {
      margin: 0;
      font-size: 22px;
      font-weight: 750;
      line-height: 1.3;
      color: #101a35;
      letter-spacing: 1px;
    }

    p {
      margin: 3px 0 0;
      font-size: 13px;
      color: #75829b;
    }
  }

  .header-icon {
    display: grid;
    flex: 0 0 auto;
    place-items: center;
    width: 54px;
    height: 54px;
    font-size: 31px;
    color: #2f6ff1;
    background: linear-gradient(145deg, #edf4ff, #e3edff);
    border-radius: 14px;
  }

  .header-illustration {
    position: absolute;
    right: 76px;
    bottom: -29px;
    width: 158px;
    height: 118px;
    pointer-events: none;
    object-fit: contain;
    filter: drop-shadow(0 12px 18px rgb(43 105 224 / 8%));
  }

  .dialog-close {
    position: absolute;
    top: 14px;
    right: 18px;
    z-index: 3;
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    padding: 0;
    font-size: 22px;
    color: #6f7890;
    cursor: pointer;
    background: transparent;
    border: 0;
    border-radius: 10px;
    transition: all 0.2s;

    &:hover {
      color: #27334d;
      background: rgb(74 100 149 / 8%);
    }
  }

  .status-dialog-content {
    padding: 0 24px;
  }

  .order-summary {
    padding: 11px 0 9px;
    text-align: center;
  }

  .order-number-row {
    display: flex;
    gap: 9px;
    align-items: center;
    justify-content: center;
    color: #6f7a91;

    span {
      font-size: 14px;
      font-weight: 600;
    }

    strong {
      font-size: 19px;
      color: #101a35;
      letter-spacing: 0.5px;
    }
  }

  .copy-button {
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    padding: 0;
    font-size: 17px;
    color: #69758e;
    cursor: pointer;
    background: transparent;
    border: 0;
    border-radius: 8px;

    &:hover {
      color: #2f6ff1;
      background: #f0f5ff;
    }
  }

  .order-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 11px;
    align-items: center;
    justify-content: center;
    margin-top: 7px;
    color: #67738d;

    > i {
      width: 1px;
      height: 14px;
      background: #dfe5ef;
    }
  }

  .meta-item {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    font-size: 12px;
  }

  .meta-icon {
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    font-size: 14px;
    color: #3977ef;
    background: #edf3ff;
    border-radius: 8px;

    &.neutral {
      color: #68758d;
      background: #f4f6f9;
    }
  }

  .status-section h3,
  .remark-section label {
    display: block;
    margin: 0 0 8px;
    font-size: 14px;
    font-weight: 700;
    color: #15213c;
  }

  .status-grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 8px;
  }

  .status-card {
    --accent: #2f6ff1;
    --soft: #edf3ff;
    --card-bg: #f8faff;

    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 120px;
    padding: 6px 6px 8px;
    overflow: hidden;
    font-family: inherit;
    text-align: center;
    cursor: pointer;
    background: linear-gradient(145deg, #fff, var(--card-bg));
    border: 1px solid #e4e9f1;
    border-radius: 10px;
    outline: none;
    transition:
      transform 0.2s,
      border-color 0.2s,
      box-shadow 0.2s;

    &:hover {
      border-color: color-mix(in srgb, var(--accent) 45%, #dbe2ed);
      box-shadow: 0 10px 28px rgb(40 68 119 / 10%);
      transform: translateY(-2px);
    }

    &:focus-visible {
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
    }

    &:disabled {
      cursor: default;
      opacity: 0.6;
      transform: none;
    }

    &.is-selected {
      border: 1.5px solid var(--accent);
      box-shadow: 0 8px 26px color-mix(in srgb, var(--accent) 12%, transparent);
    }

    &.is-cyan {
      --accent: #16a9ad;
      --soft: #e0f7f7;
      --card-bg: #f2fbfb;
    }

    &.is-orange {
      --accent: #ed8b2e;
      --soft: #fff0df;
      --card-bg: #fff9f2;
    }

    &.is-green {
      --accent: #21ae70;
      --soft: #ddf5e9;
      --card-bg: #f1fbf6;
    }

    &.is-purple {
      --accent: #9952e8;
      --soft: #f0e2ff;
      --card-bg: #faf5ff;
    }

    &.is-red {
      --accent: #ea4751;
      --soft: #ffe2e4;
      --card-bg: #fff5f5;
    }

    strong {
      margin-top: -4px;
      font-size: 14px;
      color: #15203b;
    }
  }

  .status-illustration {
    display: block;
    width: 72px;
    height: 72px;

    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  }

  .status-description {
    margin-top: 2px;
    font-size: 10px;
    line-height: 1.35;
    color: #7a859b;
    white-space: pre-line;
  }

  .check-indicator {
    position: absolute;
    top: 7px;
    right: 7px;
    display: grid;
    place-items: center;
    width: 17px;
    height: 17px;
    font-size: 11px;
    color: #fff;
    background: transparent;
    border: 1.5px solid #cbd3e0;
    border-radius: 50%;
  }

  .is-selected .check-indicator {
    background: var(--accent);
    border-color: var(--accent);
  }

  .current-badge {
    position: absolute;
    top: 7px;
    left: 7px;
    padding: 2px 5px;
    font-size: 9px;
    font-weight: 600;
    color: var(--accent);
    background: var(--soft);
    border-radius: 6px;
  }

  .remark-section {
    margin-top: 11px;

    label span {
      font-weight: 500;
      color: #7f899d;
    }

    :deep(.el-textarea__inner) {
      min-height: 54px !important;
      padding: 9px 13px;
      line-height: 1.4;
      border-radius: 9px;
      box-shadow: 0 0 0 1px #dce3ed inset;

      &:focus {
        box-shadow: 0 0 0 1px #3b76ef inset;
      }
    }

    :deep(.el-input__count) {
      right: 15px;
      bottom: 7px;
      color: #8b95aa;
      background: transparent;
    }
  }

  .status-dialog-footer {
    display: flex;
    gap: 10px;
    justify-content: flex-end;

    .el-button {
      width: 128px;
      height: 36px;
      margin: 0;
      font-size: 14px;
      border-radius: 8px;
    }

    .el-button--primary {
      background: linear-gradient(135deg, #347af7, #1758e8);
      border: 0;
      box-shadow: 0 8px 18px rgb(31 100 232 / 18%);
    }
  }

  @media (width <= 900px) {
    .status-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .status-card {
      min-height: 112px;
    }

    .header-illustration {
      right: 62px;
      width: 150px;
      opacity: 0.72;
    }
  }

  @media (width <= 640px) {
    .status-dialog-header {
      min-height: 76px;
      padding: 10px 16px;
    }

    .header-title-wrap {
      gap: 13px;

      h2 {
        font-size: 18px;
      }

      p {
        max-width: 230px;
        font-size: 12px;
      }
    }

    .header-icon {
      width: 46px;
      height: 46px;
      font-size: 27px;
      border-radius: 14px;
    }

    .header-illustration {
      display: none;
    }

    .dialog-close {
      top: 10px;
      right: 10px;
    }

    .status-dialog-content {
      padding: 0 16px;
    }

    .order-summary {
      padding: 10px 0 8px;
    }

    .order-number-row {
      gap: 8px;

      span {
        font-size: 14px;
      }

      strong {
        max-width: 68vw;
        overflow: hidden;
        font-size: 19px;
        text-overflow: ellipsis;
      }
    }

    .order-meta {
      gap: 8px 12px;

      > i {
        display: none;
      }
    }

    .meta-item {
      font-size: 12px;
    }

    .status-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 7px;
    }

    .status-card {
      min-height: 98px;
      padding: 4px 4px 6px;

      strong {
        margin-top: -6px;
        font-size: 13px;
      }
    }

    .status-illustration {
      width: 58px;
      height: 58px;
    }

    .status-description {
      display: none;
    }

    .remark-section {
      margin-top: 10px;
    }

    .status-dialog-footer {
      gap: 10px;

      .el-button {
        flex: 1;
        width: auto;
      }
    }
  }
</style>

<style lang="scss">
  .order-status-dialog {
    overflow: hidden;
    border: 1px solid rgb(218 226 239 / 85%);
    border-radius: 16px;
    box-shadow: 0 28px 80px rgb(20 38 72 / 24%);

    .el-dialog__header {
      padding: 0;
      margin: 0;
      border-bottom: 1px solid #edf1f7;
    }

    .el-dialog__body {
      padding: 0 0 12px;
      overflow: hidden;
    }

    .el-dialog__footer {
      padding: 9px 24px 13px;
    }
  }

  .dark .order-status-dialog {
    background: #171a21;
    border-color: #313743;

    .status-dialog-header {
      background:
        radial-gradient(circle at 82% 110%, rgb(63 112 204 / 18%), transparent 40%),
        linear-gradient(112deg, #1c2029, #191d25);
    }

    .header-title-wrap h2,
    .order-number-row strong,
    .status-section h3,
    .remark-section label,
    .status-card strong {
      color: #eef3ff;
    }

    .status-card {
      background: #20242d;
      border-color: #343b48;
    }

    .el-dialog__header,
    .el-dialog__footer {
      border-color: #2d333f;
    }
  }

  @media (width <= 640px) {
    .order-status-dialog {
      width: calc(100vw - 20px) !important;

      .el-dialog__footer {
        padding: 8px 16px 11px;
      }
    }
  }
</style>
