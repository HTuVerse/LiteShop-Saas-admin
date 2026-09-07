import { computed, ref } from 'vue'
import type { FormItemRule } from 'element-plus'
import { fetchGetStoreList } from '@/api/dish-manage'
import type { Id } from '@/types/backend'

export function useManagedStores() {
  const storeOptions = ref<{ label: string; value: string }[]>([])
  const storesLoading = ref(false)
  const storesError = ref(false)
  let requestId = 0

  // 由后端按当前租户和门店授权过滤，并通过现有接口取齐分页。
  async function loadStores() {
    const currentRequest = ++requestId
    storesLoading.value = true
    storesError.value = false
    storeOptions.value = []
    try {
      const { records } = await fetchGetStoreList()
      if (currentRequest !== requestId) return false
      storeOptions.value = records.map((store) => ({
        label: store.storeName,
        value: String(store.id)
      }))
      return true
    } catch {
      if (currentRequest === requestId) storesError.value = true
      return false
    } finally {
      if (currentRequest === requestId) storesLoading.value = false
    }
  }

  function resolveStoreId(value?: Id | null) {
    return storeOptions.value.find((store) => store.value === String(value))?.value
  }

  const defaultStoreId = computed(() =>
    storeOptions.value.length === 1 ? storeOptions.value[0].value : undefined
  )

  const storeRules: FormItemRule[] = [
    { required: true, message: '请选择所属门店', trigger: 'change' },
    {
      trigger: 'change',
      validator: (_rule, value, callback) => {
        if (storesLoading.value) callback(new Error('门店列表加载中，请稍候'))
        else if (storesError.value) callback(new Error('门店列表加载失败，请重新打开弹窗'))
        else if (!resolveStoreId(value)) callback(new Error('请选择有管理权限的门店'))
        else callback()
      }
    }
  ]

  return {
    storeOptions,
    storesLoading,
    storesError,
    loadStores,
    resolveStoreId,
    defaultStoreId,
    storeRules
  }
}
