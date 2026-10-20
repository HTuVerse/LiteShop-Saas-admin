<template>
  <ElDialog v-model="dialogVisible" :title="`发放记录 · ${couponData?.name || ''}`" width="1060px" destroy-on-close>
    <ArtForm :model="filter" label-width="85px" class="issued-form">
      <ElFormItem label="用户 ID">
        <ElInput v-model.trim="filter.userId" clearable placeholder="按用户 ID 筛选" />
      </ElFormItem>
      <ElFormItem label="状态">
        <ElSelect v-model="filter.status" clearable placeholder="全部状态">
          <ElOption v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
        </ElSelect>
      </ElFormItem>
      <ElButton type="primary" @click="search">查询</ElButton>
    </ArtForm>

    <ArtForm :model="action" label-width="85px" class="reason-form">
      <ElFormItem label="回收原因" required>
        <ElInput v-model="action.reason" maxlength="200" show-word-limit placeholder="回收操作必须填写原因" />
      </ElFormItem>
    </ArtForm>
    <div class="bulk-bar">
      <span>当前可回收 {{ revocableCount }} 张未使用券。模板批量回收后会永久停止发放；已使用和已过期券不受影响。</span>
      <ElButton v-auth="'marketing:coupon:revoke'" type="danger" :disabled="templateRecalled"
        :loading="submitting" @click="revokeTemplate">回收此模板全部未使用券</ElButton>
    </div>

    <ArtTable :data="data" :columns="columns" :loading="loading" :pagination="pagination"
      @pagination:size-change="handleSizeChange" @pagination:current-change="handleCurrentChange" />
    <div class="history-title">回收记录</div>
    <ArtTable :data="revokeData" :columns="revokeColumns" :loading="revokeLoading" :pagination="revokePagination"
      @pagination:size-change="revokeHandleSizeChange" @pagination:current-change="revokeHandleCurrentChange" />
    <template #footer>
      <ElButton @click="dialogVisible = false">关闭</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { computed, h, reactive, ref, watch } from 'vue'
  import { ElButton, ElDialog, ElFormItem, ElInput, ElMessage, ElMessageBox, ElOption, ElSelect, ElTag } from 'element-plus'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import { useTable } from '@/hooks/core/useTable'
  import {
    fetchIssuedCoupons, fetchRevocableCouponCount, fetchRevokeUserCoupon, fetchRevokeTemplateCoupons,
    fetchCouponRevokeRecords
  } from '@/api/coupon-manage'
  import type { IssuedCouponItem } from '@/api/coupon-manage'

  const props = defineProps<{
    visible: boolean
    couponData?: Partial<Api.Coupon.CouponListItem> & { recallTime?: string | null }
  }>()
  const emit = defineEmits<{ (e: 'update:visible', value: boolean): void; (e: 'success'): void }>()
  const dialogVisible = computed({ get: () => props.visible, set: (value) => emit('update:visible', value) })
  const filter = reactive<{ userId: string; status?: number }>({ userId: '', status: undefined })
  const action = reactive({ reason: '' })
  const revocableCount = ref(0)
  const templateRecalled = ref(false)
  const submitting = ref(false)
  const statusOptions = [
    { value: 0, label: '未生效' }, { value: 1, label: '未使用' },
    { value: 2, label: '已使用' }, { value: 3, label: '已过期' },
    { value: 4, label: '已回收' }
  ]
  const statusText = (status: string | number) => statusOptions.find((item) =>
    item.value === Number(status) || item.label === status)?.label || String(status)
  const canRevoke = (row: IssuedCouponItem) =>
    ['未生效', '未使用'].includes(statusText(row.status)) &&
    (!row.expireTime || new Date(row.expireTime.replace(' ', 'T')).getTime() > Date.now())

  const { data, columns, loading, pagination, getData, refreshData, handleSizeChange, handleCurrentChange } = useTable({
    core: {
      immediate: false,
      apiFn: (params: { currentPage: number; pageSize: number; userId?: string; status?: number }) =>
        fetchIssuedCoupons({ couponId: props.couponData!.id!, ...params }),
      apiParams: { currentPage: 1, pageSize: 10 },
      paginationKey: { current: 'currentPage', size: 'pageSize' },
      columnsFactory: () => [
        { prop: 'id', label: '用户券 ID', minWidth: 180 },
        { prop: 'userId', label: '用户 ID', minWidth: 180 },
        { prop: 'code', label: '券码', minWidth: 145 },
        { prop: 'obtainTime', label: '领取时间', minWidth: 170 },
        { prop: 'expireTime', label: '过期时间', minWidth: 170 },
        { prop: 'status', label: '状态', width: 95, formatter: (row: IssuedCouponItem) =>
          h(ElTag, { type: statusText(row.status) === '已回收' ? 'info' : 'success' },
            { default: () => statusText(row.status) }) },
        { prop: 'operation', label: '操作', width: 100, fixed: 'right', formatter: (row: IssuedCouponItem) =>
          canRevoke(row) ? h(ArtButtonTable, {
            auth: 'marketing:coupon:revoke', icon: 'ri:delete-bin-line', label: '回收',
            onClick: () => revokeOne(row)
          }) : null }
      ]
    }
  })

  const {
    data: revokeData, columns: revokeColumns, loading: revokeLoading,
    pagination: revokePagination, getData: getRevokeData, refreshData: refreshRevokeData,
    handleSizeChange: revokeHandleSizeChange, handleCurrentChange: revokeHandleCurrentChange
  } = useTable({
    core: {
      immediate: false,
      apiFn: (params: { currentPage: number; pageSize: number }) =>
        fetchCouponRevokeRecords(props.couponData!.id!, params.currentPage, params.pageSize),
      apiParams: { currentPage: 1, pageSize: 10 },
      paginationKey: { current: 'currentPage', size: 'pageSize' },
      columnsFactory: () => [
        { prop: 'createTime', label: '回收时间', width: 170 },
        { prop: 'userId', label: '用户 ID', minWidth: 165 },
        { prop: 'userCouponId', label: '用户券 ID', minWidth: 165 },
        { prop: 'operatorId', label: '操作人 ID', minWidth: 165,
          formatter: (row: { operatorId?: string }) => row.operatorId || '系统' },
        { prop: 'reason', label: '原因', minWidth: 180 },
        { prop: 'batchId', label: '批次号', minWidth: 250 }
      ]
    }
  })

  const loadCount = async () => {
    if (!props.couponData?.id) return
    revocableCount.value = Number(await fetchRevocableCouponCount(props.couponData.id)) || 0
  }
  watch(() => props.visible, (visible) => {
    if (!visible || !props.couponData?.id) return
    filter.userId = ''
    filter.status = undefined
    action.reason = ''
    templateRecalled.value = !!props.couponData?.recallTime
    getData({ currentPage: 1, pageSize: 10, userId: undefined, status: undefined })
    getRevokeData({ currentPage: 1, pageSize: 10 })
    loadCount()
  })
  const search = () => getData({ currentPage: 1, userId: filter.userId || undefined, status: filter.status })
  const requireReason = () => {
    if (!action.reason.trim()) { ElMessage.warning('请先填写回收原因'); return false }
    return true
  }
  const afterRevoke = async () => {
    refreshData()
    refreshRevokeData()
    await loadCount()
    emit('success')
  }
  const revokeOne = async (row: IssuedCouponItem) => {
    if (!requireReason() || submitting.value) return
    try {
      await ElMessageBox.confirm(`确认回收用户 ${row.userId} 的这张券？`, '单张回收', { type: 'warning' })
      submitting.value = true
      await fetchRevokeUserCoupon(row.id, action.reason.trim())
      ElMessage.success('已回收')
      await afterRevoke()
    } catch (error: any) {
      if (error !== 'cancel') ElMessage.error(error.message || '回收失败')
    } finally { submitting.value = false }
  }
  const revokeTemplate = async () => {
    if (!props.couponData?.id || !requireReason() || submitting.value) return
    try {
      await ElMessageBox.confirm(
        `确认回收「${props.couponData.name}」当前全部 ${revocableCount.value} 张未使用券并永久停止此模板发放？`,
        '模板批量回收', { type: 'warning', confirmButtonText: '确认回收' }
      )
      submitting.value = true
      const result = await fetchRevokeTemplateCoupons(props.couponData.id, action.reason.trim())
      templateRecalled.value = true
      ElMessage.success(`已回收 ${result.revokedCount} 张券`)
      await afterRevoke()
    } catch (error: any) {
      if (error !== 'cancel') ElMessage.error(error.message || '回收失败')
    } finally { submitting.value = false }
  }
</script>

<style scoped>
  .issued-form { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .issued-form :deep(.el-form-item) { margin-bottom: 12px; }
  .issued-form :deep(.el-input), .issued-form :deep(.el-select) { width: 210px; }
  .reason-form :deep(.el-input) { width: min(620px, 100%); }
  .bulk-bar { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin: 12px 0 18px; color: #606266; }
  .history-title { margin: 24px 0 12px; font-weight: 600; }
</style>
