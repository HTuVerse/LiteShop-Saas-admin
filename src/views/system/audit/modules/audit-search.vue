<template>
  <ArtSearchBar
    ref="searchBarRef"
    v-model="formData"
    :items="items"
    @search="emit('search')"
    @reset="emit('reset')"
  />
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import type { AuditSearchModel } from '@/api/system-audit'

  const props = defineProps<{ modelValue: AuditSearchModel; showTenant: boolean }>()
  const emit = defineEmits<{
    (event: 'update:modelValue', value: AuditSearchModel): void
    (event: 'search'): void
    (event: 'reset'): void
  }>()

  const searchBarRef = ref()
  const formData = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })

  const items = computed(() => [
    ...(props.showTenant
      ? [{ label: '租户 ID', key: 'tenantId', type: 'input', props: { placeholder: '全部租户' } }]
      : []),
    { label: '操作账号', key: 'account', type: 'input', props: { placeholder: '账号名称' } },
    { label: 'IP 地址', key: 'ip', type: 'input', props: { placeholder: '完整 IP 地址' } },
    { label: '操作模块', key: 'module', type: 'input', props: { placeholder: '模块编码' } },
    { label: '操作类型', key: 'type', type: 'input', props: { placeholder: '类型编码' } },
    {
      label: '执行结果',
      key: 'result',
      type: 'select',
      props: {
        placeholder: '全部结果',
        clearable: true,
        options: [
          { label: '成功', value: 'SUCCESS' },
          { label: '失败', value: 'FAILURE' },
          { label: '拒绝', value: 'DENIED' }
        ]
      }
    },
    {
      label: '操作时间',
      key: 'dateRange',
      type: 'datetime',
      props: {
        type: 'datetimerange',
        valueFormat: 'x',
        rangeSeparator: '至',
        startPlaceholder: '开始时间',
        endPlaceholder: '结束时间',
        clearable: true
      }
    }
  ])
</script>
