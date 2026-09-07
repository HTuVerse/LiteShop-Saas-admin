<template>
  <ElDialog
    :model-value="visible"
    :show-close="false"
    width="min(600px, calc(100vw - 28px))"
    align-center
    class="sku-dialog"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div v-if="commodity" class="sku-content">
      <button class="dialog-close" type="button" aria-label="关闭" @click="handleClose">×</button>
      <header class="commodity-info" :class="{ 'sold-out': isSoldOut }">
        <div class="info-image">
          <ElImage :src="commodity.dishImage" fit="cover">
            <template #error>
              <div class="image-placeholder"
                ><ElIcon :size="42"><Picture /></ElIcon
              ></div>
            </template>
          </ElImage>
          <span v-if="isSoldOut" class="sold-out-mask">售完</span>
        </div>
        <div class="info-detail">
          <h2>{{ commodity.dishName }}</h2>
          <p>{{ commodity.dishDesc || '请选择偏好的商品规格，我们会按选择为您加入订单。' }}</p>
          <div class="price-row">
            <strong class="current-price">￥{{ currentPrice.toFixed(2) }}</strong>
            <del v-if="showOriginalPrice" class="original-price">
              ￥{{ originalPrice.toFixed(2) }}
            </del>
          </div>
          <div class="dish-tags">
            <span v-if="commodity.categoryName">{{ commodity.categoryName }}</span>
            <span>库存 {{ commodity.stock }}</span>
            <span>现点现制</span>
          </div>
        </div>
      </header>

      <main class="spec-groups">
        <section v-for="(group, groupIndex) in specGroups" :key="group.name" class="spec-group">
          <div class="group-header">
            <h3>{{ group.name }}</h3>
            <span v-if="group.moreSelect">（可多选）</span>
            <span v-else-if="!group.isRequired">（可选）</span>
          </div>
          <div class="spec-options" :class="{ additions: group.moreSelect }">
            <button
              v-for="(option, optionIndex) in group.options"
              :key="option.id"
              class="spec-option"
              :class="{ active: option.selected }"
              type="button"
              @click="handleSelectSpec(groupIndex, optionIndex)"
            >
              <span class="check">✓</span>
              <strong>{{ option.specValue }}</strong>
              <small v-if="option.priceAdjust">
                {{ option.priceAdjust > 0 ? '+' : '-' }}￥{{
                  Math.abs(option.priceAdjust).toFixed(2)
                }}
              </small>
            </button>
          </div>
        </section>

        <div v-if="hasUnselectedRequired" class="required-tip">
          <ElIcon><Warning /></ElIcon><span>请完成所有必选规格</span>
        </div>
      </main>

      <footer class="sku-footer">
        <div class="quantity-control">
          <button type="button" :disabled="quantity <= 1" @click="quantity--">−</button>
          <strong>{{ quantity }}</strong>
          <button type="button" :disabled="quantity >= maxQuantity" @click="quantity++">＋</button>
        </div>
        <ElButton
          type="primary"
          size="large"
          :disabled="isSoldOut || hasUnselectedRequired"
          @click="handleConfirm"
        >
          加入订单&nbsp;&nbsp; ￥{{ (currentPrice * quantity).toFixed(2) }}
        </ElButton>
      </footer>
    </div>
  </ElDialog>
</template>

<script setup lang="ts">
  import { computed, inject, ref, watch } from 'vue'
  import { ElButton, ElDialog, ElIcon, ElImage } from 'element-plus'
  import { Picture, Warning } from '@element-plus/icons-vue'

  const props = defineProps<{ visible: boolean; commodity: any }>()
  const emit = defineEmits(['close'])
  const { cart, updateCart } = inject<any>('cart')
  const specGroups = ref<any[]>([])
  const selectedSpecs = ref<any[]>([])
  const quantity = ref(1)

  const selectedPriceAdjust = computed(() =>
    selectedSpecs.value.reduce((total, spec) => total + Number(spec.priceAdjust || 0), 0)
  )
  const currentPrice = computed(() => {
    if (!props.commodity) return 0
    return Number(props.commodity.price || 0) + selectedPriceAdjust.value
  })
  const originalPrice = computed(() => {
    if (!props.commodity) return 0
    return Number(props.commodity.originalPrice || 0) + selectedPriceAdjust.value
  })
  const showOriginalPrice = computed(
    () => originalPrice.value > 0 && originalPrice.value > currentPrice.value
  )
  const specKey = computed(() =>
    selectedSpecs.value.map((spec) => `${spec.specName}:${spec.specValue}`).join('_')
  )
  const hasUnselectedRequired = computed(() =>
    specGroups.value.some(
      (group) => group.isRequired && !group.options.some((option: any) => option.selected)
    )
  )

  const getCartSpecCount = () => {
    if (!props.commodity) return 0
    return cart.commodity.reduce(
      (count: number, item: any) =>
        item.id === props.commodity.id && item.specKey === specKey.value
          ? count + Number(item.number || 0)
          : count,
      0
    )
  }
  const maxQuantity = computed(() =>
    Math.max(1, Number(props.commodity?.stock || 0) - getCartSpecCount())
  )
  const isSoldOut = computed(
    () => !props.commodity || Number(props.commodity.stock || 0) <= getCartSpecCount()
  )

  const updateSelectedSpecs = () => {
    selectedSpecs.value = specGroups.value.flatMap((group) =>
      group.options
        .filter((option: any) => option.selected)
        .map((option: any) => ({
          specName: group.name,
          specValue: option.specValue,
          priceAdjust: Number(option.priceAdjust || 0)
        }))
    )
  }

  const processSpecOptions = () => {
    quantity.value = 1
    specGroups.value = (props.commodity?.specOptions || []).map((spec: any) => {
      const isRequired = [1, true, '是'].includes(spec.isRequired)
      const moreSelect = [1, true, '是'].includes(spec.moreSelect)
      const options = spec.options || []
      const defaultIndex = options.findIndex((option: any) => option.isDefault === true)
      const selectedIndex = defaultIndex >= 0 ? defaultIndex : isRequired ? 0 : -1
      return {
        name: spec.specName,
        isRequired,
        moreSelect,
        options: options.map((option: any, index: number) => ({
          ...option,
          selected: moreSelect ? option.isDefault === true : index === selectedIndex
        }))
      }
    })
    updateSelectedSpecs()
  }

  const handleSelectSpec = (groupIndex: number, optionIndex: number) => {
    const group = specGroups.value[groupIndex]
    const option = group.options[optionIndex]
    if (group.moreSelect) option.selected = !option.selected
    else if (!group.isRequired && option.selected) option.selected = false
    else
      group.options.forEach((item: any, index: number) => (item.selected = index === optionIndex))
    updateSelectedSpecs()
    quantity.value = Math.min(quantity.value, maxQuantity.value)
  }

  const handleConfirm = () => {
    if (isSoldOut.value || hasUnselectedRequired.value) return
    updateCart({
      ...props.commodity,
      price: currentPrice.value,
      selectedSpecs: selectedSpecs.value,
      specKey: specKey.value,
      specText: selectedSpecs.value.map((spec) => spec.specValue).join(','),
      number: quantity.value,
      isGift: 0
    })
    handleClose()
  }

  const handleClose = () => emit('close')
  watch(
    () => props.commodity,
    (value) => value && processSpecOptions(),
    { immediate: true }
  )
</script>

<style scoped lang="scss">
  :deep(.sku-dialog) {
    overflow: hidden;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 16px;
    box-shadow: 0 22px 60px rgb(15 38 86 / 22%);

    .el-dialog__header,
    .el-dialog__footer {
      display: none;
    }

    .el-dialog__body {
      padding: 0;
    }
  }

  .sku-content {
    position: relative;
    padding: 14px 16px 12px;
    overflow: hidden;
  }

  .dialog-close {
    position: absolute;
    top: 10px;
    right: 11px;
    z-index: 3;
    width: 28px;
    height: 28px;
    padding: 0;
    font-size: 21px;
    line-height: 25px;
    color: var(--el-text-color-secondary);
    cursor: pointer;
    background: var(--el-fill-color-light);
    border: 0;
    border-radius: 50%;
  }

  .commodity-info {
    display: grid;
    grid-template-columns: 132px 1fr;
    gap: 14px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--el-border-color-lighter);

    &.sold-out {
      opacity: 0.68;
    }

    .info-image {
      position: relative;
      height: 98px;
      overflow: hidden;
      border-radius: 11px;
    }

    .el-image,
    .image-placeholder {
      width: 100%;
      height: 100%;
    }

    .image-placeholder {
      display: grid;
      place-items: center;
      color: var(--el-text-color-placeholder);
      background: var(--el-fill-color);
    }

    .sold-out-mask {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      font-size: 20px;
      font-weight: 700;
      color: #fff;
      background: rgb(0 0 0 / 55%);
    }

    .info-detail {
      min-width: 0;
      padding: 1px 34px 0 0;

      h2 {
        margin: 0;
        overflow: hidden;
        font-size: 18px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      p {
        display: -webkit-box;
        min-height: 30px;
        margin: 4px 0 5px;
        overflow: hidden;
        font-size: 11px;
        line-height: 1.35;
        color: var(--el-text-color-secondary);
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
      }

      .price-row {
        display: flex;
        gap: 7px;
        align-items: baseline;
      }

      .current-price {
        font-size: 18px;
        color: var(--el-color-danger);
      }

      .original-price {
        font-size: 11px;
        color: var(--el-text-color-placeholder);
      }
    }

    .dish-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 4px;

      span {
        padding: 2px 6px;
        font-size: 9px;
        color: var(--el-color-primary);
        background: var(--el-color-primary-light-9);
        border-radius: 6px;
      }
    }
  }

  .spec-groups {
    padding-top: 1px;
  }

  .spec-group {
    margin-top: 7px;

    .group-header {
      display: flex;
      align-items: baseline;
      margin-bottom: 4px;

      h3 {
        margin: 0;
        font-size: 13px;
      }

      span {
        margin-left: 6px;
        font-size: 10px;
        color: var(--el-text-color-secondary);
      }
    }
  }

  .spec-options {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;

    &.additions {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  .spec-option {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 2px;
    align-items: center;
    justify-content: center;
    min-height: 36px;
    padding: 4px 7px;
    color: var(--el-text-color-primary);
    cursor: pointer;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color);
    border-radius: 8px;
    transition: 0.2s ease;

    .check {
      position: absolute;
      top: -7px;
      right: -6px;
      display: none;
      width: 18px;
      height: 18px;
      font-size: 10px;
      font-weight: 700;
      line-height: 16px;
      color: #fff;
      background: var(--el-color-primary);
      border: 2px solid var(--el-bg-color);
      border-radius: 50%;
    }

    strong {
      max-width: 100%;
      overflow: hidden;
      font-size: 12px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    small {
      font-size: 9px;
      color: var(--el-text-color-secondary);
    }

    &:hover,
    &.active {
      color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
      border-color: var(--el-color-primary);
    }

    &.active .check {
      display: block;
    }
  }

  .required-tip {
    display: flex;
    gap: 6px;
    align-items: center;
    padding: 4px 8px;
    margin-top: 6px;
    font-size: 10px;
    color: var(--el-color-danger);
    background: var(--el-color-danger-light-9);
    border-radius: 8px;
  }

  .sku-footer {
    display: grid;
    grid-template-columns: auto minmax(240px, 1fr);
    gap: 14px;
    align-items: center;
    padding-top: 10px;
    margin-top: 10px;
    border-top: 1px solid var(--el-border-color-lighter);

    > .el-button {
      height: 40px;
      margin: 0;
      font-size: 14px;
      border-radius: 20px;
    }
  }

  .quantity-control {
    display: grid;
    grid-template-columns: 36px 40px 36px;
    align-items: center;
    text-align: center;

    button {
      width: 34px;
      height: 34px;
      font-size: 18px;
      color: var(--el-text-color-primary);
      cursor: pointer;
      background: var(--el-fill-color-light);
      border: 0;
      border-radius: 50%;
    }

    button:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }

    strong {
      font-size: 15px;
    }
  }

  @media (height <= 650px) and (width > 680px) {
    .sku-content {
      padding-block: 10px;
    }

    .commodity-info {
      grid-template-columns: 112px 1fr;

      .info-image {
        height: 82px;
      }
    }

    .spec-group {
      margin-top: 5px;
    }

    .spec-option {
      min-height: 32px;
    }

    .sku-footer {
      padding-top: 7px;
      margin-top: 7px;
    }
  }

  @media (width <= 680px) {
    .sku-content {
      padding: 14px;
    }

    .commodity-info {
      grid-template-columns: 100px 1fr;
      gap: 12px;

      .info-image {
        height: 90px;
      }

      .info-detail {
        padding-right: 35px;

        h2,
        .current-price {
          font-size: 17px;
        }

        p,
        .dish-tags {
          display: none;
        }
      }
    }

    .spec-options,
    .spec-options.additions {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .sku-footer {
      grid-template-columns: 1fr;
      gap: 10px;
    }
  }
</style>
