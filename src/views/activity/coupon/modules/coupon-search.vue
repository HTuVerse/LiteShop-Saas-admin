<!-- 优惠券搜索组件 -->
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

  // 表单数据双向绑定
  const searchBarRef = ref()
  const formData = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
  })

  // 状态选项（传数字给后端：0-下架, 1-上架）
  const statusOptions = [
    { label: '上架中', value: 1 },
    { label: '已下架', value: 0 }
  ]

  // 表单配置
  const formItems = computed(() => [
    {
      label: '优惠券名称',
      key: 'name',
      type: 'input',
      labelWidth: '90',
      props: { placeholder: '请输入优惠券名称', maxlength: 50, clearable: true }
    },
    {
      label: '上架状态',
      key: 'status',
      type: 'select',
      props: { placeholder: '全部状态', options: statusOptions, clearable: true }
    }
  ])

  // 事件
  function handleReset() {
    emit('reset')
  }

  async function handleSearch() {
    emit('search', formData.value)
  }
</script>
