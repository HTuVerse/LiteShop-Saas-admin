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
  import { ElMessage } from 'element-plus'
  import { fetchGetStoreList } from '@/api/dish-manage'

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

  // 门店选项
  const storeOptions = ref<{ label: string; value: number | null }[]>([])

  // 状态选项
  const statusOptions = [
    { label: '全部', value: null },
    { label: '空闲', value: 0 },
    { label: '使用中', value: 1 },
    { label: '预留', value: 2 },
    { label: '停用', value: 3 }
  ]

  // 获取门店列表
  const fetchStoreOptions = async () => {
    try {
      const res: any = await fetchGetStoreList()
      // 后端返回的是分页数据,需要取records
      const stores = res.records || res
      storeOptions.value = [
        { label: '全部门店', value: null }, // null表示不传storeId,查询所有门店
        ...stores.map((item: any) => ({
          label: item.storeName,
          value: item.id
        }))
      ]
    } catch (err: any) {
      ElMessage.error(err.message || '获取门店列表失败')
    }
  }

  onMounted(() => {
    fetchStoreOptions()
  })

  // 表单配置
  const formItems = computed(() => [
    {
      label: '门店',
      key: 'storeId',
      type: 'select',
      props: { placeholder: '请选择门店', options: storeOptions.value }
    },
    {
      label: '餐桌编号',
      key: 'tableNumber',
      type: 'input',
      props: { placeholder: '请输入餐桌编号', maxlength: '20', clearable: true }
    },
    {
      label: '餐桌名称',
      key: 'tableName',
      type: 'input',
      props: { placeholder: '请输入餐桌名称', maxlength: '50', clearable: true }
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
