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

  // 显示状态选项
  const showOptions = ref<{ label: string; value: number }[]>([
    { value: 1, label: '显示' },
    { value: 0, label: '隐藏' }
  ])

  // 层级选项
  const levelOptions = ref<{ label: string; value: number }[]>([
    { value: 1, label: '一级分类' },
    { value: 2, label: '二级分类' }
  ])

  // 表单配置
  const formItems = computed(() => [
    {
      label: '分类名称',
      key: 'categoryName',
      type: 'input',
      props: { placeholder: '请输入分类名称', maxlength: '50' }
    },
    {
      label: '显示状态',
      key: 'isShow',
      type: 'select',
      props: { placeholder: '请选择显示状态', options: showOptions.value }
    },
    {
      label: '分类层级',
      key: 'level',
      type: 'select',
      props: { placeholder: '请选择分类层级', options: levelOptions.value }
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
