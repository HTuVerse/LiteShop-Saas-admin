<!-- 核销记录搜索 -->
<template>
  <ArtSearchBar
    ref="searchBarRef"
    v-model="formData"
    :items="formItems"
    @reset="handleReset"
    @search="handleSearch"
  />
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'

  interface Props {
    modelValue: Record<string, any>
  }

  interface Emits {
    (e: 'update:modelValue', value: Record<string, any>): void
    (e: 'search', params: Record<string, any>): void
    (e: 'reset'): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  const searchBarRef = ref()
  const formData = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
  })

  // 核销状态：0-未核销，1-已核销
  const statusOptions = [
    { label: '全部', value: undefined },
    { label: '已核销', value: 1 },
    { label: '未核销', value: 0 }
  ]

  const formItems = computed(() => [
    {
      label: '核销人ID',
      key: 'merchantId',
      type: 'input',
      labelWidth: '90',
      props: {
        placeholder: '请输入核销管理员ID',
        type: 'number',
        clearable: true,
        controlsPosition: 'right'
      }
    },
    {
      label: '核销状态',
      key: 'status',
      type: 'select',
      props: { placeholder: '请选择状态', options: statusOptions, clearable: true }
    }
  ])

  function handleReset() {
    emit('reset')
  }

  async function handleSearch() {
    emit('search', formData.value)
  }
</script>
