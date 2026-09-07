<!-- 核销记录管理 -->
<template>
  <div class="art-full-height">
    <RecordSearch
      :model-value="searchForm"
      @update:model-value="(value) => Object.assign(searchForm, value)"
      @search="handleSearch"
      @reset="resetSearchParam"
    />

    <ElCard class="art-table-card" shadow="never">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <span class="table-title">核销记录列表</span>
        </template>
      </ArtTableHeader>

      <ArtTable
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>

    <RecordDetailDialog v-model:visible="detailDialogVisible" :record-id="currentRecordId" />
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, h } from 'vue'
  import { ElCard, ElButton, ElTag } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import RecordSearch from './modules/record-search.vue'
  import RecordDetailDialog from './modules/record-detail-dialog.vue'
  import { fetchGetVerifyRecordList } from '@/api/coupon-manage'

  defineOptions({ name: 'VerifyRecordManage' })

  const searchForm = reactive<Api.Coupon.VerifyRecordSearchParams>({
    merchantId: undefined,
    status: undefined
  })

  const detailDialogVisible = ref(false)
  const currentRecordId = ref<number | null>(null)

  const {
    data,
    columns,
    columnChecks,
    loading,
    getData,
    pagination,
    refreshData,
    resetSearchParams,
    handleSizeChange,
    handleCurrentChange
  } = useTable({
    core: {
      apiFn: fetchGetVerifyRecordList,
      apiParams: {
        currentPage: 1,
        pageSize: 10,
        merchantId: searchForm.merchantId,
        status: searchForm.status
      },
      paginationKey: {
        current: 'currentPage',
        size: 'pageSize'
      },
      columnsFactory: () => [
        {
          prop: 'id',
          label: 'ID',
          minWidth: 80,
          sortable: true
        },
        {
          prop: 'userCouponId',
          label: '用户优惠券ID',
          minWidth: 120
        },
        {
          prop: 'merchantId',
          label: '核销人ID',
          minWidth: 100
        },
        {
          prop: 'verifyCode',
          label: '核销码',
          minWidth: 160
        },
        {
          prop: 'status',
          label: '核销状态',
          minWidth: 100,
          align: 'center',
          formatter: (row: Api.Coupon.VerifyRecord) => {
            // 后端 VerifyStatusEnum 使用 @JsonValue 返回文字："未核销" | "已核销"
            const statusText = String(row.status)
            const type = statusText === '已核销' ? 'success' : 'info'
            return h(ElTag, { type, size: 'small' }, { default: () => statusText || '-' })
          }
        },
        {
          prop: 'verifyTime',
          label: '核销时间',
          minWidth: 180,
          formatter: (row: Api.Coupon.VerifyRecord) => {
            const t = row.verifyTime
            return t ? t.substring(0, 19).replace('T', ' ') : '-'
          }
        },
        {
          prop: 'operation',
          label: '操作',
          width: 120,
          fixed: 'right',
          formatter: (row: Api.Coupon.VerifyRecord) => {
            return h('div', { class: 'flex flex-wrap gap-1' }, [
              h(ArtButtonTable, {
                type: 'view',
                onClick: () => openDetail(row)
              })
            ])
          }
        }
      ]
    }
  })

  function handleSearch() {
    const merchantId =
      searchForm.merchantId !== undefined && String(searchForm.merchantId) !== ''
        ? searchForm.merchantId
        : undefined
    getData({
      merchantId,
      status: searchForm.status
    })
  }

  function resetSearchParam() {
    searchForm.merchantId = undefined
    searchForm.status = undefined
    resetSearchParams()
  }

  function openDetail(row: Api.Coupon.VerifyRecord) {
    currentRecordId.value = row.id
    detailDialogVisible.value = true
  }
</script>

<style lang="scss" scoped>
  .art-table-card {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .table-title {
    font-weight: 500;
  }
</style>
