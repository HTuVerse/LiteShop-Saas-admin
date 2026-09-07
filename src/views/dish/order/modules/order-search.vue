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

  // 订单类型选项
  const orderTypeOptions = [
    { label: '全部', value: null },
    { label: '在线点餐', value: 0 },
    { label: '预点餐', value: 1 },
    { label: '门店自提', value: 2 }
  ]

  // 订单状态选项
  const orderStatusOptions = [
    { label: '全部', value: null },
    { label: '已下单', value: 1 },
    { label: '已接单', value: 2 },
    { label: '制作中', value: 3 },
    { label: '制作完成', value: 4 },
    { label: '已完成', value: 5 },
    { label: '已取消', value: 6 }
  ]

  // 支付状态选项
  const paymentStatusOptions = [
    { label: '全部', value: null },
    { label: '未支付', value: 0 },
    { label: '已支付', value: 1 },
    { label: '部分退款', value: 2 },
    { label: '全额退款', value: 3 }
  ]

  // 获取门店列表
  const fetchStoreOptions = async () => {
    try {
      const res: any = await fetchGetStoreList()
      const stores = res.records || res
      storeOptions.value = [
        { label: '全部门店', value: null },
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
      label: '手机号',
      key: 'phoneNumber',
      type: 'input',
      props: { placeholder: '请输入手机号', maxlength: '11', clearable: true }
    },
    {
      label: '订单类型',
      key: 'orderType',
      type: 'select',
      props: { placeholder: '请选择订单类型', options: orderTypeOptions }
    },
    {
      label: '订单状态',
      key: 'status',
      type: 'select',
      props: { placeholder: '请选择订单状态', options: orderStatusOptions }
    },
    {
      label: '支付状态',
      key: 'paymentStatus',
      type: 'select',
      props: { placeholder: '请选择支付状态', options: paymentStatusOptions }
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
