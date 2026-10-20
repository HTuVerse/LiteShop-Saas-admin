<!-- 优惠券管理页面 -->
<template>
  <div class="art-full-height">
    <!-- 搜索栏 -->
    <CouponSearch
      :model-value="searchForm"
      @update:model-value="(value) => Object.assign(searchForm, value)"
      @search="handleSearch"
      @reset="resetSearchParam"
    />

    <ElCard class="art-table-card" shadow="never">
      <!-- 表格头部 -->
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElSpace wrap>
            <ElButton
              v-auth="'marketing:coupon:add'"
              type="primary"
              v-ripple
              @click="showCouponDialog('add')"
              >新增优惠券</ElButton
            >
          </ElSpace>
        </template>
      </ArtTableHeader>

      <!-- 表格 -->
      <ArtTable
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>

    <!-- 优惠券编辑弹窗 -->
    <CouponDialog
      v-model:visible="couponDialogVisible"
      :type="dialogType"
      :coupon-data="currentCouponData"
      @submit="handleCouponSubmit"
      @success="refreshData"
    />

    <!-- 发放优惠券弹窗 -->
    <SendCouponDialog
      v-model:visible="sendCouponDialogVisible"
      :coupon-data="currentCouponData"
      @success="refreshData"
    />
    <StockDialog v-model:visible="stockDialogVisible" :coupon-data="currentCouponData" @success="refreshData" />
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, h } from 'vue'
  import {
    ElCard,
    ElButton,
    ElSpace,
    ElMessage,
    ElMessageBox,
    ElTag,
    ElProgress
  } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import CouponSearch from './modules/coupon-search.vue'
  import CouponDialog from './modules/coupon-dialog.vue'
  import SendCouponDialog from './modules/send-coupon-dialog.vue'
  import StockDialog from './modules/stock-dialog.vue'
  import {
    fetchGetCouponList,
    fetchDeleteCoupon,
    fetchToggleCouponStatus
  } from '@/api/coupon-manage'
  import type { DialogType } from '@/types'
  import {
    getEnumNumber,
    CouponTypeEnumMap,
    CouponShelfStatusEnumMap
  } from '@/utils/enum/enumConverter'

  defineOptions({ name: 'CouponManage' })

  // 搜索表单
  const searchForm = reactive({
    name: '',
    status: undefined as number | undefined
  })

  // 弹窗相关
  const dialogType = ref<DialogType>('add')
  const couponDialogVisible = ref(false)
  const sendCouponDialogVisible = ref(false)
  const stockDialogVisible = ref(false)
  const currentCouponData = ref<Partial<Api.Coupon.CouponListItem>>({})

  // 优惠券状态配置（支持数字和文字索引）
  const COUPON_STATUS_CONFIG: Record<string | number, { type: 'info' | 'success'; text: string }> =
    {
      0: { type: 'info', text: '已下架' },
      1: { type: 'success', text: '上架中' },
      下架: { type: 'info', text: '已下架' },
      上架: { type: 'success', text: '上架中' }
    }

  // 优惠券类型配置（支持数字和文字索引，与后端 CouponTypeEnum 一致）
  const COUPON_TYPE_CONFIG: Record<
    string | number,
    { type: 'warning' | 'success' | 'danger'; text: string }
  > = {
    0: { type: 'warning', text: '满减券' },
    1: { type: 'success', text: '整单折扣券' },
    2: { type: 'danger', text: '菜品免单券' },
    3: { type: 'success', text: '菜品折扣券' },
    满减券: { type: 'warning', text: '满减券' },
    整单折扣券: { type: 'success', text: '整单折扣券' },
    菜品免单券: { type: 'danger', text: '菜品免单券' },
    菜品折扣券: { type: 'success', text: '菜品折扣券' }
  }

  /**
   * 获取类型的数字值（兼容文字和数字）
   */
  const getTypeNumber = (type: string | number): number => {
    return getEnumNumber(type, CouponTypeEnumMap) ?? 0
  }

  /**
   * 获取状态的数字值（兼容文字和数字）
   */
  const getStatusNumber = (status: string | number): number => {
    return getEnumNumber(status, CouponShelfStatusEnumMap) ?? 0
  }

  // 使用 useTable hook
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
      apiFn: fetchGetCouponList,
      apiParams: {
        currentPage: 1,
        pageSize: 10,
        name: searchForm.name || undefined,
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
          width: 200,
          sortable: true
        },
        {
          prop: 'name',
          label: '优惠券名称',
          minWidth: 150
        },
        {
          prop: 'type',
          label: '类型',
          width: 100,
          align: 'center',
          formatter: (row: Api.Coupon.CouponListItem) => {
            const config = COUPON_TYPE_CONFIG[row.type as keyof typeof COUPON_TYPE_CONFIG] || {
              type: 'info',
              text: '未知'
            }
            return h(ElTag, { type: config.type, size: 'small' }, { default: () => config.text })
          }
        },
        {
          prop: 'value',
          label: '面值',
          width: 100,
          align: 'center',
          formatter: (row: Api.Coupon.CouponListItem) => {
            const typeNum = getTypeNumber(row.type as string | number)
            if (typeNum === 1 || typeNum === 3) {
              return h(
                'span',
                { style: 'color: #67c23a; font-weight: bold;' },
                `${(Number(row.value) * 10).toFixed(0)}折`
              )
            }
            if (typeNum === 2) return h('span', { style: 'color: #909399;' }, '—')
            return h('span', { style: 'color: #e6a23c; font-weight: bold;' }, `¥${row.value}`)
          }
        },
        {
          prop: 'minAmount',
          label: '使用条件',
          width: 120,
          formatter: (row: Api.Coupon.CouponListItem) => {
            return row.minAmount && row.minAmount > 0 ? `满${row.minAmount}元可用` : '无门槛'
          }
        },
        {
          prop: 'stock',
          label: '库存',
          width: 180,
          formatter: (row: Api.Coupon.CouponListItem) => {
            const percent =
              row.totalCount > 0 ? Math.round((row.remainCount / row.totalCount) * 100) : 0
            const status = percent > 50 ? 'success' : percent > 20 ? 'warning' : 'exception'
            return h('div', { style: 'display: flex; align-items: center; gap: 8px;' }, [
              h(ElProgress, {
                percentage: percent,
                status: status,
                strokeWidth: 6,
                style: 'flex: 1;'
              }),
              h(
                'span',
                { style: 'font-size: 12px; color: #909399; white-space: nowrap;' },
                `${row.remainCount}/${row.totalCount}`
              )
            ])
          }
        },
        {
          prop: 'timeRange',
          label: '有效期',
          width: 180,
          formatter: (row: Api.Coupon.CouponListItem) => {
            const start = row.startTime ? row.startTime.substring(0, 10) : '未设置'
            const end = row.endTime ? row.endTime.substring(0, 10) : '长期有效'
            return h('div', { style: 'font-size: 12px; line-height: 1.5;' }, [
              h('div', {}, `${start}`),
              h('div', { style: 'color: #909399;' }, `至 ${end}`)
            ])
          }
        },
        {
          prop: 'status',
          label: '状态',
          width: 100,
          align: 'center',
          formatter: (row: Api.Coupon.CouponListItem) => {
            const config = COUPON_STATUS_CONFIG[
              row.status as keyof typeof COUPON_STATUS_CONFIG
            ] || { type: 'info', text: '未知' }
            return h(ElTag, { type: config.type }, { default: () => config.text })
          }
        },
        {
          prop: 'createTime',
          label: '创建时间',
          width: 160,
          sortable: true,
          formatter: (row: Api.Coupon.CouponListItem) => {
            return row.createTime ? row.createTime.substring(0, 19).replace('T', ' ') : '-'
          }
        },
        {
          prop: 'operation',
          label: '操作',
          width: 260,
          fixed: 'right',
          formatter: (row: Api.Coupon.CouponListItem) => {
            const statusNum = getStatusNumber(row.status as string | number)
            return h('div', { class: 'flex flex-wrap gap-1' }, [
              h(ArtButtonTable, {
                auth: 'marketing:coupon:edit',
                type: 'edit',
                onClick: () => showCouponDialog('edit', row)
              }),
              h(ArtButtonTable, {
                auth: 'marketing:coupon:edit',
                icon: 'ri:stack-line',
                label: '调整库存',
                onClick: () => {
                  currentCouponData.value = { ...row }
                  stockDialogVisible.value = true
                }
              }),
              h(ArtButtonTable, {
                auth: 'marketing:coupon:send',
                icon: 'ri:send-plane-line',
                iconColor: '#67c23a',
                buttonBgColor: '#f0f9eb',
                onClick: () => showSendCouponDialog(row)
              }),
              h(ArtButtonTable, {
                auth: 'marketing:coupon:status',
                icon: statusNum === 1 ? 'material-symbols:lock-outline' : 'proicons:lock-open',
                label: statusNum === 1 ? '下架' : '上架',
                iconColor: statusNum === 1 ? '#909399' : '#409eff',
                buttonBgColor: statusNum === 1 ? '#f4f4f5' : '#ecf5ff',
                onClick: () => toggleCouponStatus(row)
              }),
              h(ArtButtonTable, {
                auth: 'marketing:coupon:delete',
                type: 'delete',
                onClick: () => deleteCoupon(row)
              })
            ])
          }
        }
      ]
    }
  })

  // 搜索
  const handleSearch = () => {
    getData(searchForm)
  }

  // 重置搜索
  const resetSearchParam = () => {
    searchForm.name = ''
    searchForm.status = undefined
    resetSearchParams()
  }

  // 显示优惠券编辑弹窗
  const showCouponDialog = (type: DialogType, row?: Api.Coupon.CouponListItem) => {
    dialogType.value = type
    currentCouponData.value = row ? { ...row } : {}
    couponDialogVisible.value = true
  }

  // 显示发放优惠券弹窗
  const showSendCouponDialog = (row: Api.Coupon.CouponListItem) => {
    const statusNum = getStatusNumber(row.status as string | number)
    if (statusNum !== 1) {
      ElMessage.warning('请先上架优惠券')
      return
    }
    if (row.remainCount <= 0) {
      ElMessage.warning('优惠券库存不足')
      return
    }
    currentCouponData.value = { ...row }
    sendCouponDialogVisible.value = true
  }

  // 切换优惠券状态
  const toggleCouponStatus = async (row: Api.Coupon.CouponListItem) => {
    const statusNum = getStatusNumber(row.status as string | number)
    const action = statusNum === 1 ? '下架' : '上架'
    try {
      await ElMessageBox.confirm(`确定要${action}优惠券「${row.name}」吗？`, `${action}确认`, {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })

      await fetchToggleCouponStatus(row.id)
      ElMessage.success(`${action}成功`)
      refreshData()
    } catch (error: any) {
      if (error !== 'cancel') {
        ElMessage.error(error.message || `${action}失败`)
      }
    }
  }

  // 删除优惠券
  const deleteCoupon = (row: Api.Coupon.CouponListItem) => {
    ElMessageBox.confirm(`确定要删除优惠券「${row.name}」吗？删除后无法恢复！`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(async () => {
        try {
          await fetchDeleteCoupon(row.id)
          ElMessage.success('删除成功')
          refreshData()
        } catch (error: any) {
          ElMessage.error(error.message || '删除失败')
        }
      })
      .catch(() => {
        ElMessage.info('已取消删除')
      })
  }

  // 处理优惠券弹窗提交
  const handleCouponSubmit = () => {
    couponDialogVisible.value = false
    currentCouponData.value = {}
  }
</script>

<style lang="scss" scoped>
  .art-table-card {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
</style>
