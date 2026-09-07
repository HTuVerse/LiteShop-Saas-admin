<template>
  <ArtSearchBar
    ref="searchBarRef"
    v-model="formData"
    :items="formItems"
    :rules="rules"
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

  // 表单数据双向绑定
  const searchBarRef = ref()
  const formData = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
  })

  // 校验规则
  const rules = {}

  // 状态选项
  const statusOptions = [
    { label: '全部', value: null },
    { label: '停业', value: 0 },
    { label: '营业', value: 1 },
    { label: '休息中', value: 2 }
  ]

  // 表单配置
  const formItems = computed(() => [
    {
      label: '门店名称',
      key: 'storeName',
      type: 'input',
      props: { placeholder: '请输入门店名称', maxlength: '50', clearable: true }
    },
    {
      label: '状态',
      key: 'status',
      type: 'select',
      props: { placeholder: '请选择状态', options: statusOptions }
    }
  ])

  // 事件
  function handleReset() {
    emit('reset')
  }

  async function handleSearch() {
    await searchBarRef.value.validate()
    emit('search', formData.value)
  }
</script>
