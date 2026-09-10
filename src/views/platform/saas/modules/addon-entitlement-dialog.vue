<template>
  <ElDialog v-model="dialogVisible" title="配置加购权益" width="760px" align-center>
    <ArtTable :data="tableData" :columns="columns" max-height="440" size="small">
      <template #included="{ row }"><ElCheckbox v-model="row.included" /></template>
      <template #operation="{ row }">
        <ElSelect
          v-model="row.operation"
          :disabled="!row.included || row.featureCode === 'store_count'"
        >
          <ElOption v-if="row.featureType === 'BOOLEAN'" label="解锁" value="ENABLE" />
          <ElOption v-if="isNumericType(row.featureType)" label="增加额度" value="ADD" />
          <ElOption
            v-if="isNumericType(row.featureType) || ['STRING', 'ENUM'].includes(row.featureType)"
            label="设置额度"
            value="SET"
          />
        </ElSelect>
      </template>
      <template #quota="{ row }">
        <ElInputNumber
          v-if="row.operation !== 'ENABLE' && isNumericType(row.featureType)"
          v-model="row.quotaValue"
          :disabled="!row.included"
          :min="0"
        />
        <ElInput
          v-else-if="row.operation === 'SET' && ['STRING', 'ENUM'].includes(row.featureType)"
          v-model="row.textValue"
          :disabled="!row.included"
          placeholder="文本/枚举值"
        />
      </template>
    </ArtTable>
    <template #footer>
      <ElButton @click="dialogVisible = false">取消</ElButton>
      <ElButton type="primary" :loading="saving" @click="emit('submit')">保存</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { useTable } from '@/hooks/core/useTable'
  import type { AddonEntitlement, SaasFeature } from '@/api/saas'
  import type { Id } from '@/types/backend'

  export type AddonRuleRow = SaasFeature & {
    featureId: Id
    included: boolean
    operation: AddonEntitlement['operation']
    quotaValue: number | null
    textValue: string | null
  }

  const props = withDefaults(defineProps<{ rows?: AddonRuleRow[]; saving?: boolean }>(), {
    rows: () => [],
    saving: false
  })
  const emit = defineEmits<{ submit: [] }>()
  const dialogVisible = defineModel<boolean>('visible', { default: false })
  const { data: tableData, columns } = useTable({
    core: {
      dataSource: () => props.rows,
      columnsFactory: () => [
        { prop: 'included', label: '选择', width: 65, useSlot: true },
        { prop: 'featureCode', label: '功能', minWidth: 170 },
        { prop: 'featureName', label: '名称', minWidth: 110 },
        { prop: 'operation', label: '权益操作', width: 120, useSlot: true },
        { prop: 'quota', label: '单份额度', width: 145, useSlot: true }
      ]
    }
  })
  const isNumericType = (type?: string) => type === 'NUMBER' || type === 'QUOTA'
</script>
