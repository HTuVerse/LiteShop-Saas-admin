<template>
  <ElDialog
    v-model="dialogVisible"
    :title="`套餐权益 · v${version?.versionNo || ''}`"
    width="1050px"
    align-center
  >
    <ArtForm
      v-model="pricingModel"
      :items="pricingItems"
      :span="8"
      :gutter="12"
      label-width="78px"
      :show-reset="false"
      :show-submit="false"
    />
    <ArtTable :data="tableData" :columns="columns" max-height="430" size="small">
      <template #ruleEnabled="{ row }">
        <ElSwitch v-model="row.enabled" :disabled="readonly" />
      </template>
      <template #ruleQuota="{ row }">
        <span v-if="row.featureType === 'BOOLEAN'">—</span>
        <ElInputNumber
          v-else-if="isNumericType(row.featureType)"
          v-model="row.quotaValue"
          :disabled="!row.enabled || row.unlimited || readonly"
          :min="row.featureCode === 'store_count' ? 1 : 0"
          controls-position="right"
        />
        <ElInput
          v-else
          v-model="row.textValue"
          :disabled="!row.enabled || readonly"
          placeholder="文本/枚举值"
        />
      </template>
      <template #ruleUnlimited="{ row }">
        <ElSwitch
          v-if="isNumericType(row.featureType)"
          v-model="row.unlimited"
          :disabled="readonly"
        />
      </template>
      <template #rulePeriod="{ row }">
        <ElSelect
          v-if="isNumericType(row.featureType)"
          v-model="row.resetPeriod"
          :disabled="readonly || row.featureCode === 'store_count'"
        >
          <ElOption label="不重置" value="NONE" />
          <ElOption label="每天" value="DAY" />
          <ElOption label="自然月" value="MONTH" />
          <ElOption label="订阅周期" value="BILLING_CYCLE" />
        </ElSelect>
      </template>
      <template #ruleEnforcement="{ row }">
        <ElSelect
          v-if="isNumericType(row.featureType)"
          v-model="row.enforcement"
          :disabled="readonly || row.featureCode === 'store_count'"
        >
          <ElOption label="硬限制" value="HARD" />
          <ElOption label="软提醒" value="SOFT" />
        </ElSelect>
      </template>
    </ArtTable>
    <template #footer>
      <ElButton @click="dialogVisible = false">关闭</ElButton>
      <ElButton v-if="!readonly" type="primary" :loading="saving" @click="emit('submit')">
        保存权益
      </ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import type { FormItem } from '@/components/core/forms/art-form/index.vue'
  import { useTable } from '@/hooks/core/useTable'
  import type { PlanEntitlement, SaasFeature, SaasPlanVersion } from '@/api/saas'
  import type { Id } from '@/types/backend'

  export type PlanRuleRow = SaasFeature & {
    featureId: Id
    enabled: boolean
    unlimited: boolean
    quotaValue: number | null
    textValue: string | null
    resetPeriod: PlanEntitlement['resetPeriod']
    enforcement: PlanEntitlement['enforcement']
  }

  const props = withDefaults(
    defineProps<{ version?: SaasPlanVersion; rows?: PlanRuleRow[]; saving?: boolean }>(),
    { version: undefined, rows: () => [], saving: false }
  )
  const emit = defineEmits<{ submit: [] }>()
  const dialogVisible = defineModel<boolean>('visible', { default: false })
  const readonly = computed(() => props.version?.status !== 'DRAFT')
  const pricingModel = computed<Record<string, any>>({
    get: () => props.version || {},
    set: (value) => props.version && Object.assign(props.version, value)
  })
  const pricingItems = computed<FormItem[]>(() => [
    {
      key: 'monthlyPrice',
      label: '月付价格',
      type: 'number',
      props: { min: 0, precision: 2, disabled: readonly.value, controlsPosition: 'right' }
    },
    {
      key: 'yearlyPrice',
      label: '年付价格',
      type: 'number',
      props: { min: 0, precision: 2, disabled: readonly.value, controlsPosition: 'right' }
    },
    {
      key: 'currency',
      label: '币种',
      type: 'input',
      props: { maxlength: 3, disabled: readonly.value, placeholder: 'CNY' }
    }
  ])
  const { data: tableData, columns } = useTable({
    core: {
      dataSource: () => props.rows,
      columnsFactory: () => [
        { prop: 'featureCode', label: '功能', minWidth: 170 },
        { prop: 'featureName', label: '名称', minWidth: 115 },
        { prop: 'ruleEnabled', label: '启用', width: 70, useSlot: true },
        { prop: 'ruleQuota', label: '额度', width: 125, useSlot: true },
        { prop: 'ruleUnlimited', label: '不限量', width: 80, useSlot: true },
        { prop: 'rulePeriod', label: '重置周期', width: 135, useSlot: true },
        { prop: 'ruleEnforcement', label: '限制方式', width: 100, useSlot: true }
      ]
    }
  })
  const isNumericType = (type?: string) => type === 'NUMBER' || type === 'QUOTA'
</script>
