<template>
  <div class="art-full-height">
    <ElCard class="art-table-card" shadow="never">
      <ElTabs v-model="activeTab">
        <ElTabPane label="兑换商品" name="products">
          <div class="mall-search">
            <ElInput
              v-model="searchName"
              clearable
              placeholder="搜索商品名称"
              style="width: 240px"
              @keyup.enter="searchProducts"
            />
            <ElButton type="primary" @click="searchProducts">查询</ElButton>
            <ElButton @click="resetProducts">重置</ElButton>
          </div>
          <ArtTableHeader
            v-model:columns="productChecks"
            :loading="productLoading"
            @refresh="refreshProducts"
          >
            <template #left>
              <ElButton v-auth="'marketing:points-mall'" type="primary" @click="openProduct()"
                >新增兑换商品</ElButton
              >
            </template>
          </ArtTableHeader>
          <ArtTable
            :loading="productLoading"
            :data="products"
            :columns="productColumns"
            :pagination="productPagination"
            @pagination:size-change="productSizeChange"
            @pagination:current-change="productPageChange"
          />
        </ElTabPane>
        <ElTabPane label="兑换记录" name="orders">
          <ArtTableHeader
            v-model:columns="orderChecks"
            :loading="orderLoading"
            @refresh="refreshOrders"
          />
          <ArtTable
            :loading="orderLoading"
            :data="orders"
            :columns="orderColumns"
            :pagination="orderPagination"
            @pagination:size-change="orderSizeChange"
            @pagination:current-change="orderPageChange"
          />
        </ElTabPane>
      </ElTabs>
    </ElCard>
    <ProductDialog
      v-model:visible="dialogVisible"
      :product="editingProduct"
      @success="refreshProducts"
    />
  </div>
</template>

<script setup lang="ts">
  import { h, ref } from 'vue'
  import { ElButton, ElMessage, ElMessageBox, ElTag } from 'element-plus'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import { useTable } from '@/hooks/core/useTable'
  import { deleteMallProduct, fetchMallOrders, fetchMallProducts } from '@/api/points-mall'
  import type { PointsMallOrder, PointsMallProduct } from '@/api/points-mall'
  import ProductDialog from './modules/product-dialog.vue'

  defineOptions({ name: 'PointsMallManage' })

  const activeTab = ref('products')
  const searchName = ref('')
  const dialogVisible = ref(false)
  const editingProduct = ref<PointsMallProduct | null>(null)

  const {
    data: products,
    columns: productColumns,
    columnChecks: productChecks,
    loading: productLoading,
    getData: getProducts,
    pagination: productPagination,
    refreshData: refreshProducts,
    handleSizeChange: productSizeChange,
    handleCurrentChange: productPageChange
  } = useTable({
    core: {
      apiFn: fetchMallProducts,
      apiParams: { currentPage: 1, pageSize: 10, name: '' },
      paginationKey: { current: 'currentPage', size: 'pageSize' },
      columnsFactory: () => [
        { prop: 'name', label: '商品名称', minWidth: 170 },
        { prop: 'couponId', label: '关联优惠券 ID', minWidth: 175 },
        { prop: 'pointsPrice', label: '所需积分', width: 110 },
        { prop: 'stock', label: '兑换库存', width: 110 },
        {
          prop: 'status',
          label: '状态',
          width: 95,
          formatter: (row: PointsMallProduct) =>
            h(
              ElTag,
              { type: row.status === 1 ? 'success' : 'info' },
              { default: () => (row.status === 1 ? '上架' : '下架') }
            )
        },
        { prop: 'sort', label: '排序', width: 80 },
        {
          prop: 'operation',
          label: '操作',
          width: 155,
          fixed: 'right',
          formatter: (row: PointsMallProduct) =>
            h('div', { class: 'flex gap-1' }, [
              h(ArtButtonTable, {
                auth: 'marketing:points-mall',
                label: '编辑',
                icon: 'ri:edit-line',
                onClick: () => openProduct(row)
              }),
              h(ArtButtonTable, {
                auth: 'marketing:points-mall',
                label: '删除',
                icon: 'ri:delete-bin-line',
                onClick: () => removeProduct(row)
              })
            ])
        }
      ]
    }
  })

  const {
    data: orders,
    columns: orderColumns,
    columnChecks: orderChecks,
    loading: orderLoading,
    pagination: orderPagination,
    refreshData: refreshOrders,
    handleSizeChange: orderSizeChange,
    handleCurrentChange: orderPageChange
  } = useTable({
    core: {
      apiFn: fetchMallOrders,
      apiParams: { currentPage: 1, pageSize: 10 },
      paginationKey: { current: 'currentPage', size: 'pageSize' },
      columnsFactory: () => [
        { prop: 'id', label: '兑换订单 ID', minWidth: 180 },
        { prop: 'userId', label: '会员 ID', minWidth: 180 },
        { prop: 'productName', label: '兑换商品', minWidth: 150 },
        { prop: 'pointsCost', label: '消耗积分', width: 110 },
        {
          prop: 'status',
          label: '状态',
          width: 115,
          formatter: (row: PointsMallOrder) =>
            h(
              ElTag,
              {
                type:
                  row.status === 'SUCCESS'
                    ? 'success'
                    : row.status === 'FAILED'
                      ? 'danger'
                      : 'warning'
              },
              {
                default: () =>
                  ({
                    SUCCESS: '兑换成功',
                    FAILED: '兑换失败',
                    PENDING: '待处理',
                    PROCESSING: '处理中',
                    SPENT: '发券中',
                    REFUNDING: '退分中'
                  })[row.status] || row.status
              }
            )
        },
        { prop: 'userCouponId', label: '用户券 ID', minWidth: 180 },
        { prop: 'failureReason', label: '失败原因', minWidth: 160 },
        { prop: 'createdAt', label: '兑换时间', minWidth: 180 }
      ]
    }
  })

  function searchProducts() {
    getProducts({ currentPage: 1, pageSize: 10, name: searchName.value.trim() })
  }
  function resetProducts() {
    searchName.value = ''
    searchProducts()
  }
  function openProduct(product?: PointsMallProduct) {
    editingProduct.value = product || null
    dialogVisible.value = true
  }
  async function removeProduct(product: PointsMallProduct) {
    await ElMessageBox.confirm(
      `确定删除“${product.name}”？已有兑换记录的商品将下架并保留历史。`,
      '删除兑换商品',
      { type: 'warning' }
    )
    await deleteMallProduct(product.id)
    ElMessage.success('操作成功')
    refreshProducts()
  }
</script>

<style scoped>
  .mall-search {
    display: flex;
    gap: 10px;
    align-items: center;
    margin: 5px 0 18px;
  }
</style>
