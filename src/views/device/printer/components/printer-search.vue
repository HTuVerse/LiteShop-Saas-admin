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
  import { ref, computed, onMounted } from 'vue'
  import { useManagedStores } from '../../composables/useManagedStores'

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

  const { storeOptions, storesLoading, storesError, loadStores } = useManagedStores()
  onMounted(() => {
    void loadStores()
  })

  // 校验规则
  const rules = {}

  // 打印机品牌选项
  const brandOptions = ref<{ label: string; value: number }[]>([
    { value: 1, label: '飞鹅' },
    { value: 2, label: '其它' }
  ])

  // 在线状态选项
  const statusOptions = ref<{ label: string; value: number }[]>([
    { value: 0, label: '离线' },
    { value: 1, label: '在线' },
    { value: 2, label: '缺纸' }
  ])

  // 表单配置
  const formItems = computed(() => [
    {
      label: '门店',
      key: 'storeId',
      type: 'select',
      props: {
        placeholder: '请选择门店',
        options: storeOptions.value,
        clearable: true,
        filterable: true,
        loading: storesLoading.value,
        noDataText: storesError.value ? '门店加载失败，请刷新页面' : '暂无可管理的门店'
      }
    },
    {
      label: '品牌',
      key: 'printerBrand',
      type: 'select',
      props: { placeholder: '请选择品牌', options: brandOptions.value }
    },
    {
      label: '在线状态',
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
