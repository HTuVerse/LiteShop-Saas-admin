<template>
  <section class="saas-page">
    <div class="page-title">
      <div><h2>套餐与权益</h2><p>统一管理功能目录、套餐版本、加购项和租户最终权益。</p></div>
    </div>
    <ElAlert
      title="已发布套餐版本不可修改；调整套餐时请创建新版本，存量租户不会被静默变更。"
      type="info"
      show-icon
      :closable="false"
      class="notice"
    />
    <ElTabs v-model="tab" type="border-card">
      <ElTabPane label="功能与配额" name="features">
        <div class="toolbar"><ElButton type="primary" @click="openFeature()">新增功能</ElButton></div>
        <ElTable :data="features" v-loading="loading">
          <ElTableColumn prop="featureCode" label="功能编码" min-width="190" />
          <ElTableColumn prop="featureName" label="名称" min-width="140" />
          <ElTableColumn label="类型" width="110"><template #default="{ row }"><ElTag>{{ row.featureType }}</ElTag></template></ElTableColumn>
          <ElTableColumn prop="quotaMode" label="配额模式" width="130" />
          <ElTableColumn prop="unit" label="单位" width="100" />
          <ElTableColumn label="状态" width="90"><template #default="{ row }"><ElTag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '启用' : '停用' }}</ElTag></template></ElTableColumn>
          <ElTableColumn label="操作" width="90"><template #default="{ row }"><ElButton link type="primary" @click="openFeature(row)">编辑</ElButton></template></ElTableColumn>
        </ElTable>
      </ElTabPane>

      <ElTabPane label="套餐版本" name="plans">
        <div class="toolbar"><ElButton type="primary" @click="openPlan()">新增套餐</ElButton></div>
        <ElTable :data="plans" v-loading="loading" row-key="id" @row-click="selectPlan">
          <ElTableColumn prop="planCode" label="套餐编码" min-width="160" />
          <ElTableColumn prop="planName" label="套餐名称" min-width="160" />
          <ElTableColumn prop="description" label="说明" min-width="220" show-overflow-tooltip />
          <ElTableColumn label="状态" width="90"><template #default="{ row }"><ElTag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '启用' : '停用' }}</ElTag></template></ElTableColumn>
          <ElTableColumn label="操作" width="170"><template #default="{ row }"><ElButton link type="primary" @click.stop="openPlan(row)">编辑</ElButton><ElButton link type="primary" @click.stop="createVersion(row)">新建版本</ElButton></template></ElTableColumn>
        </ElTable>
        <div v-if="selectedPlan" class="subsection">
          <h3>{{ selectedPlan.planName }} 的版本</h3>
          <ElTable :data="selectedVersions" empty-text="暂无版本，请先新建">
            <ElTableColumn label="版本" width="90"><template #default="{ row }">v{{ row.versionNo }}</template></ElTableColumn>
            <ElTableColumn label="状态" width="120"><template #default="{ row }"><ElTag :type="row.status === 'PUBLISHED' ? 'success' : row.status === 'DRAFT' ? 'warning' : 'info'">{{ versionStatus(row.status) }}</ElTag></template></ElTableColumn>
            <ElTableColumn prop="publishedAt" label="发布时间" min-width="170" />
            <ElTableColumn label="操作" width="210"><template #default="{ row }"><ElButton link type="primary" @click="configurePlanVersion(row)">{{ row.status === 'DRAFT' ? '配置权益' : '查看权益' }}</ElButton><ElButton v-if="row.status === 'DRAFT'" link type="success" @click="publishVersion(row)">发布</ElButton></template></ElTableColumn>
          </ElTable>
        </div>
      </ElTabPane>

      <ElTabPane label="加购项" name="addons">
        <div class="toolbar"><ElButton type="primary" @click="openAddon()">新增加购项</ElButton></div>
        <ElTable :data="addons" v-loading="loading">
          <ElTableColumn prop="addonCode" label="编码" min-width="170" />
          <ElTableColumn prop="addonName" label="名称" min-width="160" />
          <ElTableColumn prop="maxQuantity" label="最大数量" width="100" />
          <ElTableColumn prop="description" label="说明" min-width="220" />
          <ElTableColumn label="状态" width="90"><template #default="{ row }"><ElTag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '启用' : '停用' }}</ElTag></template></ElTableColumn>
          <ElTableColumn label="操作" width="160"><template #default="{ row }"><ElButton link type="primary" @click="openAddon(row)">编辑</ElButton><ElButton link type="primary" @click="configureAddon(row)">配置权益</ElButton></template></ElTableColumn>
        </ElTable>
      </ElTabPane>

      <ElTabPane label="租户权益" name="tenants">
        <div class="tenant-picker">
          <ElSelect v-model="tenantId" filterable placeholder="选择租户" style="width: 320px" @change="loadTenant">
            <ElOption v-for="tenant in tenants" :key="String(tenant.id)" :label="`${tenant.tenantName} · ${tenant.tenantCode}`" :value="tenant.id" />
          </ElSelect>
          <ElButton :disabled="!tenantId" type="primary" @click="openSubscription">分配套餐</ElButton>
          <ElButton :disabled="!tenantState.subscriptionId" @click="openTenantAddon">添加加购</ElButton>
          <ElButton :disabled="!tenantId" @click="openOverride">特殊调整</ElButton>
          <ElButton :disabled="!tenantId" @click="loadTenant">刷新权益</ElButton>
        </div>
        <ElEmpty v-if="!tenantId" description="请选择一个租户" />
        <template v-else>
          <ElDescriptions :column="4" border class="tenant-summary">
            <ElDescriptionsItem label="当前套餐">{{ tenantState.planName || '未订阅' }}</ElDescriptionsItem>
            <ElDescriptionsItem label="套餐版本">{{ tenantState.planVersion ? `v${tenantState.planVersion}` : '-' }}</ElDescriptionsItem>
            <ElDescriptionsItem label="订阅状态">{{ tenantState.subscriptionStatus || '-' }}</ElDescriptionsItem>
            <ElDescriptionsItem label="计费周期">{{ tenantState.periodStart || '-' }} ～ {{ tenantState.periodEnd || '-' }}</ElDescriptionsItem>
          </ElDescriptions>
          <h3>最终生效权益</h3>
          <ElTable :data="effectiveRows" v-loading="tenantLoading" empty-text="当前租户没有有效套餐权益">
            <ElTableColumn prop="featureCode" label="功能编码" min-width="190" />
            <ElTableColumn prop="featureName" label="名称" min-width="140" />
            <ElTableColumn label="可用" width="80"><template #default="{ row }"><ElTag :type="row.enabled ? 'success' : 'danger'">{{ row.enabled ? '是' : '否' }}</ElTag></template></ElTableColumn>
            <ElTableColumn label="额度" width="120"><template #default="{ row }">{{ quotaText(row) }}</template></ElTableColumn>
            <ElTableColumn prop="used" label="已用" width="100" />
            <ElTableColumn prop="remaining" label="剩余" width="100" />
            <ElTableColumn label="来源" min-width="260"><template #default="{ row }"><ElTag v-for="source in row.sources" :key="source" class="source-tag" effect="plain">{{ source }}</ElTag></template></ElTableColumn>
          </ElTable>
          <div class="two-columns">
            <div><h3>有效/历史加购</h3><ElTable :data="tenantAddons" size="small"><ElTableColumn prop="addonId" label="加购项" /><ElTableColumn prop="quantity" label="数量" width="80" /><ElTableColumn prop="status" label="状态" width="100" /><ElTableColumn label="操作" width="80"><template #default="{ row }"><ElButton v-if="row.status === 'ACTIVE'" link type="danger" @click="cancelAddon(row)">取消</ElButton></template></ElTableColumn></ElTable></div>
            <div><h3>特殊调整</h3><ElTable :data="tenantOverrides" size="small"><ElTableColumn label="功能"><template #default="{ row }">{{ featureName(row.featureId) }}</template></ElTableColumn><ElTableColumn prop="operation" label="操作" width="90" /><ElTableColumn prop="quotaValue" label="额度" width="80" /><ElTableColumn prop="reason" label="原因" /><ElTableColumn label="操作" width="70"><template #default="{ row }"><ElButton link type="danger" @click="removeOverride(row)">删除</ElButton></template></ElTableColumn></ElTable></div>
          </div>
        </template>
      </ElTabPane>
    </ElTabs>

    <ElDialog v-model="featureVisible" :title="featureForm.id ? '编辑功能' : '新增功能'" width="560px">
      <ElForm :model="featureForm" label-width="95px"><ElFormItem label="功能编码" required><ElInput v-model.trim="featureForm.featureCode" :disabled="!!featureForm.id" placeholder="如 member.count" /></ElFormItem><ElFormItem label="功能名称" required><ElInput v-model.trim="featureForm.featureName" /></ElFormItem><ElFormItem label="类型"><ElRadioGroup v-model="featureForm.featureType"><ElRadioButton value="BOOLEAN">开关功能</ElRadioButton><ElRadioButton value="QUOTA">配额</ElRadioButton></ElRadioGroup></ElFormItem><template v-if="featureForm.featureType === 'QUOTA'"><ElFormItem label="配额模式"><ElSelect v-model="featureForm.quotaMode"><ElOption label="当前资源数" value="RESOURCE" /><ElOption label="周期消费" value="PERIODIC" /><ElOption label="速率限制" value="RATE" /><ElOption label="并发限制" value="CONCURRENT" /></ElSelect></ElFormItem><ElFormItem label="单位"><ElInput v-model.trim="featureForm.unit" placeholder="COUNT / BYTE / REQUEST" /></ElFormItem></template><ElFormItem label="说明"><ElInput v-model="featureForm.description" type="textarea" /></ElFormItem><ElFormItem label="状态"><ElSwitch v-model="featureForm.status" :active-value="1" :inactive-value="0" /></ElFormItem></ElForm><template #footer><ElButton @click="featureVisible = false">取消</ElButton><ElButton type="primary" :loading="saving" @click="submitFeature">保存</ElButton></template>
    </ElDialog>

    <ElDialog v-model="planVisible" :title="planForm.id ? '编辑套餐' : '新增套餐'" width="520px"><ElForm :model="planForm" label-width="90px"><ElFormItem label="套餐编码" required><ElInput v-model.trim="planForm.planCode" :disabled="!!planForm.id" /></ElFormItem><ElFormItem label="套餐名称" required><ElInput v-model.trim="planForm.planName" /></ElFormItem><ElFormItem label="说明"><ElInput v-model="planForm.description" type="textarea" /></ElFormItem><ElFormItem label="状态"><ElSwitch v-model="planForm.status" :active-value="1" :inactive-value="0" /></ElFormItem></ElForm><template #footer><ElButton @click="planVisible = false">取消</ElButton><ElButton type="primary" :loading="saving" @click="submitPlan">保存</ElButton></template></ElDialog>

    <ElDialog v-model="planRulesVisible" :title="`套餐权益 · v${editingVersion?.versionNo || ''}`" width="900px"><ElTable :data="planRuleRows" max-height="520"><ElTableColumn prop="featureCode" label="功能" min-width="190" /><ElTableColumn prop="featureName" label="名称" min-width="130" /><ElTableColumn label="启用" width="80"><template #default="{ row }"><ElSwitch v-model="row.enabled" :disabled="editingVersion?.status !== 'DRAFT'" /></template></ElTableColumn><ElTableColumn label="额度" width="135"><template #default="{ row }"><span v-if="row.featureType === 'BOOLEAN'">—</span><ElInputNumber v-else v-model="row.quotaValue" :disabled="!row.enabled || row.unlimited || editingVersion?.status !== 'DRAFT'" :min="0" controls-position="right" /></template></ElTableColumn><ElTableColumn label="不限量" width="90"><template #default="{ row }"><ElSwitch v-if="row.featureType === 'QUOTA'" v-model="row.unlimited" :disabled="editingVersion?.status !== 'DRAFT'" /></template></ElTableColumn><ElTableColumn label="重置周期" width="150"><template #default="{ row }"><ElSelect v-if="row.featureType === 'QUOTA'" v-model="row.resetPeriod" :disabled="editingVersion?.status !== 'DRAFT'"><ElOption label="不重置" value="NONE" /><ElOption label="每天" value="DAY" /><ElOption label="自然月" value="MONTH" /><ElOption label="订阅周期" value="BILLING_CYCLE" /></ElSelect></template></ElTableColumn><ElTableColumn label="限制方式" width="115"><template #default="{ row }"><ElSelect v-if="row.featureType === 'QUOTA'" v-model="row.enforcement" :disabled="editingVersion?.status !== 'DRAFT'"><ElOption label="硬限制" value="HARD" /><ElOption label="软提醒" value="SOFT" /></ElSelect></template></ElTableColumn></ElTable><template #footer><ElButton @click="planRulesVisible = false">关闭</ElButton><ElButton v-if="editingVersion?.status === 'DRAFT'" type="primary" :loading="saving" @click="submitPlanRules">保存权益</ElButton></template></ElDialog>

    <ElDialog v-model="addonVisible" :title="addonForm.id ? '编辑加购项' : '新增加购项'" width="520px"><ElForm :model="addonForm" label-width="95px"><ElFormItem label="编码" required><ElInput v-model.trim="addonForm.addonCode" :disabled="!!addonForm.id" /></ElFormItem><ElFormItem label="名称" required><ElInput v-model.trim="addonForm.addonName" /></ElFormItem><ElFormItem label="最大购买数"><ElInputNumber v-model="addonForm.maxQuantity" :min="1" /></ElFormItem><ElFormItem label="说明"><ElInput v-model="addonForm.description" type="textarea" /></ElFormItem><ElFormItem label="状态"><ElSwitch v-model="addonForm.status" :active-value="1" :inactive-value="0" /></ElFormItem></ElForm><template #footer><ElButton @click="addonVisible = false">取消</ElButton><ElButton type="primary" :loading="saving" @click="submitAddon">保存</ElButton></template></ElDialog>

    <ElDialog v-model="addonRulesVisible" title="配置加购权益" width="780px"><ElTable :data="addonRuleRows"><ElTableColumn label="选择" width="70"><template #default="{ row }"><ElCheckbox v-model="row.included" /></template></ElTableColumn><ElTableColumn prop="featureCode" label="功能" min-width="190" /><ElTableColumn prop="featureName" label="名称" /><ElTableColumn label="操作" width="130"><template #default="{ row }"><ElSelect v-model="row.operation" :disabled="!row.included"><ElOption label="解锁" value="ENABLE" /><ElOption v-if="row.featureType === 'QUOTA'" label="增加额度" value="ADD" /><ElOption v-if="row.featureType === 'QUOTA'" label="设置额度" value="SET" /></ElSelect></template></ElTableColumn><ElTableColumn label="单份额度" width="160"><template #default="{ row }"><ElInputNumber v-if="row.operation !== 'ENABLE'" v-model="row.quotaValue" :disabled="!row.included" :min="0" /></template></ElTableColumn></ElTable><template #footer><ElButton @click="addonRulesVisible = false">取消</ElButton><ElButton type="primary" :loading="saving" @click="submitAddonRules">保存</ElButton></template></ElDialog>

    <ElDialog v-model="subscriptionVisible" title="分配租户套餐" width="560px"><ElForm :model="subscriptionForm" label-width="100px"><ElFormItem label="套餐版本" required><ElSelect v-model="subscriptionForm.planVersionId" filterable><ElOption v-for="option in versionOptions" :key="String(option.value)" :label="option.label" :value="option.value" /></ElSelect></ElFormItem><ElFormItem label="订阅状态"><ElSelect v-model="subscriptionForm.status"><ElOption label="生效" value="ACTIVE" /><ElOption label="试用" value="TRIALING" /><ElOption label="宽限期" value="GRACE" /><ElOption label="暂停" value="SUSPENDED" /></ElSelect></ElFormItem><ElFormItem label="周期开始"><ElDatePicker v-model="subscriptionForm.currentPeriodStart" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" /></ElFormItem><ElFormItem label="周期结束"><ElDatePicker v-model="subscriptionForm.currentPeriodEnd" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" /></ElFormItem></ElForm><template #footer><ElButton @click="subscriptionVisible = false">取消</ElButton><ElButton type="primary" :loading="saving" @click="submitSubscription">确认分配</ElButton></template></ElDialog>

    <ElDialog v-model="tenantAddonVisible" title="租户加购" width="480px"><ElForm :model="tenantAddonForm" label-width="90px"><ElFormItem label="加购项"><ElSelect v-model="tenantAddonForm.addonId"><ElOption v-for="item in activeAddons" :key="String(item.id)" :label="item.addonName" :value="item.id!" /></ElSelect></ElFormItem><ElFormItem label="数量"><ElInputNumber v-model="tenantAddonForm.quantity" :min="1" /></ElFormItem></ElForm><template #footer><ElButton @click="tenantAddonVisible = false">取消</ElButton><ElButton type="primary" :loading="saving" @click="submitTenantAddon">确认</ElButton></template></ElDialog>

    <ElDialog v-model="overrideVisible" title="特殊权益调整" width="560px"><ElForm :model="overrideForm" label-width="90px"><ElFormItem label="功能"><ElSelect v-model="overrideForm.featureId" filterable><ElOption v-for="item in features" :key="String(item.id)" :label="`${item.featureName} · ${item.featureCode}`" :value="item.id!" /></ElSelect></ElFormItem><ElFormItem label="操作"><ElSelect v-model="overrideForm.operation"><ElOption label="启用" value="ENABLE" /><ElOption label="禁用" value="DISABLE" /><ElOption label="增加额度" value="ADD" /><ElOption label="设置额度" value="SET" /></ElSelect></ElFormItem><ElFormItem v-if="['ADD','SET'].includes(overrideForm.operation)" label="额度"><ElInputNumber v-model="overrideForm.quotaValue" :min="0" /></ElFormItem><ElFormItem label="原因" required><ElInput v-model.trim="overrideForm.reason" type="textarea" /></ElFormItem><ElFormItem label="有效期"><ElDatePicker v-model="overrideRange" type="datetimerange" value-format="YYYY-MM-DDTHH:mm:ss" start-placeholder="立即生效" end-placeholder="长期有效" /></ElFormItem></ElForm><template #footer><ElButton @click="overrideVisible = false">取消</ElButton><ElButton type="primary" :loading="saving" @click="submitOverride">保存调整</ElButton></template></ElDialog>
  </section>
</template>

<script setup lang="ts">
  import { computed, onMounted, reactive, ref } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { listTenants } from '@/api/tenant'
  import type { Id, Tenant } from '@/types/backend'
  import {
    addTenantAddon, addTenantOverride, assignTenantSubscription, cancelTenantAddon,
    createPlanVersion, deleteTenantOverride, getTenantEntitlements, listAddonEntitlements,
    listPlanEntitlements, listPlanVersions, listSaasAddons, listSaasFeatures, listSaasPlans,
    listTenantAddons, listTenantOverrides, publishPlanVersion, saveAddonEntitlements,
    savePlanEntitlements, saveSaasAddon, saveSaasFeature, saveSaasPlan,
    type AddonEntitlement, type EffectiveEntitlementItem, type EffectiveEntitlements,
    type EntitlementOverride, type PlanEntitlement, type SaasAddon, type SaasFeature,
    type SaasPlan, type SaasPlanVersion, type SubscriptionAddon, type TenantSubscription
  } from '@/api/saas'

  defineOptions({ name: 'PlatformSaas' })
  const tab = ref('features'), loading = ref(false), tenantLoading = ref(false), saving = ref(false)
  const features = ref<SaasFeature[]>([]), plans = ref<SaasPlan[]>([]), addons = ref<SaasAddon[]>([])
  const versions = ref<Record<string, SaasPlanVersion[]>>({}), tenants = ref<Tenant[]>([])
  const selectedPlanId = ref<Id>(), tenantId = ref<Id>()
  const tenantState = ref<EffectiveEntitlements>({ tenantId: '', features: {} })
  const tenantAddons = ref<SubscriptionAddon[]>([]), tenantOverrides = ref<EntitlementOverride[]>([])
  const featureVisible = ref(false), planVisible = ref(false), planRulesVisible = ref(false)
  const addonVisible = ref(false), addonRulesVisible = ref(false), subscriptionVisible = ref(false)
  const tenantAddonVisible = ref(false), overrideVisible = ref(false)
  const featureDefaults = (): SaasFeature => ({ featureCode: '', featureName: '', featureType: 'BOOLEAN', unit: 'COUNT', quotaMode: 'RESOURCE', status: 1 })
  const planDefaults = (): SaasPlan => ({ planCode: '', planName: '', status: 1 })
  const addonDefaults = (): SaasAddon => ({ addonCode: '', addonName: '', maxQuantity: 10, status: 1 })
  const featureForm = reactive<SaasFeature>(featureDefaults()), planForm = reactive<SaasPlan>(planDefaults()), addonForm = reactive<SaasAddon>(addonDefaults())
  const editingVersion = ref<SaasPlanVersion>(), editingAddon = ref<SaasAddon>()
  const planRuleRows = ref<Array<PlanEntitlement & SaasFeature & { enabled: boolean; unlimited: boolean }>>([])
  const addonRuleRows = ref<Array<AddonEntitlement & SaasFeature & { included: boolean }>>([])
  const subscriptionForm = reactive<TenantSubscription>({ planVersionId: '', status: 'ACTIVE' })
  const tenantAddonForm = reactive<SubscriptionAddon>({ addonId: '', quantity: 1 })
  const overrideForm = reactive<EntitlementOverride>({ featureId: '', operation: 'ADD', quotaValue: 1, reason: '' })
  const overrideRange = ref<[string, string]>()
  const selectedPlan = computed(() => plans.value.find((item) => String(item.id) === String(selectedPlanId.value)))
  const selectedVersions = computed(() => selectedPlanId.value ? versions.value[String(selectedPlanId.value)] || [] : [])
  const effectiveRows = computed(() => Object.values(tenantState.value.features || {}))
  const activeAddons = computed(() => addons.value.filter((item) => item.status === 1))
  const versionOptions = computed(() => plans.value.flatMap((plan) => (versions.value[String(plan.id)] || []).filter((v) => v.status === 'PUBLISHED').map((v) => ({ value: v.id, label: `${plan.planName} · v${v.versionNo}` }))))

  function replace<T extends object>(target: T, value: T) { Object.keys(target).forEach((key) => delete (target as Record<string, unknown>)[key]); Object.assign(target, value) }
  function formatLocal(date: Date) { const offset = date.getTimezoneOffset() * 60000; return new Date(date.getTime() - offset).toISOString().slice(0, 19) }
  async function refresh() {
    loading.value = true
    try {
      const [featureRows, planRows, addonRows, tenantPage] = await Promise.all([listSaasFeatures(), listSaasPlans(), listSaasAddons(), listTenants({ currentPage: 1, pageSize: 200 })])
      features.value = featureRows; plans.value = planRows; addons.value = addonRows; tenants.value = tenantPage.records
      const entries = await Promise.all(planRows.filter((item) => item.id).map(async (item) => [String(item.id), await listPlanVersions(item.id!)] as const))
      versions.value = Object.fromEntries(entries)
      if (!selectedPlanId.value && planRows[0]?.id) selectedPlanId.value = planRows[0].id
    } finally { loading.value = false }
  }
  function openFeature(row?: SaasFeature) { replace(featureForm, { ...featureDefaults(), ...(row || {}) }); featureVisible.value = true }
  async function submitFeature() { if (!featureForm.featureCode || !featureForm.featureName) return ElMessage.warning('请填写功能编码和名称'); saving.value = true; try { await saveSaasFeature({ ...featureForm }); featureVisible.value = false; await refresh(); ElMessage.success('功能已保存') } finally { saving.value = false } }
  function openPlan(row?: SaasPlan) { replace(planForm, { ...planDefaults(), ...(row || {}) }); planVisible.value = true }
  async function submitPlan() { if (!planForm.planCode || !planForm.planName) return ElMessage.warning('请填写套餐编码和名称'); saving.value = true; try { const row = await saveSaasPlan({ ...planForm }); planVisible.value = false; selectedPlanId.value = row.id; await refresh(); ElMessage.success('套餐已保存') } finally { saving.value = false } }
  function selectPlan(row: SaasPlan) { selectedPlanId.value = row.id }
  async function createVersion(plan: SaasPlan) { const source = (versions.value[String(plan.id)] || [])[0]; await createPlanVersion(plan.id!, source?.id); selectedPlanId.value = plan.id; await refresh(); ElMessage.success(source ? '已复制上一版本为新草稿' : '套餐草稿已创建') }
  async function configurePlanVersion(version: SaasPlanVersion) { editingVersion.value = version; const rules = await listPlanEntitlements(version.id); const byFeature = new Map(rules.map((row) => [String(row.featureId), row])); planRuleRows.value = features.value.map((feature) => ({ ...feature, featureId: feature.id!, enabled: byFeature.get(String(feature.id))?.enabled === 1, unlimited: byFeature.get(String(feature.id))?.unlimited === 1, quotaValue: byFeature.get(String(feature.id))?.quotaValue ?? feature.defaultValue ?? 0, resetPeriod: byFeature.get(String(feature.id))?.resetPeriod || 'NONE', enforcement: byFeature.get(String(feature.id))?.enforcement || 'HARD' })); planRulesVisible.value = true }
  async function submitPlanRules() { if (!editingVersion.value) return; saving.value = true; try { await savePlanEntitlements(editingVersion.value.id, planRuleRows.value.map((row) => ({ featureId: row.featureId, enabled: row.enabled ? 1 : 0, unlimited: row.unlimited ? 1 : 0, quotaValue: row.featureType === 'QUOTA' && !row.unlimited ? row.quotaValue : null, resetPeriod: row.featureType === 'QUOTA' ? row.resetPeriod : 'NONE', enforcement: row.enforcement }))); planRulesVisible.value = false; ElMessage.success('套餐权益已保存') } finally { saving.value = false } }
  async function publishVersion(version: SaasPlanVersion) { await ElMessageBox.confirm(`发布 v${version.versionNo} 后不可修改，确认继续？`, '发布套餐版本', { type: 'warning' }); await publishPlanVersion(version.id); await refresh(); ElMessage.success('套餐版本已发布') }
  function openAddon(row?: SaasAddon) { replace(addonForm, { ...addonDefaults(), ...(row || {}) }); addonVisible.value = true }
  async function submitAddon() { if (!addonForm.addonCode || !addonForm.addonName) return ElMessage.warning('请填写加购项编码和名称'); saving.value = true; try { await saveSaasAddon({ ...addonForm }); addonVisible.value = false; await refresh(); ElMessage.success('加购项已保存') } finally { saving.value = false } }
  async function configureAddon(addon: SaasAddon) { editingAddon.value = addon; const rules = await listAddonEntitlements(addon.id!); const byFeature = new Map(rules.map((row) => [String(row.featureId), row])); addonRuleRows.value = features.value.map((feature) => ({ ...feature, featureId: feature.id!, included: byFeature.has(String(feature.id)), operation: byFeature.get(String(feature.id))?.operation || (feature.featureType === 'BOOLEAN' ? 'ENABLE' : 'ADD'), quotaValue: byFeature.get(String(feature.id))?.quotaValue ?? 1 })); addonRulesVisible.value = true }
  async function submitAddonRules() { if (!editingAddon.value?.id) return; saving.value = true; try { await saveAddonEntitlements(editingAddon.value.id, addonRuleRows.value.filter((row) => row.included).map((row) => ({ featureId: row.featureId, operation: row.operation, quotaValue: row.operation === 'ENABLE' ? null : row.quotaValue }))); addonRulesVisible.value = false; ElMessage.success('加购权益已保存') } finally { saving.value = false } }
  async function loadTenant() { if (!tenantId.value) return; tenantLoading.value = true; try { const [state, addOnRows, overrideRows] = await Promise.all([getTenantEntitlements(tenantId.value), listTenantAddons(tenantId.value), listTenantOverrides(tenantId.value)]); tenantState.value = state; tenantAddons.value = addOnRows; tenantOverrides.value = overrideRows } finally { tenantLoading.value = false } }
  function openSubscription() { const start = new Date(), end = new Date(); end.setMonth(end.getMonth() + 1); replace(subscriptionForm, { planVersionId: versionOptions.value[0]?.value || '', status: 'ACTIVE', currentPeriodStart: formatLocal(start), currentPeriodEnd: formatLocal(end) }); subscriptionVisible.value = true }
  async function submitSubscription() { if (!tenantId.value || !subscriptionForm.planVersionId) return ElMessage.warning('请选择套餐版本'); saving.value = true; try { await assignTenantSubscription(tenantId.value, { ...subscriptionForm }); subscriptionVisible.value = false; await loadTenant(); ElMessage.success('租户套餐已生效') } finally { saving.value = false } }
  function openTenantAddon() { replace(tenantAddonForm, { addonId: activeAddons.value[0]?.id || '', quantity: 1 }); tenantAddonVisible.value = true }
  async function submitTenantAddon() { if (!tenantId.value || !tenantAddonForm.addonId) return; saving.value = true; try { await addTenantAddon(tenantId.value, { ...tenantAddonForm }); tenantAddonVisible.value = false; await loadTenant(); ElMessage.success('加购项已生效') } finally { saving.value = false } }
  async function cancelAddon(row: SubscriptionAddon) { if (!tenantId.value || !row.id) return; await ElMessageBox.confirm('确认取消该加购项？', '取消加购'); await cancelTenantAddon(tenantId.value, row.id); await loadTenant() }
  function openOverride() { replace(overrideForm, { featureId: features.value[0]?.id || '', operation: 'ADD', quotaValue: 1, reason: '' }); overrideRange.value = undefined; overrideVisible.value = true }
  async function submitOverride() { if (!tenantId.value || !overrideForm.featureId || !overrideForm.reason) return ElMessage.warning('请选择功能并填写调整原因'); saving.value = true; try { await addTenantOverride(tenantId.value, { ...overrideForm, effectiveFrom: overrideRange.value?.[0], effectiveTo: overrideRange.value?.[1] }); overrideVisible.value = false; await loadTenant(); ElMessage.success('特殊权益已生效') } finally { saving.value = false } }
  async function removeOverride(row: EntitlementOverride) { if (!tenantId.value || !row.id) return; await ElMessageBox.confirm('删除后会立即重新计算最终权益，确认？', '删除调整'); await deleteTenantOverride(tenantId.value, row.id); await loadTenant() }
  function versionStatus(value: string) { return ({ DRAFT: '草稿', PUBLISHED: '已发布', RETIRED: '已下架' } as Record<string, string>)[value] || value }
  function featureName(id: Id) { return features.value.find((item) => String(item.id) === String(id))?.featureName || String(id) }
  function quotaText(row: EffectiveEntitlementItem) { if (row.featureType === 'BOOLEAN') return '—'; if (row.unlimited) return '不限量'; return row.limit ?? 0 }
  onMounted(refresh)
</script>

<style scoped>
  .page-title { margin: 4px 0 18px; }
  .page-title h2 { font-size: 24px; }
  .page-title p { margin-top: 8px; color: var(--el-text-color-secondary); }
  .notice { margin-bottom: 16px; }
  .toolbar { display: flex; justify-content: flex-end; margin-bottom: 14px; }
  .subsection { padding-top: 24px; }
  h3 { margin: 18px 0 12px; font-size: 16px; }
  .tenant-picker { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 18px; }
  .tenant-summary { margin-bottom: 20px; }
  .source-tag { margin: 2px 4px 2px 0; }
  .two-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  @media (max-width: 900px) { .two-columns { grid-template-columns: 1fr; } }
</style>
