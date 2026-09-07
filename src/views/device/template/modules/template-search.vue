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

  const { storeOptions, storesLoading, storesError, loadStores } = useManagedStores()
  onMounted(() => {
    void loadStores()
  })

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

  const rules = {}

  const enabledOptions = [
    { label: '禁用', value: 0 },
    { label: '正常', value: 1 }
  ]

  const formItems = computed(() => [
    {
      label: '门店',
      key: 'storeId',
      type: 'select',
      props: {
        placeholder: '请选择门店',
        clearable: true,
        filterable: true,
        options: storeOptions.value,
        loading: storesLoading.value,
        noDataText: storesError.value ? '门店加载失败，请刷新页面' : '暂无可管理的门店'
      }
    },
    {
      label: '启用状态',
      key: 'enabled',
      type: 'select',
      props: { placeholder: '请选择状态', options: enabledOptions, clearable: true }
    }
  ])

  function handleReset() {
    emit('reset')
  }

  async function handleSearch() {
    await searchBarRef.value?.validate()
    emit('search', formData.value)
  }
</script>
