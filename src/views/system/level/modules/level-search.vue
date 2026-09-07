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
  const statusOptions = ref<{ label: string; value: number | undefined }[]>([
    { value: 1, label: '启用' },
    { value: 0, label: '禁用' }
  ])

  // 表单配置
  const formItems = computed(() => [
    {
      label: '等级名称',
      key: 'levelName',
      type: 'input',
      props: { placeholder: '请输入等级名称', maxlength: '50' }
    },
    {
      label: '等级编码',
      key: 'levelCode',
      type: 'input',
      props: { placeholder: '请输入等级编码', maxlength: '50' }
    },
    {
      label: '状态',
      key: 'status',
      type: 'select',
      props: { placeholder: '请选择状态', options: statusOptions.value }
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
