<template>
  <div class="art-full-height">
    <ElCard class="art-table-card" shadow="never">
      <ElTabs v-model="activeTab">
        <ElTabPane label="储值档位" name="plans">
          <ArtTableHeader
            v-model:columns="planChecks"
            :loading="planLoading"
            @refresh="refreshPlans"
          >
            <template #left>
              <ElButton v-auth="'marketing:wallet'" type="primary" @click="openPlan()"
                >新增储值档位</ElButton
              >
            </template>
          </ArtTableHeader>
          <ArtTable
            :loading="planLoading"
            :data="plans"
            :columns="planColumns"
            :pagination="planPagination"
            @pagination:size-change="planSizeChange"
            @pagination:current-change="planPageChange"
          />
        </ElTabPane>
        <ElTabPane label="充值记录" name="orders">
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
    <PlanDialog v-model:visible="dialogVisible" :plan="editingPlan" @success="refreshPlans" />
  </div>
</template>

<script setup lang="ts">
  import { h, ref } from 'vue'
  import { ElMessage, ElMessageBox, ElTag } from 'element-plus'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import { useTable } from '@/hooks/core/useTable'
  import { deleteWalletPlan, fetchWalletOrders, fetchWalletPlans } from '@/api/wallet'
  import type { WalletOrder, WalletPlan } from '@/api/wallet'
  import PlanDialog from './modules/plan-dialog.vue'

  defineOptions({ name: 'WalletManage' })
  const activeTab = ref('plans')
  const dialogVisible = ref(false)
  const editingPlan = ref<WalletPlan | null>(null)
  const money = (amount: number) => `¥${Number(amount || 0).toFixed(2)}`

  const {
    data: plans,
    columns: planColumns,
    columnChecks: planChecks,
    loading: planLoading,
    pagination: planPagination,
    refreshData: refreshPlans,
    handleSizeChange: planSizeChange,
    handleCurrentChange: planPageChange
  } = useTable({
    core: {
      apiFn: fetchWalletPlans,
      apiParams: { currentPage: 1, pageSize: 10 },
      paginationKey: { current: 'currentPage', size: 'pageSize' },
      columnsFactory: () => [
        {
          prop: 'amount',
          label: '实付金额',
          minWidth: 125,
          formatter: (row: WalletPlan) => money(row.amount)
        },
        {
          prop: 'bonus',
          label: '赠送金额',
          minWidth: 125,
          formatter: (row: WalletPlan) => money(row.bonus)
        },
        {
          prop: 'arrival',
          label: '到账金额',
          minWidth: 125,
          formatter: (row: WalletPlan) => money(Number(row.amount) + Number(row.bonus))
        },
        {
          prop: 'badge',
          label: '角标',
          minWidth: 130,
          formatter: (row: WalletPlan) => row.badge || '—'
        },
        { prop: 'sort', label: '排序', width: 80 },
        {
          prop: 'status',
          label: '状态',
          width: 95,
          formatter: (row: WalletPlan) =>
            h(
              ElTag,
              { type: row.status === 1 ? 'success' : 'info' },
              { default: () => (row.status === 1 ? '启用' : '停用') }
            )
        },
        {
          prop: 'operation',
          label: '操作',
          width: 155,
          fixed: 'right',
          formatter: (row: WalletPlan) =>
            h('div', { class: 'flex gap-1' }, [
              h(ArtButtonTable, {
                auth: 'marketing:wallet',
                label: '编辑',
                icon: 'ri:edit-line',
                onClick: () => openPlan(row)
              }),
              h(ArtButtonTable, {
                auth: 'marketing:wallet',
                label: '删除',
                icon: 'ri:delete-bin-line',
                onClick: () => removePlan(row)
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
      apiFn: fetchWalletOrders,
      apiParams: { currentPage: 1, pageSize: 10 },
      paginationKey: { current: 'currentPage', size: 'pageSize' },
      columnsFactory: () => [
        { prop: 'id', label: '储值订单 ID', minWidth: 180 },
        { prop: 'userId', label: '会员 ID', minWidth: 180 },
        {
          prop: 'amount',
          label: '实付金额',
          width: 125,
          formatter: (row: WalletOrder) => money(row.amount)
        },
        {
          prop: 'bonus',
          label: '赠送金额',
          width: 125,
          formatter: (row: WalletOrder) => money(row.bonus)
        },
        {
          prop: 'status',
          label: '状态',
          width: 120,
          formatter: (row: WalletOrder) =>
            h(
              ElTag,
              {
                type:
                  row.status === 'SUCCESS'
                    ? 'success'
                    : row.status === 'CLOSED'
                      ? 'info'
                      : 'warning'
              },
              {
                default: () =>
                  ({ UNPAID: '待支付', PAID: '待入账', SUCCESS: '已到账', CLOSED: '已关闭' })[
                    row.status
                  ]
              }
            )
        },
        { prop: 'createdAt', label: '创建时间', minWidth: 165 },
        {
          prop: 'paidAt',
          label: '支付时间',
          minWidth: 165,
          formatter: (row: WalletOrder) => row.paidAt || '—'
        }
      ]
    }
  })

  function openPlan(plan?: WalletPlan) {
    editingPlan.value = plan || null
    dialogVisible.value = true
  }
  async function removePlan(plan: WalletPlan) {
    try {
      await ElMessageBox.confirm(
        '删除档位后，已有充值记录的档位将停用。确认继续？',
        '删除储值档位',
        { type: 'warning' }
      )
    } catch {
      return
    }
    await deleteWalletPlan(String(plan.id))
    ElMessage.success('储值档位已处理')
    refreshPlans()
  }
</script>
