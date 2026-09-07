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
  import { fetchGetCategoryPage, fetchGetStoreList } from '@/api/dish-manage'

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

  onMounted(() => {
    fetchCategoryOptions()
  })
  // 校验规则
  const rules = {
    // dishName: [{ required: false, message: '请输入菜品名称', trigger: 'blur' }]
  }

  // 动态 options（分页 50 条，超过可懒加载）
  const categoryOptions = ref<{ label: string; value: number; disabled?: boolean }[]>([])
  const categoryPage = ref(1)
  const categoryTotal = ref(0)

  const fetchCategoryOptions = async (append = false) => {
    const page = append ? categoryPage.value + 1 : 1
    const res = await fetchGetCategoryPage({ currentPage: page, pageSize: 50 }).catch(() => ({
      records: [],
      total: 0
    }))
    const list = (res?.records || []).map((item: any) => ({
      label: item.categoryName,
      value: item.id
    }))
    if (append) categoryOptions.value = categoryOptions.value.concat(list)
    else categoryOptions.value = list
    categoryPage.value = page
    categoryTotal.value = res?.total ?? 0
  }

  const storeOptions = ref<{ label: string; value: number; disabled?: boolean }[]>([])
  onMounted(async () => {
    try {
      const result = await fetchGetStoreList()
      storeOptions.value = result.records.map((store) => ({
        value: store.id,
        label: store.storeName
      }))
    } catch {
      /* The request layer displays failures. */
    }
  })

  const booleanOptions = ref<{ label: string; value: number; disabled?: boolean }[]>([
    { value: 1, label: '是' },
    { value: 0, label: '否' }
  ])

  const sceneOptions = ref<{ label: string; value: number; disabled?: boolean }[]>([
    { value: 0, label: '在线点餐' },
    { value: 1, label: '预点餐' },
    { value: 2, label: '门店自提' },
    { value: 3, label: '管理员下单' }
  ])

  const statusOptions = ref<{ label: string; value: number; disabled?: boolean }[]>([
    { value: 1, label: '上架' },
    { value: 0, label: '下架' }
  ])

  // 表单配置
  const formItems = computed(() => [
    {
      label: '菜品名称',
      key: 'dishName',
      type: 'input',
      props: { placeholder: '请输入菜品名称', maxlength: '50' }
    },
    {
      label: '分类',
      key: 'categoryId',
      type: 'select',
      props: { placeholder: '请选择分类', options: categoryOptions.value }
    },
    {
      label: '门店',
      key: 'storeId',
      type: 'select',
      props: { placeholder: '请选择门店', options: storeOptions.value }
    },
    {
      label: '推荐',
      key: 'isRecommend',
      type: 'select',
      props: { placeholder: '是否推荐', options: booleanOptions.value }
    },
    {
      label: '热门',
      key: 'isHot',
      type: 'select',
      props: { placeholder: '是否热门', options: booleanOptions.value }
    },
    {
      label: '新品',
      key: 'isNew',
      type: 'select',
      props: { placeholder: '是否新品', options: booleanOptions.value }
    },
    {
      label: '场景',
      key: 'sceneType',
      type: 'select',
      props: { placeholder: '使用场景', options: sceneOptions.value }
    },
    {
      label: '状态',
      key: 'saleStatus',
      type: 'select',
      props: { placeholder: '销售状态', options: statusOptions.value }
    }
  ])

  // 事件
  function handleReset() {
    emit('reset')
  }

  async function handleSearch() {
    await searchBarRef.value.validate()
    emit('search', formData.value)
    console.log('表单数据', formData.value)
  }
</script>
