<template>
  <section class="tenant-page">
    <div class="page-title"
      ><div><h2>商户管理</h2><p>管理商户资料、服务状态，进入指定商户开展业务。</p></div
      ><ElButton type="primary" @click="edit()">新增商户</ElButton></div
    >
    <ElCard shadow="never">
      <ArtForm inline @submit.prevent="search"
        ><ElFormItem
          ><ElInput v-model="keyword" placeholder="商户名称 / 编码" clearable /></ElFormItem
        ><ElFormItem
          ><ElSelect v-model="status" clearable placeholder="全部状态" style="width: 150px"
            ><ElOption label="启用" :value="1" /><ElOption
              label="停用"
              :value="0" /></ElSelect></ElFormItem
        ><ElButton type="primary" native-type="submit">查询</ElButton
        ><ElButton @click="refreshData">刷新</ElButton></ArtForm
      >
      <ArtTable
        :data="rows"
        v-loading="loading"
        row-key="id"
        :columns="tableColumns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      >
        <template #tableColumnsSlot5="{ row }">{{ row.expireTime || '长期有效' }}</template>
        <template #tableColumnsSlot6="{ row }"
          ><ElTag
            :type="
              row.status !== 1
                ? 'info'
                : isTenantExpired(row) || row.accessAvailable === false
                  ? 'warning'
                  : 'success'
            "
            >{{
              row.status !== 1
                ? '停用'
                : isTenantExpired(row)
                  ? '已到期'
                  : row.accessAvailable === false
                    ? '套餐不可用'
                    : '启用'
            }}</ElTag
          ></template
        >
      </ArtTable>
    </ElCard>
    <ElDialog
      v-model="visible"
      :title="form.id ? '编辑商户' : '新增商户'"
      width="min(560px, 94vw)"
      align-center
      :close-on-click-modal="false"
    >
      <ElAlert
        v-if="!form.id"
        class="initialization-notice"
        :type="initialLevelTemplate ? 'info' : 'warning'"
        :closable="false"
        show-icon
        :title="
          templateLoading
            ? '正在读取默认等级体系…'
            : '初始会员等级：' + (initialLevelTemplate?.name || '尚未设置')
        "
        :description="
          initialLevelTemplate
            ? '创建时自动复制并启用该体系，同时初始化商户角色及基础配置。后续可在等级管理中独立调整。'
            : '请先在平台会员等级体系页面设置默认体系，再创建商户。'
        "
      />
      <ElAlert
        v-if="!form.id && !planOptionsLoading && !planOptions.length"
        class="initialization-notice"
        type="warning"
        :closable="false"
        show-icon
        title="暂无可用套餐版本，请先在 SaaS 套餐管理中发布套餐"
      />
      <ArtForm ref="formRef" :model="form" :rules="rules" label-width="95px">
        <ElFormItem label="商户名称" prop="tenantName"
          ><ElInput v-model.trim="form.tenantName" maxlength="100"
        /></ElFormItem>
        <ElFormItem label="商户编码" prop="tenantCode"
          ><ElInput v-model.trim="form.tenantCode" maxlength="50"
        /></ElFormItem>
        <ElFormItem label="联系人"><ElInput v-model.trim="form.contactName" /></ElFormItem
        ><ElFormItem label="联系电话"><ElInput v-model.trim="form.contactPhone" /></ElFormItem>
        <ElFormItem v-if="!form.id" label="初始套餐" prop="planVersionId">
          <ElSelect
            v-model="form.planVersionId"
            :loading="planOptionsLoading"
            placeholder="请选择已发布套餐"
          >
            <ElOption
              v-for="plan in planOptions"
              :key="String(plan.planVersionId)"
              :label="`${plan.planName} · v${plan.versionNo}`"
              :value="plan.planVersionId"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem v-if="!form.id" label="计费方式">
          <ElSelect v-model="form.billingCycle">
            <ElOption label="月付" value="MONTHLY" />
            <ElOption label="年付" value="YEARLY" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem v-if="form.id" label="服务到期">
          <span>{{ form.expireTime || '长期有效' }}（由套餐订阅管理）</span>
        </ElFormItem>
        <ElFormItem label="备注"
          ><ElInput v-model="form.remark" type="textarea"
        /></ElFormItem> </ArtForm
      ><template #footer
        ><ElButton @click="visible = false">取消</ElButton
        ><ElButton
          type="primary"
          :loading="saving"
          :disabled="
            !form.id &&
            (templateLoading || planOptionsLoading || !initialLevelTemplate || !planOptions.length)
          "
          @click="save"
          >保存</ElButton
        ></template
      >
    </ElDialog>
  </section>
</template>
<script setup lang="ts">
  import { useTable } from '@/hooks/core/useTable'
  import { h, reactive, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
  import {
    createTenant,
    enterTenant,
    listPublishedPlanOptions,
    listTenants,
    setTenantStatus,
    updateTenant,
    type PublishedPlanOption,
    type TenantWithAccess
  } from '@/api/tenant'
  import { useUserStore } from '@/store/modules/user'
  import type { Id, Tenant } from '@/types/backend'
  import { listLevelSchemes, type LevelScheme } from '@/api/member-level'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  const initialLevelTemplate = ref<LevelScheme>()
  const templateLoading = ref(false)
  const planOptions = ref<PublishedPlanOption[]>([])
  const planOptionsLoading = ref(false)
  const session = useUserStore(),
    router = useRouter()
  const keyword = ref(''),
    status = ref<number>()
  const saving = ref(false),
    entering = ref(false),
    visible = ref(false),
    formRef = ref<FormInstance>()
  const defaults = () => ({
    tenantName: '',
    tenantCode: '',
    status: 1,
    contactName: '',
    contactPhone: '',
    remark: '',
    expireTime: null,
    planVersionId: '' as Id,
    billingCycle: 'MONTHLY' as 'MONTHLY' | 'YEARLY'
  })
  const form = reactive<
    Partial<Tenant> & { planVersionId: Id; billingCycle: 'MONTHLY' | 'YEARLY' }
  >(defaults())
  const rules: FormRules = {
    tenantName: [{ required: true, message: '请输入商户名称' }],
    tenantCode: [
      { required: true, message: '请输入商户编码' },
      { pattern: /^[A-Za-z0-9_-]+$/, message: '编码仅支持字母、数字、横线及下划线' }
    ],
    planVersionId: [{ required: true, message: '请选择已发布套餐' }]
  }
  const isTenantExpired = (row: Tenant) =>
    Boolean(row.expireTime) &&
    Date.parse(`${row.expireTime!.replace(' ', 'T')}+08:00`) <= Date.now()
  async function search() {
    replaceSearchParams({
      keyword: keyword.value || undefined,
      status: status.value
    })
    await getData()
  }
  async function edit(row?: Tenant) {
    Object.keys(form).forEach((key) => delete (form as Record<string, unknown>)[key])
    Object.assign(form, defaults(), row || {})
    visible.value = true
    if (!row) {
      initialLevelTemplate.value = undefined
      planOptions.value = []
      templateLoading.value = true
      planOptionsLoading.value = true
      const [schemesResult, plansResult] = await Promise.allSettled([
        listLevelSchemes(),
        listPublishedPlanOptions()
      ])
      if (schemesResult.status === 'fulfilled') {
        const { templates } = schemesResult.value
        initialLevelTemplate.value = templates.find(
          (item) => item.isDefault === 1 && item.status === 1
        )
      }
      if (plansResult.status === 'fulfilled') planOptions.value = plansResult.value
      templateLoading.value = false
      planOptionsLoading.value = false
    }
  }
  async function save() {
    if (saving.value || !(await formRef.value?.validate().catch(() => false))) return
    saving.value = true
    try {
      const editing = !!form.id
      if (editing) {
        await updateTenant({
          id: form.id!,
          tenantCode: form.tenantCode!,
          tenantName: form.tenantName!,
          contactName: form.contactName,
          contactPhone: form.contactPhone,
          remark: form.remark
        })
      } else {
        await createTenant({
          tenantCode: form.tenantCode!,
          tenantName: form.tenantName!,
          contactName: form.contactName,
          contactPhone: form.contactPhone,
          remark: form.remark,
          status: 1,
          planVersionId: form.planVersionId,
          billingCycle: form.billingCycle
        })
      }
      visible.value = false
      ElMessage.success('商户资料已保存')
      await (editing ? refreshUpdate() : refreshCreate())
    } catch {
      // Request errors are reported centrally; cancelling a confirmation keeps the current state.
    } finally {
      saving.value = false
    }
  }
  async function enter(row: Tenant) {
    if (entering.value) return
    entering.value = true
    try {
      const tenant = await enterTenant(row.id)
      session.setActiveTenant(tenant)
      localStorage.setItem(
        'liteshop-scope-change',
        JSON.stringify({ at: Date.now(), userId: session.info.userId })
      )
      await router.replace('/dashboard/console')
    } catch {
      // Request errors are reported centrally; cancelling a confirmation keeps the current state.
    } finally {
      entering.value = false
    }
  }
  async function toggle(row: Tenant) {
    try {
      await ElMessageBox.confirm(
        row.status === 1 ? '停用后该商户账号将退出登录，确认停用？' : '确认启用该商户？',
        '变更商户状态'
      )
      await setTenantStatus(row.id, row.status === 1 ? 0 : 1)
      await refreshUpdate()
    } catch {
      // Request errors are reported centrally; cancelling a confirmation keeps the current state.
    }
  }
  const {
    data: rows,
    columns: tableColumns,
    loading,
    pagination,
    getData,
    replaceSearchParams,
    handleSizeChange,
    handleCurrentChange,
    refreshData,
    refreshCreate,
    refreshUpdate
  } = useTable({
    core: {
      apiFn: listTenants,
      apiParams: { currentPage: 1, pageSize: 10 },
      paginationKey: { current: 'currentPage', size: 'pageSize' },
      columnsFactory: () => [
        { prop: 'tenantName', label: '商户名称', minWidth: 170 },
        { prop: 'tenantCode', label: '商户编码', minWidth: 130 },
        { prop: 'contactName', label: '联系人' },
        { prop: 'contactPhone', label: '联系电话', minWidth: 140 },
        {
          prop: 'expireTime',
          label: '到期时间',
          minWidth: 175,
          useSlot: true,
          slotName: 'tableColumnsSlot5'
        },
        {
          prop: 'tableColumnsColumn6',
          label: '状态',
          width: 90,
          useSlot: true,
          slotName: 'tableColumnsSlot6'
        },
        {
          prop: 'operation',
          label: '操作',
          width: 150,
          fixed: 'right',
          align: 'center',
          formatter: (row: TenantWithAccess) =>
            h('div', { class: 'flex items-center justify-center' }, [
              h(ArtButtonTable, {
                icon: 'ri:login-box-line',
                iconClass: 'bg-theme/12 text-theme',
                label: '进入商户',
                disabled:
                  row.status !== 1 ||
                  isTenantExpired(row) ||
                  row.accessAvailable === false ||
                  entering.value,
                onClick: () => enter(row)
              }),
              h(ArtButtonTable, {
                type: 'edit',
                label: '编辑商户',
                onClick: () => edit(row)
              }),
              h(ArtButtonTable, {
                icon: row.status === 1 ? 'ri:forbid-line' : 'ri:checkbox-circle-line',
                iconClass:
                  row.status === 1 ? 'bg-warning/12 text-warning' : 'bg-success/12 text-success',
                label: row.status === 1 ? '停用商户' : '启用商户',
                onClick: () => toggle(row)
              })
            ])
        }
      ]
    }
  })
</script>
<style scoped>
  .page-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 4px 0 22px;
  }

  h2 {
    font-size: 24px;
  }

  p {
    margin-top: 10px;
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }

  .pager {
    justify-content: flex-end;
    margin-top: 22px;
  }

  .initialization-notice {
    margin-bottom: 20px;
  }
</style>
