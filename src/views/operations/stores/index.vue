<template>
  <ElCard shadow="never"
    ><h2>我的门店</h2
    ><p style="margin: 16px 0; color: var(--el-text-color-secondary)"
      >展示当前账号获授权的门店。资料维护请联系商户管理员。</p
    ><ArtTable :data="stores" v-loading="loading" :columns="tableColumns"></ArtTable
  ></ElCard>
</template>
<script setup lang="ts">
  import { useTable } from '@/hooks/core/useTable'
  import { fetchGetStoreList } from '@/api/dish-manage'

  const {
    data: stores,
    columns: tableColumns,
    loading
  } = useTable({
    core: {
      apiFn: fetchGetStoreList,
      columnsFactory: () => [
        { prop: 'storeName', label: '门店' },
        { prop: 'storeCode', label: '编码' },
        { prop: 'address', label: '地址', minWidth: 220 },
        { prop: 'phone', label: '联系电话' },
        { prop: 'businessHours', label: '营业时间' },
        { prop: 'status', label: '状态' }
      ]
    }
  })
</script>
