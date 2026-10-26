<template>
  <section class="saas-page">
    <div class="page-hero">
      <div class="hero-copy">
        <span class="hero-eyebrow">SAAS PLAN CENTER</span>
        <h2>套餐与权益管理</h2>
        <p>统一维护套餐定位、价格与权益梯度，让运营配置和租户实际生效能力保持一致。</p>
        <div class="hero-legend">
          <span><i class="legend-dot base"></i>基础功能：全部套餐一致开放</span>
          <span><i class="legend-dot value"></i>增值权益：由服务端强制执行</span>
        </div>
      </div>
      <div class="hero-actions">
        <ElButton @click="tab = 'benefits'">查看权益对比</ElButton>
        <ElButton type="primary" @click="openPlan()">
          <ArtSvgIcon icon="ri:add-line" /> 新增套餐
        </ElButton>
      </div>
    </div>
    <ElTabs v-model="tab" class="management-tabs">
      <ElTabPane label="套餐管理" name="plans">
        <div v-loading="loading" class="plan-grid">
          <article
            v-for="(plan, index) in plans"
            :key="String(plan.id)"
            class="plan-card"
            :class="[`tone-${planTone(plan, index)}`, { disabled: plan.status !== 1 }]"
          >
            <div v-if="plan.recommended === 1" class="recommend-ribbon">
              <ArtSvgIcon icon="ri:sparkling-fill" /> 推荐
            </div>
            <div class="plan-visual">
              <div class="plan-heading">
                <div>
                  <div class="plan-name-row">
                    <h3>{{ plan.planName }}</h3>
                    <ElTag v-if="plan.status !== 1" type="info" size="small">已停用</ElTag>
                  </div>
                  <p>{{ plan.targetCustomer || '尚未设置适用客户' }}</p>
                </div>
                <img :src="planImage(plan, index)" :alt="plan.planName" />
              </div>
              <p class="plan-description">{{
                plan.description || '配置清晰的套餐定位与服务方案'
              }}</p>
            </div>
            <div class="plan-body">
              <div class="price-line">
                <span class="currency">¥</span>
                <strong>{{ monthlyPrice(plan) }}</strong>
                <span>/ 月</span>
                <small>{{ versionLabel(plan) }}</small>
              </div>
              <div class="yearly-price">
                <span>年付价格</span>
                <b>¥ {{ yearlyPrice(plan) }}</b>
                <span>/ 年</span>
              </div>
              <div class="quota-pill">
                <ArtSvgIcon icon="ri:store-2-line" /> 门店数量上限
                <b>{{ planStoreQuota(plan) }}</b>
              </div>
              <ul class="benefit-list">
                <li v-for="benefit in planBenefits(plan)" :key="benefit">
                  <span class="check"><ArtSvgIcon icon="ri:check-line" /></span>{{ benefit }}
                </li>
              </ul>
            </div>
            <div class="plan-actions">
              <ElButton type="primary" plain @click="openPlan(plan)">编辑套餐</ElButton>
              <ElButton @click="editPlanEntitlement(plan)">编辑权益</ElButton>
              <ElDropdown trigger="click">
                <ElButton circle><ArtSvgIcon icon="ri:more-2-fill" /></ElButton>
                <template #dropdown>
                  <ElDropdownMenu>
                    <ElDropdownItem @click="setRecommended(plan)">设为推荐套餐</ElDropdownItem>
                    <ElDropdownItem @click="openVersionHistory(plan)">查看版本记录</ElDropdownItem>
                    <ElDropdownItem @click="createVersion(plan)">新建权益版本</ElDropdownItem>
                  </ElDropdownMenu>
                </template>
              </ElDropdown>
            </div>
          </article>
        </div>
      </ElTabPane>

      <ElTabPane label="功能权益" name="benefits">
        <div class="section-heading">
          <div>
            <span class="section-icon"><ArtSvgIcon icon="ri:table-2" /></span>
            <div
              ><h3>套餐权益对比</h3
              ><p>横向检查套餐能力梯度；基础功能统一开放，差异权益单独配置。</p></div
            >
          </div>
          <ElButton type="primary" @click="openDisplayFeature()">
            <ArtSvgIcon icon="ri:add-line" /> 新增展示功能
          </ElButton>
        </div>
        <div class="comparison-wrap">
          <ArtTable
            :data="comparisonTableData"
            :columns="comparisonColumns"
            border
            size="small"
            empty-text="暂无可展示的权益"
          >
            <template #comparisonFeature="{ row }">
              <div class="feature-cell">
                <b>{{ row.featureName }}</b>
                <span>{{ row.description }}</span>
              </div>
            </template>
            <template #comparisonAction="{ row }">
              <ElButton
                v-if="row.kind === 'base'"
                link
                type="primary"
                @click="openDisplayFeature(row.source)"
                >编辑展示</ElButton
              >
              <span v-else class="row-action">逐列编辑</span>
            </template>
          </ArtTable>
        </div>

        <div class="display-feature-manager">
          <div class="subsection-heading">
            <div>
              <h4>基础功能展示管理</h4>
              <p>停用项仍保留在这里，可随时点击“重新展示”。</p>
            </div>
            <ElButton type="primary" plain @click="openDisplayFeature()">新增基础功能</ElButton>
          </div>
          <ArtTable
            :data="displayFeatureTableData"
            :columns="displayFeatureColumns"
            :loading="loading"
            size="small"
            height="320"
          >
            <template #displayStatus="{ row }">
              <ElTag :type="row.status === 1 ? 'success' : 'info'">
                {{ row.status === 1 ? '展示中' : '已隐藏' }}
              </ElTag>
            </template>
            <template #displayAction="{ row }">
              <ElButton link type="primary" @click="openDisplayFeature(row)">编辑</ElButton>
              <ElButton
                link
                :type="row.status === 1 ? 'warning' : 'success'"
                @click="toggleDisplayFeature(row)"
              >
                {{ row.status === 1 ? '停止展示' : '重新展示' }}
              </ElButton>
            </template>
          </ArtTable>
        </div>

        <ElCollapse class="advanced-config">
          <ElCollapseItem name="value-services">
            <template #title>
              <div class="collapse-title"
                ><ArtSvgIcon icon="ri:settings-3-line" /> 增值服务技术配置</div
              >
            </template>
            <ElAlert
              title="当前只有“门店数量上限”已接入服务端强制校验。基础功能仅维护展示信息，不作为可售开关。"
              type="info"
              :closable="false"
              show-icon
              class="notice"
            />
            <div class="toolbar">
              <ElButton v-if="!storeFeatureExists" type="primary" @click="openFeature()"
                >登记门店增值服务</ElButton
              >
            </div>
            <ArtTable :data="featureTableData" :columns="featureColumns" :loading="loading">
              <template #featureType="{ row }"
                ><ElTag>{{ row.featureType }}</ElTag></template
              >
              <template #status="{ row }">
                <ElTag :type="row.status === 1 ? 'success' : 'info'">{{
                  row.status === 1 ? '启用' : '停用'
                }}</ElTag>
              </template>
              <template #featureAction="{ row }"
                ><ElButton link type="primary" @click="openFeature(row)">编辑</ElButton></template
              >
            </ArtTable>
          </ElCollapseItem>
          <ElCollapseItem name="addons">
            <template #title>
              <div class="collapse-title"><ArtSvgIcon icon="ri:add-box-line" /> 加购项配置</div>
            </template>
            <div class="toolbar"
              ><ElButton type="primary" @click="openAddon()">新增加购项</ElButton></div
            >
            <ArtTable :data="addonTableData" :columns="addonColumns" :loading="loading">
              <template #addonStatus="{ row }">
                <ElTag :type="row.status === 1 ? 'success' : 'info'">{{
                  row.status === 1 ? '启用' : '停用'
                }}</ElTag>
              </template>
              <template #addonAction="{ row }">
                <ElButton link type="primary" @click="openAddon(row)">编辑</ElButton>
                <ElButton link type="primary" @click="configureAddon(row)">配置权益</ElButton>
              </template>
            </ArtTable>
          </ElCollapseItem>
        </ElCollapse>
      </ElTabPane>

      <ElTabPane label="租户权益" name="tenants">
        <div class="tenant-workspace">
          <section class="tenant-toolbar-panel">
            <div class="tenant-picker">
              <span class="tenant-picker-label">选择租户</span>
              <ElSelect
                v-model="tenantId"
                class="tenant-select"
                filterable
                placeholder="请选择需要配置权益的租户"
                @change="loadTenant"
              >
                <ElOption
                  v-for="tenant in tenants"
                  :key="String(tenant.id)"
                  :label="`${tenant.tenantName} · ${tenant.tenantCode}`"
                  :value="tenant.id"
                />
              </ElSelect>
            </div>
            <div class="tenant-actions">
              <ElButton :disabled="!tenantId" type="primary" @click="openSubscription">
                <ArtSvgIcon icon="ri:box-3-line" /> 分配套餐
              </ElButton>
              <ElButton :disabled="!tenantState.subscriptionId" @click="openTenantAddon">
                <ArtSvgIcon icon="ri:shopping-cart-line" /> 添加加购
              </ElButton>
              <ElButton :disabled="!tenantId" @click="openOverride">
                <ArtSvgIcon icon="ri:equalizer-2-line" /> 特殊调整
              </ElButton>
              <ElButton :disabled="!tenantId" @click="loadTenant">
                <ArtSvgIcon icon="ri:refresh-line" /> 刷新权益
              </ElButton>
            </div>
          </section>

          <section v-if="!tenantId" class="tenant-panel tenant-empty-panel">
            <ElEmpty description="请先选择一个租户查看套餐及权益" />
          </section>
          <template v-else>
            <section class="tenant-panel overview-panel" v-loading="tenantLoading">
              <div class="tenant-section-heading">
                <div>
                  <span class="tenant-heading-icon"
                    ><ArtSvgIcon icon="ri:bar-chart-box-line"
                  /></span>
                  <div>
                    <h3>当前租户权益概览</h3>
                    <p>查看该租户的套餐信息与权益使用概况</p>
                  </div>
                </div>
              </div>
              <div class="tenant-metrics">
                <article class="tenant-metric metric-blue">
                  <span class="metric-icon"><ArtSvgIcon icon="ri:box-3-fill" /></span>
                  <div
                    ><small>当前套餐</small
                    ><strong>{{
                      tenantState.planName || latestSubscriptionPlanName || '未订阅'
                    }}</strong></div
                  >
                </article>
                <article class="tenant-metric metric-purple">
                  <span class="metric-icon"><ArtSvgIcon icon="ri:stack-fill" /></span>
                  <div
                    ><small>套餐版本</small
                    ><strong>{{
                      tenantState.planVersion
                        ? `v${tenantState.planVersion}`
                        : latestSubscriptionVersionLabel
                    }}</strong></div
                  >
                </article>
                <article class="tenant-metric metric-green">
                  <span class="metric-icon"><ArtSvgIcon icon="ri:pulse-line" /></span>
                  <div>
                    <small>订阅状态</small>
                    <ElTag :type="subscriptionStatusType" size="small">{{
                      tenantState.subscriptionStatus || latestSubscription?.status || '未订阅'
                    }}</ElTag>
                  </div>
                </article>
                <article class="tenant-metric metric-indigo period-metric">
                  <span class="metric-icon"><ArtSvgIcon icon="ri:calendar-2-line" /></span>
                  <div>
                    <small>计费周期</small>
                    <strong>{{
                      shortDateTime(
                        tenantState.periodStart || latestSubscription?.currentPeriodStart
                      )
                    }}</strong>
                    <span
                      >至
                      {{
                        shortDateTime(tenantState.periodEnd || latestSubscription?.currentPeriodEnd)
                      }}</span
                    >
                  </div>
                </article>
                <article class="tenant-metric metric-orange">
                  <span class="metric-icon"><ArtSvgIcon icon="ri:pie-chart-2-fill" /></span>
                  <div
                    ><small>已启用权益数</small
                    ><strong>{{ enabledEntitlementCount }} 个</strong></div
                  >
                </article>
                <article class="tenant-metric metric-violet">
                  <span class="metric-icon"><ArtSvgIcon icon="ri:shopping-cart-2-fill" /></span>
                  <div
                    ><small>有效加购数</small><strong>{{ activeTenantAddonCount }} 个</strong></div
                  >
                </article>
              </div>
              <ElAlert
                v-if="latestSubscription && !tenantState.subscriptionId"
                title="已找到套餐分配记录，但该记录当前未生效，请检查订阅状态和有效期。"
                type="warning"
                :closable="false"
                show-icon
                class="tenant-alert"
              />
            </section>

            <section class="tenant-panel entitlement-panel">
              <div class="tenant-section-heading">
                <div>
                  <span class="tenant-heading-icon"><ArtSvgIcon icon="ri:stack-line" /></span>
                  <div><h3>最终生效权益</h3><p>该租户当前已生效的功能权益列表</p></div>
                </div>
              </div>
              <ArtTable
                :data="effectiveTableData"
                :columns="effectiveColumns"
                :loading="tenantLoading"
                size="small"
                empty-height="180px"
                empty-text="当前租户没有有效套餐权益"
              >
                <template #effectiveEnabled="{ row }">
                  <ElTag :type="row.enabled ? 'success' : 'danger'" size="small">{{
                    row.enabled ? '是' : '否'
                  }}</ElTag>
                </template>
                <template #effectiveQuota="{ row }">{{ quotaText(row) }}</template>
                <template #effectiveSources="{ row }">
                  <ElTag
                    v-for="source in row.sources"
                    :key="source"
                    class="source-tag"
                    effect="plain"
                    size="small"
                    >{{ source }}</ElTag
                  >
                </template>
              </ArtTable>
            </section>

            <div class="tenant-bottom-grid">
              <section class="tenant-panel">
                <div class="tenant-section-heading">
                  <div>
                    <span class="tenant-heading-icon"
                      ><ArtSvgIcon icon="ri:shopping-cart-2-line"
                    /></span>
                    <div><h3>有效/历史加购</h3><p>该租户的加购项记录（包含历史）</p></div>
                  </div>
                </div>
                <ArtTable
                  :data="tenantAddonTableData"
                  :columns="tenantAddonColumns"
                  size="small"
                  empty-height="150px"
                >
                  <template #tenantAddonName="{ row }">{{ addonName(row.addonId) }}</template>
                  <template #tenantAddonAction="{ row }">
                    <ElButton
                      v-if="row.status === 'ACTIVE'"
                      link
                      type="danger"
                      @click="cancelAddon(row)"
                      >取消</ElButton
                    >
                  </template>
                </ArtTable>
              </section>
              <section class="tenant-panel">
                <div class="tenant-section-heading">
                  <div>
                    <span class="tenant-heading-icon"
                      ><ArtSvgIcon icon="ri:equalizer-2-line"
                    /></span>
                    <div><h3>特殊调整</h3><p>临时增减、定制化配置等权益调整记录</p></div>
                  </div>
                  <ElButton type="primary" plain :disabled="!tenantId" @click="openOverride">
                    <ArtSvgIcon icon="ri:add-line" /> 新增调整
                  </ElButton>
                </div>
                <ArtTable
                  :data="overrideTableData"
                  :columns="overrideColumns"
                  size="small"
                  empty-height="150px"
                >
                  <template #overrideFeature="{ row }">{{ featureName(row.featureId) }}</template>
                  <template #overrideValue="{ row }">{{
                    row.textValue ?? row.quotaValue ?? '—'
                  }}</template>
                  <template #overrideAction="{ row }">
                    <ElButton link type="danger" @click="removeOverride(row)">删除</ElButton>
                  </template>
                </ArtTable>
              </section>
            </div>
          </template>
        </div>
      </ElTabPane>
    </ElTabs>

    <SaasFormDialog
      v-model:visible="displayFeatureVisible"
      :title="displayFeatureForm.id ? '编辑基础功能展示' : '新增基础功能展示'"
      :form="displayFeatureForm"
      :items="displayFeatureFormItems"
      :saving="saving"
      submit-text="保存展示信息"
      alert-title="这里维护的是所有套餐共同拥有的基础功能文案，不会创建运行时权限限制。"
      alert-type="success"
      @submit="submitDisplayFeature"
    />
    <PlanVersionHistoryDialog
      v-model:visible="versionHistoryVisible"
      :plan-name="selectedPlan?.planName"
      :versions="selectedVersions"
      :can-create="!!selectedPlan"
      @edit="configurePlanVersion"
      @publish="publishVersion"
      @remove="removeDraftVersion"
      @create="selectedPlan && createVersion(selectedPlan)"
    />
    <SaasFormDialog
      v-model:visible="featureVisible"
      :title="featureForm.id ? '编辑增值服务' : '登记增值服务'"
      :form="featureForm"
      :items="featureFormItems"
      :saving="saving"
      label-width="95px"
      @submit="submitFeature"
    />
    <SaasFormDialog
      v-model:visible="planVisible"
      :title="planForm.id ? '编辑套餐' : '新增套餐'"
      :form="planForm"
      :items="planFormItems"
      :saving="saving"
      width="520px"
      label-width="90px"
      @submit="submitPlan"
    />
    <PlanEntitlementDialog
      v-model:visible="planRulesVisible"
      :version="editingVersion"
      :rows="planRuleRows"
      :saving="saving"
      @submit="submitPlanRules"
    />
    <SaasFormDialog
      v-model:visible="addonVisible"
      :title="addonForm.id ? '编辑加购项' : '新增加购项'"
      :form="addonForm"
      :items="addonFormItems"
      :saving="saving"
      width="520px"
      label-width="95px"
      @submit="submitAddon"
    />
    <AddonEntitlementDialog
      v-model:visible="addonRulesVisible"
      :rows="addonRuleRows"
      :saving="saving"
      @submit="submitAddonRules"
    />
    <SaasFormDialog
      v-model:visible="subscriptionVisible"
      title="分配租户套餐"
      :form="subscriptionForm"
      :items="subscriptionFormItems"
      :saving="saving"
      label-width="100px"
      submit-text="确认分配"
      @submit="submitSubscription"
    />
    <SaasFormDialog
      v-model:visible="tenantAddonVisible"
      title="租户加购"
      :form="tenantAddonForm"
      :items="tenantAddonFormItems"
      :saving="saving"
      width="480px"
      label-width="90px"
      submit-text="确认"
      @submit="submitTenantAddon"
    />
    <SaasFormDialog
      v-model:visible="overrideVisible"
      title="特殊权益调整"
      :form="overrideForm"
      :items="overrideFormItems"
      :saving="saving"
      label-width="90px"
      submit-text="保存调整"
      @submit="submitOverride"
    />
  </section>
</template>

<script setup lang="ts">
  import { computed, h, onMounted, reactive, ref } from 'vue'
  import { ElButton, ElMessage, ElMessageBox } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import type { FormItem } from '@/components/core/forms/art-form/index.vue'
  import { listTenants } from '@/api/tenant'
  import type { Id, Tenant } from '@/types/backend'
  import {
    addTenantAddon,
    addTenantOverride,
    assignTenantSubscription,
    cancelTenantAddon,
    createPlanVersion,
    deletePlanVersion,
    deleteTenantOverride,
    getTenantEntitlements,
    listAddonEntitlements,
    listPlanEntitlements,
    listPlanVersions,
    listSaasAddons,
    listSaasDisplayFeatures,
    listSaasFeatures,
    listSaasPlans,
    listTenantAddons,
    listTenantOverrides,
    listTenantSubscriptions,
    publishPlanVersion,
    saveAddonEntitlements,
    savePlanEntitlements,
    savePlanVersion,
    saveSaasAddon,
    saveSaasDisplayFeature,
    saveSaasFeature,
    saveSaasPlan,
    type AddonEntitlement,
    type EffectiveEntitlementItem,
    type EffectiveEntitlements,
    type EntitlementOverride,
    type PlanEntitlement,
    type SaasAddon,
    type SaasDisplayFeature,
    type SaasFeature,
    type SaasPlan,
    type SaasPlanVersion,
    type SubscriptionAddon,
    type TenantSubscription
  } from '@/api/saas'
  import freePlanImage from '@/assets/images/saas/plans/free.png'
  import standardPlanImage from '@/assets/images/saas/plans/standard.png'
  import proPlanImage from '@/assets/images/saas/plans/pro.png'
  import enterprisePlanImage from '@/assets/images/saas/plans/enterprise.png'
  import SaasFormDialog from './modules/saas-form-dialog.vue'
  import PlanVersionHistoryDialog from './modules/plan-version-history-dialog.vue'
  import PlanEntitlementDialog from './modules/plan-entitlement-dialog.vue'
  import AddonEntitlementDialog from './modules/addon-entitlement-dialog.vue'

  defineOptions({ name: 'PlatformSaas' })
  const tab = ref('plans'),
    loading = ref(false),
    tenantLoading = ref(false),
    saving = ref(false)
  const features = ref<SaasFeature[]>([]),
    displayFeatures = ref<SaasDisplayFeature[]>([]),
    plans = ref<SaasPlan[]>([]),
    addons = ref<SaasAddon[]>([])
  const versions = ref<Record<string, SaasPlanVersion[]>>({}),
    tenants = ref<Tenant[]>([])
  const selectedPlanId = ref<Id>(),
    tenantId = ref<Id>()
  const tenantState = ref<EffectiveEntitlements>({ tenantId: '', features: {} })
  const tenantSubscriptions = ref<TenantSubscription[]>([]),
    tenantAddons = ref<SubscriptionAddon[]>([]),
    tenantOverrides = ref<EntitlementOverride[]>([])
  const effectiveRows = computed(() => Object.values(tenantState.value.features || {}))
  const actionLabel = '操作'
  const { data: featureTableData, columns: featureColumns } = useTable({
    core: {
      dataSource: () => features.value,
      columnsFactory: () => [
        { prop: 'featureCode', label: '服务编码', minWidth: 190 },
        { prop: 'featureName', label: '增值服务', minWidth: 140 },
        { prop: 'featureType', label: '类型', width: 110, useSlot: true },
        { prop: 'quotaMode', label: '配额模式', width: 130 },
        { prop: 'unit', label: '单位', width: 100 },
        { prop: 'status', label: '状态', width: 90, useSlot: true },
        { prop: 'featureAction', label: actionLabel, width: 90, useSlot: true }
      ]
    }
  })
  const { data: displayFeatureTableData, columns: displayFeatureColumns } = useTable({
    core: {
      dataSource: () => displayFeatures.value,
      columnsFactory: () => [
        { prop: 'moduleName', label: '功能模块', minWidth: 140 },
        { prop: 'featureName', label: '基础功能', minWidth: 150 },
        { prop: 'description', label: '展示说明', minWidth: 240 },
        { prop: 'displayStatus', label: '状态', width: 90, useSlot: true },
        { prop: 'displayAction', label: actionLabel, width: 170, useSlot: true }
      ]
    }
  })
  const { data: addonTableData, columns: addonColumns } = useTable({
    core: {
      dataSource: () => addons.value,
      columnsFactory: () => [
        { prop: 'addonCode', label: '编码', minWidth: 170 },
        { prop: 'addonName', label: '名称', minWidth: 150 },
        { prop: 'monthlyPrice', label: '月付价格', width: 105 },
        { prop: 'maxQuantity', label: '最大数量', width: 95 },
        { prop: 'description', label: '说明', minWidth: 210 },
        { prop: 'addonStatus', label: '状态', width: 85, useSlot: true },
        { prop: 'addonAction', label: actionLabel, width: 150, useSlot: true }
      ]
    }
  })
  const { data: effectiveTableData, columns: effectiveColumns } = useTable({
    core: {
      dataSource: () => effectiveRows.value,
      columnsFactory: () => [
        { prop: 'featureCode', label: '功能编码', minWidth: 180 },
        { prop: 'featureName', label: '名称', minWidth: 130 },
        { prop: 'effectiveEnabled', label: '可用', width: 75, useSlot: true },
        { prop: 'effectiveQuota', label: '额度', width: 110, useSlot: true },
        { prop: 'used', label: '已用', width: 90 },
        { prop: 'remaining', label: '剩余', width: 90 },
        { prop: 'effectiveSources', label: '来源', minWidth: 240, useSlot: true }
      ]
    }
  })
  const { data: tenantAddonTableData, columns: tenantAddonColumns } = useTable({
    core: {
      dataSource: () => tenantAddons.value,
      columnsFactory: () => [
        { prop: 'tenantAddonName', label: '加购项', useSlot: true },
        { prop: 'quantity', label: '数量', width: 75 },
        { prop: 'status', label: '状态', width: 90 },
        { prop: 'tenantAddonAction', label: actionLabel, width: 75, useSlot: true }
      ]
    }
  })
  const { data: overrideTableData, columns: overrideColumns } = useTable({
    core: {
      dataSource: () => tenantOverrides.value,
      columnsFactory: () => [
        { prop: 'overrideFeature', label: '功能', useSlot: true },
        { prop: 'operation', label: '操作类型', width: 85 },
        { prop: 'overrideValue', label: '调整值', width: 95, useSlot: true },
        { prop: 'reason', label: '原因' },
        { prop: 'overrideAction', label: actionLabel, width: 65, useSlot: true }
      ]
    }
  })
  const displayFeatureVisible = ref(false),
    versionHistoryVisible = ref(false)
  const featureVisible = ref(false),
    planVisible = ref(false),
    planRulesVisible = ref(false)
  const addonVisible = ref(false),
    addonRulesVisible = ref(false),
    subscriptionVisible = ref(false)
  const tenantAddonVisible = ref(false),
    overrideVisible = ref(false)
  const featureDefaults = (): SaasFeature => ({
    featureCode: 'store_count',
    featureName: '可管理门店数',
    featureType: 'NUMBER',
    unit: 'STORE',
    quotaMode: 'RESOURCE',
    usageSource: 'REALTIME',
    usageMetric: 'store_count',
    description: '租户可创建并保有的门店总数；新增门店时服务端强制校验',
    status: 1
  })
  const planDefaults = (): SaasPlan => ({
    planCode: '',
    planName: '',
    targetCustomer: '',
    coreBenefits: '',
    recommended: 0,
    sortOrder: 0,
    status: 1
  })
  const displayFeatureDefaults = (): SaasDisplayFeature => ({
    moduleCode: '',
    moduleName: '',
    featureCode: '',
    featureName: '',
    description: '',
    sortOrder: 0,
    status: 1
  })
  const addonDefaults = (): SaasAddon => ({
    addonCode: '',
    addonName: '',
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: 'CNY',
    maxQuantity: 10,
    sortOrder: 0,
    status: 1
  })
  const featureForm = reactive<SaasFeature>(featureDefaults()),
    displayFeatureForm = reactive<SaasDisplayFeature>(displayFeatureDefaults()),
    planForm = reactive<SaasPlan>(planDefaults()),
    addonForm = reactive<SaasAddon>(addonDefaults())
  type PlanRuleRow = SaasFeature & {
    featureId: Id
    enabled: boolean
    unlimited: boolean
    quotaValue: number | null
    textValue: string | null
    resetPeriod: PlanEntitlement['resetPeriod']
    enforcement: PlanEntitlement['enforcement']
  }
  type AddonRuleRow = SaasFeature & {
    featureId: Id
    included: boolean
    operation: AddonEntitlement['operation']
    quotaValue: number | null
    textValue: string | null
  }
  const editingVersion = ref<SaasPlanVersion>(),
    editingAddon = ref<SaasAddon>()
  const planRuleRows = ref<PlanRuleRow[]>([])
  const addonRuleRows = ref<AddonRuleRow[]>([])
  const comparisonEntitlements = ref<Record<string, PlanEntitlement[]>>({})
  const subscriptionForm = reactive<TenantSubscription>({
    planVersionId: '',
    status: 'ACTIVE',
    billingCycle: 'MONTHLY'
  })
  const tenantAddonForm = reactive<SubscriptionAddon>({ addonId: '', quantity: 1 })
  type OverrideForm = EntitlementOverride & { effectiveRange?: [string, string] }
  const overrideForm = reactive<OverrideForm>({
    featureId: '',
    operation: 'ADD',
    quotaValue: 1,
    textValue: '',
    reason: ''
  })
  const selectedPlan = computed(() =>
    plans.value.find((item) => String(item.id) === String(selectedPlanId.value))
  )
  const selectedVersions = computed(() =>
    selectedPlanId.value ? versions.value[String(selectedPlanId.value)] || [] : []
  )
  const latestSubscription = computed(() => tenantSubscriptions.value[0])
  const latestSubscriptionVersion = computed(() => {
    const versionId = latestSubscription.value?.planVersionId
    if (!versionId) return undefined
    return Object.values(versions.value)
      .flat()
      .find((item) => String(item.id) === String(versionId))
  })
  const latestSubscriptionPlanName = computed(() => {
    const planId = latestSubscriptionVersion.value?.planId
    return plans.value.find((item) => String(item.id) === String(planId))?.planName || ''
  })
  const latestSubscriptionVersionLabel = computed(() =>
    latestSubscriptionVersion.value ? `v${latestSubscriptionVersion.value.versionNo}` : '-'
  )
  const enabledEntitlementCount = computed(
    () => effectiveRows.value.filter((item) => item.enabled).length
  )
  const activeTenantAddonCount = computed(
    () => tenantAddons.value.filter((item) => item.status === 'ACTIVE').length
  )
  const subscriptionStatusType = computed<'success' | 'warning' | 'danger' | 'info'>(() => {
    const status = tenantState.value.subscriptionStatus || latestSubscription.value?.status
    if (status === 'ACTIVE') return 'success'
    if (['TRIAL', 'TRIALING', 'PAST_DUE', 'GRACE'].includes(status || '')) return 'warning'
    if (['SUSPENDED', 'CANCELED'].includes(status || '')) return 'danger'
    return 'info'
  })
  const storeFeatureExists = computed(() =>
    features.value.some((item) => item.featureCode === 'store_count')
  )
  const activeAddons = computed(() => addons.value.filter((item) => item.status === 1))
  const selectedOverrideFeature = computed(() =>
    features.value.find((item) => String(item.id) === String(overrideForm.featureId))
  )
  const versionOptions = computed(() =>
    plans.value.filter((plan) => plan.status === 1).flatMap((plan) =>
      (versions.value[String(plan.id)] || [])
        .filter((v) => v.status === 'PUBLISHED')
        .map((v) => ({ value: v.id, label: `${plan.planName} · v${v.versionNo}` }))
    )
  )
  const displayFeatureFormItems = computed<FormItem[]>(() => [
    {
      key: 'moduleCode',
      label: '模块编码',
      type: 'input',
      props: { placeholder: '例如 ordering' }
    },
    {
      key: 'moduleName',
      label: '模块名称',
      type: 'input',
      props: { placeholder: '例如 点餐与菜品' }
    },
    {
      key: 'featureCode',
      label: '功能编码',
      type: 'input',
      props: {
        placeholder: '例如 qr_ordering',
        disabled: !!displayFeatureForm.id
      }
    },
    { key: 'featureName', label: '功能名称', type: 'input' },
    {
      key: 'description',
      label: '展示说明',
      type: 'input',
      props: { type: 'textarea', rows: 3 }
    },
    {
      key: 'sortOrder',
      label: '排序',
      type: 'number',
      props: { min: 0, controlsPosition: 'right' }
    },
    {
      key: 'status',
      label: '展示状态',
      type: 'switch',
      props: { activeValue: 1, inactiveValue: 0, activeText: '展示', inactiveText: '隐藏' }
    }
  ])
  const featureFormItems = computed<FormItem[]>(() => [
    {
      key: 'featureCode',
      label: '服务编码',
      type: 'input',
      props: { disabled: true }
    },
    { key: 'featureName', label: '服务名称', type: 'input' },
    {
      key: 'featureType',
      label: '类型',
      type: 'select',
      props: {
        disabled: true,
        options: [
          { label: '开关功能', value: 'BOOLEAN' },
          { label: '数值/配额', value: 'NUMBER' },
          { label: '文本', value: 'STRING' },
          { label: '枚举', value: 'ENUM' }
        ]
      }
    },
    {
      key: 'quotaMode',
      label: '配额模式',
      type: 'select',
      hidden: !isNumericType(featureForm.featureType),
      props: {
        disabled: true,
        options: [
          { label: '当前资源数', value: 'RESOURCE' },
          { label: '周期消费', value: 'PERIODIC' },
          { label: '速率限制', value: 'RATE' },
          { label: '并发限制', value: 'CONCURRENT' }
        ]
      }
    },
    {
      key: 'unit',
      label: '单位',
      type: 'input',
      hidden: !isNumericType(featureForm.featureType),
      props: { disabled: true }
    },
    {
      key: 'usageSource',
      label: '用量来源',
      type: 'select',
      hidden: !isNumericType(featureForm.featureType),
      props: {
        disabled: true,
        options: [
          { label: '原子累计计数', value: 'COUNTER' },
          { label: '业务库实时查询', value: 'REALTIME' }
        ]
      }
    },
    {
      key: 'usageMetric',
      label: '用量指标',
      type: 'input',
      hidden: featureForm.usageSource !== 'REALTIME',
      props: { disabled: true }
    },
    {
      key: 'defaultTextValue',
      label: '系统默认值',
      type: 'input',
      hidden: !['STRING', 'ENUM'].includes(featureForm.featureType)
    },
    {
      key: 'allowedValues',
      label: '可选值 JSON',
      type: 'input',
      hidden: featureForm.featureType !== 'ENUM',
      props: { type: 'textarea', placeholder: '["basic","advanced"]' }
    },
    {
      key: 'defaultValue',
      label: '系统默认开启',
      type: 'switch',
      hidden: featureForm.featureType !== 'BOOLEAN',
      props: { activeValue: 1, inactiveValue: 0 }
    },
    {
      key: 'description',
      label: '说明',
      type: 'input',
      props: { type: 'textarea', rows: 2 }
    },
    {
      key: 'status',
      label: '状态',
      type: 'switch',
      props: { activeValue: 1, inactiveValue: 0, activeText: '启用', inactiveText: '停用' }
    }
  ])
  const planFormItems = computed<FormItem[]>(() => [
    {
      key: 'planCode',
      label: '套餐编码',
      type: 'input',
      props: { disabled: !!planForm.id }
    },
    { key: 'planName', label: '套餐名称', type: 'input' },
    {
      key: 'targetCustomer',
      label: '适用客户',
      type: 'input',
      props: { placeholder: '例如：适合单店 / 小型连锁' }
    },
    {
      key: 'coreBenefits',
      label: '核心权益',
      type: 'input',
      props: {
        type: 'textarea',
        rows: 4,
        placeholder: '每行一项，例如：\n全部基础经营功能\n3 家门店'
      }
    },
    {
      key: 'sortOrder',
      label: '展示排序',
      type: 'number',
      props: { min: 0, controlsPosition: 'right' }
    },
    {
      key: 'description',
      label: '说明',
      type: 'input',
      props: { type: 'textarea', rows: 2 }
    },
    {
      key: 'status',
      label: '状态',
      type: 'switch',
      props: { activeValue: 1, inactiveValue: 0, activeText: '启用', inactiveText: '停用' }
    },
    {
      key: 'recommended',
      label: '推荐套餐',
      type: 'switch',
      props: { activeValue: 1, inactiveValue: 0, activeText: '推荐', inactiveText: '普通' }
    }
  ])
  const addonFormItems = computed<FormItem[]>(() => [
    {
      key: 'addonCode',
      label: '编码',
      type: 'input',
      props: { disabled: !!addonForm.id }
    },
    { key: 'addonName', label: '名称', type: 'input' },
    {
      key: 'monthlyPrice',
      label: '月付价格',
      type: 'number',
      props: { min: 0, precision: 2, controlsPosition: 'right' }
    },
    {
      key: 'yearlyPrice',
      label: '年付价格',
      type: 'number',
      props: { min: 0, precision: 2, controlsPosition: 'right' }
    },
    {
      key: 'sortOrder',
      label: '展示排序',
      type: 'number',
      props: { min: 0, controlsPosition: 'right' }
    },
    {
      key: 'maxQuantity',
      label: '最大购买数',
      type: 'number',
      props: { min: 1, controlsPosition: 'right' }
    },
    {
      key: 'description',
      label: '说明',
      type: 'input',
      props: { type: 'textarea', rows: 2 }
    },
    {
      key: 'status',
      label: '状态',
      type: 'switch',
      props: { activeValue: 1, inactiveValue: 0, activeText: '启用', inactiveText: '停用' }
    }
  ])
  const subscriptionFormItems = computed<FormItem[]>(() => [
    {
      key: 'planVersionId',
      label: '套餐版本',
      type: 'select',
      props: { filterable: true, options: versionOptions.value, placeholder: '请选择套餐版本' }
    },
    {
      key: 'status',
      label: '订阅状态',
      type: 'select',
      props: {
        options: [
          { label: '生效', value: 'ACTIVE' },
          { label: '试用', value: 'TRIALING' },
          { label: '宽限期', value: 'GRACE' },
          { label: '暂停', value: 'SUSPENDED' }
        ]
      }
    },
    {
      key: 'billingCycle',
      label: '计费方式',
      type: 'select',
      props: {
        options: [
          { label: '月付', value: 'MONTHLY' },
          { label: '年付', value: 'YEARLY' },
          { label: '自定义', value: 'CUSTOM' }
        ]
      }
    },
    {
      key: 'currentPeriodStart',
      label: '周期开始',
      type: 'datetime',
      props: { valueFormat: 'YYYY-MM-DDTHH:mm:ss', placeholder: '请选择开始时间' }
    },
    {
      key: 'currentPeriodEnd',
      label: '周期结束',
      type: 'datetime',
      hidden: subscriptionForm.billingCycle !== 'CUSTOM',
      props: { valueFormat: 'YYYY-MM-DDTHH:mm:ss', placeholder: '请选择结束时间' }
    }
  ])
  const tenantAddonFormItems = computed<FormItem[]>(() => [
    {
      key: 'addonId',
      label: '加购项',
      type: 'select',
      props: {
        options: activeAddons.value.map((item) => ({ label: item.addonName, value: item.id })),
        placeholder: '请选择加购项'
      }
    },
    {
      key: 'quantity',
      label: '数量',
      type: 'number',
      props: { min: 1, controlsPosition: 'right' }
    }
  ])
  const overrideFormItems = computed<FormItem[]>(() => {
    const feature = selectedOverrideFeature.value
    const operationOptions = feature
      ? feature.featureType === 'BOOLEAN'
        ? [
            { label: '启用', value: 'ENABLE' },
            { label: '禁用', value: 'DISABLE' }
          ]
        : isNumericType(feature.featureType)
          ? [
              { label: '增加额度', value: 'ADD' },
              { label: '设置值', value: 'SET' }
            ]
          : [{ label: '设置值', value: 'SET' }]
      : []
    return [
      {
        key: 'featureId',
        label: '功能',
        type: 'select',
        props: {
          filterable: true,
          options: features.value.filter((item) => item.status === 1).map((item) => ({
            label: `${item.featureName} · ${item.featureCode}`,
            value: item.id
          })),
          onChange: resetOverrideOperation
        }
      },
      { key: 'operation', label: '操作', type: 'select', props: { options: operationOptions } },
      {
        key: 'quotaValue',
        label: '额度',
        type: 'number',
        hidden:
          !['ADD', 'SET'].includes(overrideForm.operation) || !isNumericType(feature?.featureType),
        props: { min: 0, controlsPosition: 'right' }
      },
      {
        key: 'textValue',
        label: '设置值',
        type: 'input',
        hidden:
          overrideForm.operation !== 'SET' ||
          !['STRING', 'ENUM'].includes(feature?.featureType || '')
      },
      {
        key: 'reason',
        label: '原因',
        type: 'input',
        props: { type: 'textarea', rows: 2 }
      },
      {
        key: 'effectiveRange',
        label: '有效期',
        type: 'datetimerange',
        props: {
          valueFormat: 'YYYY-MM-DDTHH:mm:ss',
          startPlaceholder: '立即生效',
          endPlaceholder: '长期有效'
        }
      }
    ]
  })
  type BenefitRow = {
    kind: 'base' | 'value'
    featureCode: string
    featureName: string
    description?: string
    source?: SaasDisplayFeature
  }
  type BenefitGroup = {
    kind: 'base' | 'value'
    moduleCode: string
    moduleName: string
    icon: string
    rows: BenefitRow[]
  }
  const moduleIcons: Record<string, string> = {
    store: 'ri:store-2-line',
    ordering: 'ri:restaurant-2-line',
    member: 'ri:user-heart-line',
    marketing: 'ri:megaphone-line',
    report: 'ri:bar-chart-box-line'
  }
  const benefitGroups = computed<BenefitGroup[]>(() => {
    const groups = new Map<string, BenefitGroup>()
    displayFeatures.value
      .filter((item) => item.status === 1)
      .forEach((item) => {
        if (!groups.has(item.moduleCode)) {
          groups.set(item.moduleCode, {
            kind: 'base',
            moduleCode: item.moduleCode,
            moduleName: item.moduleName,
            icon: moduleIcons[item.moduleCode] || 'ri:apps-2-line',
            rows: []
          })
        }
        groups.get(item.moduleCode)!.rows.push({
          kind: 'base',
          featureCode: item.featureCode,
          featureName: item.featureName,
          description: item.description,
          source: item
        })
      })
    return [
      {
        kind: 'value',
        moduleCode: 'value-added',
        moduleName: '增值权益',
        icon: 'ri:vip-diamond-line',
        rows: [
          {
            kind: 'value',
            featureCode: 'store_count',
            featureName: '门店数量上限',
            description: '租户可创建并管理的门店总数，新增门店时由服务端强制校验'
          }
        ]
      },
      ...groups.values()
    ]
  })
  type ComparisonRow = BenefitRow & {
    moduleName: string
    moduleKind: BenefitGroup['kind']
  }
  const comparisonRows = computed<ComparisonRow[]>(() =>
    benefitGroups.value.flatMap((group) =>
      group.rows.map((row) => ({
        ...row,
        moduleName: group.moduleName,
        moduleKind: group.kind
      }))
    )
  )
  const {
    data: comparisonTableData,
    columns: comparisonColumns,
    resetColumns: resetComparisonColumns
  } = useTable({
    core: {
      dataSource: () => comparisonRows.value,
      columnsFactory: () => [
        { prop: 'moduleName', label: '功能模块', minWidth: 140, fixed: 'left' },
        {
          prop: 'comparisonFeature',
          label: '功能说明',
          minWidth: 260,
          fixed: 'left',
          useSlot: true
        },
        ...plans.value.map((plan) => ({
          prop: `plan_${String(plan.id)}`,
          label: `${plan.planName}${plan.recommended === 1 ? '（推荐）' : ''}`,
          minWidth: 135,
          align: 'center',
          formatter: (row: ComparisonRow) =>
            row.kind === 'base'
              ? h('span', { class: 'included-mark', title: '全部套餐共同拥有' }, '✓')
              : h(
                  ElButton,
                  {
                    link: true,
                    type: 'primary',
                    class: 'quota-value',
                    onClick: () => editPlanEntitlement(plan)
                  },
                  () => `${planStoreQuota(plan)}  编辑`
                )
        })),
        {
          prop: 'comparisonAction',
          label: actionLabel,
          width: 105,
          fixed: 'right',
          align: 'center',
          useSlot: true
        }
      ]
    }
  })

  function replace<T extends object>(target: T, value: T) {
    Object.keys(target).forEach((key) => delete (target as Record<string, unknown>)[key])
    Object.assign(target, value)
  }
  function formatLocal(date: Date) {
    const offset = date.getTimezoneOffset() * 60000
    return new Date(date.getTime() - offset).toISOString().slice(0, 19)
  }
  function shortDateTime(value?: string) {
    return value ? value.replace('T', ' ').slice(0, 16) : '-'
  }
  async function refresh() {
    loading.value = true
    try {
      const [featureRows, displayRows, planRows, addonRows, tenantPage] = await Promise.all([
        listSaasFeatures(),
        listSaasDisplayFeatures(),
        listSaasPlans(),
        listSaasAddons(),
        listTenants({ currentPage: 1, pageSize: 200 })
      ])
      features.value = featureRows
      displayFeatures.value = displayRows
      plans.value = planRows
      resetComparisonColumns?.()
      addons.value = addonRows
      tenants.value = tenantPage.records
      const entries = await Promise.all(
        planRows
          .filter((item) => item.id)
          .map(async (item) => [String(item.id), await listPlanVersions(item.id!)] as const)
      )
      versions.value = Object.fromEntries(entries)
      const entitlementEntries = await Promise.all(
        planRows.map(async (plan) => {
          const version = comparisonVersion(plan)
          return version
            ? ([String(version.id), await listPlanEntitlements(version.id)] as const)
            : ([String(plan.id), []] as const)
        })
      )
      comparisonEntitlements.value = Object.fromEntries(entitlementEntries)
      if (!selectedPlanId.value && planRows[0]?.id) selectedPlanId.value = planRows[0].id
    } finally {
      loading.value = false
    }
  }
  function openDisplayFeature(row?: SaasDisplayFeature) {
    replace(displayFeatureForm, { ...displayFeatureDefaults(), ...(row || {}) })
    displayFeatureVisible.value = true
  }
  async function submitDisplayFeature() {
    if (
      !displayFeatureForm.moduleCode ||
      !displayFeatureForm.moduleName ||
      !displayFeatureForm.featureCode ||
      !displayFeatureForm.featureName
    ) {
      return ElMessage.warning('请完整填写模块和功能信息')
    }
    saving.value = true
    try {
      await saveSaasDisplayFeature({ ...displayFeatureForm })
      displayFeatureVisible.value = false
      await refresh()
      ElMessage.success('基础功能展示信息已保存')
    } finally {
      saving.value = false
    }
  }
  async function toggleDisplayFeature(row: SaasDisplayFeature) {
    await saveSaasDisplayFeature({ ...row, status: row.status === 1 ? 0 : 1 })
    await refresh()
    ElMessage.success(row.status === 1 ? '该基础功能已停止展示' : '该基础功能已重新展示')
  }
  function openFeature(row?: SaasFeature) {
    replace(featureForm, { ...featureDefaults(), ...(row || {}) })
    featureVisible.value = true
  }
  async function submitFeature() {
    if (!featureForm.featureCode || !featureForm.featureName)
      return ElMessage.warning('请填写功能编码和名称')
    saving.value = true
    try {
      await saveSaasFeature({ ...featureForm })
      featureVisible.value = false
      await refresh()
      ElMessage.success('增值服务已保存')
    } finally {
      saving.value = false
    }
  }
  function openPlan(row?: SaasPlan) {
    replace(planForm, { ...planDefaults(), ...(row || {}) })
    planVisible.value = true
  }
  async function submitPlan() {
    if (!planForm.planCode || !planForm.planName) return ElMessage.warning('请填写套餐编码和名称')
    saving.value = true
    try {
      const row = await saveSaasPlan({ ...planForm })
      planVisible.value = false
      selectedPlanId.value = row.id
      await refresh()
      ElMessage.success('套餐已保存')
    } finally {
      saving.value = false
    }
  }
  function selectPlan(row: SaasPlan) {
    selectedPlanId.value = row.id
  }
  function openVersionHistory(plan: SaasPlan) {
    selectPlan(plan)
    versionHistoryVisible.value = true
  }
  async function setRecommended(plan: SaasPlan) {
    if (plan.recommended === 1) return ElMessage.info('当前已经是推荐套餐')
    await saveSaasPlan({ ...plan, recommended: 1 })
    await refresh()
    ElMessage.success(`已将“${plan.planName}”设为推荐套餐`)
  }
  async function editPlanEntitlement(plan: SaasPlan) {
    if (!storeFeatureExists.value) {
      return ElMessage.warning('请先登记“可管理门店数”增值服务')
    }
    const rows = versions.value[String(plan.id)] || []
    const draft = rows.find((item) => item.status === 'DRAFT')
    if (draft) return configurePlanVersion(draft)
    const source = comparisonVersion(plan)
    const created = await createPlanVersion(plan.id!, source?.id)
    await refresh()
    ElMessage.success(source ? '已基于当前生效版本创建可编辑草稿' : '已创建首个套餐草稿')
    await configurePlanVersion(created)
  }
  async function createVersion(plan: SaasPlan) {
    const source = (versions.value[String(plan.id)] || [])[0]
    await createPlanVersion(plan.id!, source?.id)
    selectedPlanId.value = plan.id
    await refresh()
    ElMessage.success(source ? '已复制上一版本为新草稿' : '套餐草稿已创建')
  }
  async function configurePlanVersion(version: SaasPlanVersion) {
    versionHistoryVisible.value = false
    editingVersion.value = version
    const rules = await listPlanEntitlements(version.id)
    const byFeature = new Map(rules.map((row) => [String(row.featureId), row]))
    planRuleRows.value = features.value.filter((feature) => feature.status === 1).map((feature) => ({
      ...feature,
      featureId: feature.id!,
      enabled: byFeature.get(String(feature.id))?.enabled === 1,
      unlimited: byFeature.get(String(feature.id))?.unlimited === 1,
      quotaValue: byFeature.get(String(feature.id))?.quotaValue ?? feature.defaultValue ?? 0,
      textValue: byFeature.get(String(feature.id))?.textValue ?? feature.defaultTextValue ?? '',
      resetPeriod: byFeature.get(String(feature.id))?.resetPeriod || 'NONE',
      enforcement: byFeature.get(String(feature.id))?.enforcement || 'HARD'
    }))
    planRulesVisible.value = true
  }
  async function submitPlanRules() {
    if (!editingVersion.value) return
    saving.value = true
    try {
      await savePlanVersion(editingVersion.value.id, {
        monthlyPrice: editingVersion.value.monthlyPrice,
        yearlyPrice: editingVersion.value.yearlyPrice,
        currency: editingVersion.value.currency || 'CNY'
      })
      await savePlanEntitlements(
        editingVersion.value.id,
        planRuleRows.value.map((row) => ({
          featureId: row.featureId,
          enabled: row.enabled ? 1 : 0,
          unlimited: row.unlimited ? 1 : 0,
          quotaValue: isNumericType(row.featureType) && !row.unlimited ? row.quotaValue : null,
          textValue: ['STRING', 'ENUM'].includes(row.featureType) ? row.textValue : null,
          resetPeriod: isNumericType(row.featureType) ? row.resetPeriod : 'NONE',
          enforcement: row.enforcement
        }))
      )
      planRulesVisible.value = false
      await refresh()
      ElMessage.success('套餐权益已保存')
    } finally {
      saving.value = false
    }
  }
  async function publishVersion(version: SaasPlanVersion) {
    await ElMessageBox.confirm(
      `发布 v${version.versionNo} 后不可修改，确认继续？`,
      '发布套餐版本',
      { type: 'warning' }
    )
    await publishPlanVersion(version.id)
    await refresh()
    ElMessage.success('套餐版本已发布')
  }
  async function removeDraftVersion(version: SaasPlanVersion) {
    await ElMessageBox.confirm(
      `确认删除草稿 v${version.versionNo}？草稿中的价格和权益配置也会一并删除。`,
      '删除套餐草稿',
      { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' }
    )
    await deletePlanVersion(version.id)
    await refresh()
    ElMessage.success('套餐草稿已删除')
  }
  function openAddon(row?: SaasAddon) {
    replace(addonForm, { ...addonDefaults(), ...(row || {}) })
    addonVisible.value = true
  }
  async function submitAddon() {
    if (!addonForm.addonCode || !addonForm.addonName)
      return ElMessage.warning('请填写加购项编码和名称')
    saving.value = true
    try {
      await saveSaasAddon({ ...addonForm })
      addonVisible.value = false
      await refresh()
      ElMessage.success('加购项已保存')
    } finally {
      saving.value = false
    }
  }
  async function configureAddon(addon: SaasAddon) {
    editingAddon.value = addon
    const rules = await listAddonEntitlements(addon.id!)
    const byFeature = new Map(rules.map((row) => [String(row.featureId), row]))
    addonRuleRows.value = features.value.map((feature) => ({
      ...feature,
      featureId: feature.id!,
      included: byFeature.has(String(feature.id)),
      operation:
        byFeature.get(String(feature.id))?.operation ||
        (feature.featureType === 'BOOLEAN'
          ? 'ENABLE'
          : isNumericType(feature.featureType)
            ? 'ADD'
            : 'SET'),
      quotaValue: byFeature.get(String(feature.id))?.quotaValue ?? 1,
      textValue: byFeature.get(String(feature.id))?.textValue ?? ''
    }))
    addonRulesVisible.value = true
  }
  async function submitAddonRules() {
    if (!editingAddon.value?.id) return
    saving.value = true
    try {
      await saveAddonEntitlements(
        editingAddon.value.id,
        addonRuleRows.value
          .filter((row) => row.included)
          .map((row) => ({
            featureId: row.featureId,
            operation: row.operation,
            quotaValue:
              row.operation === 'ENABLE' || !isNumericType(row.featureType) ? null : row.quotaValue,
            textValue:
              row.operation === 'SET' && ['STRING', 'ENUM'].includes(row.featureType)
                ? row.textValue
                : null
          }))
      )
      addonRulesVisible.value = false
      ElMessage.success('加购权益已保存')
    } finally {
      saving.value = false
    }
  }
  let tenantLoadRequestId = 0
  async function loadTenant() {
    if (!tenantId.value) return
    const requestId = ++tenantLoadRequestId
    const selectedTenantId = tenantId.value
    tenantState.value = { tenantId: selectedTenantId, features: {} }
    tenantSubscriptions.value = []
    tenantAddons.value = []
    tenantOverrides.value = []
    tenantLoading.value = true
    try {
      const state = await getTenantEntitlements(selectedTenantId)
      if (requestId !== tenantLoadRequestId || String(tenantId.value) !== String(selectedTenantId)) return
      tenantState.value = state
      const subscriptionRows = await listTenantSubscriptions(selectedTenantId)
      if (requestId !== tenantLoadRequestId || String(tenantId.value) !== String(selectedTenantId)) return
      tenantSubscriptions.value = subscriptionRows
      const [addOnRows, overrideRows] = await Promise.all([
        listTenantAddons(selectedTenantId),
        listTenantOverrides(selectedTenantId)
      ])
      if (requestId !== tenantLoadRequestId || String(tenantId.value) !== String(selectedTenantId)) return
      tenantAddons.value = addOnRows
      tenantOverrides.value = overrideRows
    } finally {
      if (requestId === tenantLoadRequestId && String(tenantId.value) === String(selectedTenantId)) tenantLoading.value = false
    }
  }
  function openSubscription() {
    const start = new Date()
    replace(subscriptionForm, {
      planVersionId: versionOptions.value[0]?.value || '',
      status: 'ACTIVE',
      billingCycle: 'MONTHLY',
      currentPeriodStart: formatLocal(start),
      currentPeriodEnd: undefined
    })
    subscriptionVisible.value = true
  }
  async function submitSubscription() {
    if (!tenantId.value || !subscriptionForm.planVersionId)
      return ElMessage.warning('请选择套餐版本')
    saving.value = true
    try {
      await assignTenantSubscription(tenantId.value, {
        ...subscriptionForm,
        currentPeriodEnd:
          subscriptionForm.billingCycle === 'CUSTOM' ? subscriptionForm.currentPeriodEnd : undefined
      })
      subscriptionVisible.value = false
      await loadTenant()
      ElMessage.success('租户套餐已生效')
    } finally {
      saving.value = false
    }
  }
  function openTenantAddon() {
    replace(tenantAddonForm, { addonId: activeAddons.value[0]?.id || '', quantity: 1 })
    tenantAddonVisible.value = true
  }
  async function submitTenantAddon() {
    if (!tenantId.value || !tenantAddonForm.addonId) return
    saving.value = true
    try {
      await addTenantAddon(tenantId.value, { ...tenantAddonForm })
      tenantAddonVisible.value = false
      await loadTenant()
      ElMessage.success('加购项已生效')
    } finally {
      saving.value = false
    }
  }
  async function cancelAddon(row: SubscriptionAddon) {
    if (!tenantId.value || !row.id) return
    await ElMessageBox.confirm('确认取消该加购项？', '取消加购')
    await cancelTenantAddon(tenantId.value, row.id)
    await loadTenant()
  }
  function openOverride() {
    const feature = features.value[0]
    replace(overrideForm, {
      featureId: feature?.id || '',
      operation: operationForFeature(feature),
      quotaValue: 1,
      textValue: '',
      reason: '',
      effectiveRange: undefined
    })
    overrideVisible.value = true
  }
  function operationForFeature(feature?: SaasFeature): EntitlementOverride['operation'] {
    if (feature?.featureType === 'BOOLEAN') return 'ENABLE'
    if (isNumericType(feature?.featureType)) return 'ADD'
    return 'SET'
  }
  function resetOverrideOperation() {
    overrideForm.operation = operationForFeature(selectedOverrideFeature.value)
  }
  async function submitOverride() {
    if (!tenantId.value || !overrideForm.featureId || !overrideForm.reason)
      return ElMessage.warning('请选择功能并填写调整原因')
    saving.value = true
    try {
      const { effectiveRange, ...payload } = overrideForm
      await addTenantOverride(tenantId.value, {
        ...payload,
        effectiveFrom: effectiveRange?.[0],
        effectiveTo: effectiveRange?.[1]
      })
      overrideVisible.value = false
      await loadTenant()
      ElMessage.success('特殊权益已生效')
    } finally {
      saving.value = false
    }
  }
  async function removeOverride(row: EntitlementOverride) {
    if (!tenantId.value || !row.id) return
    await ElMessageBox.confirm('删除后会立即重新计算最终权益，确认？', '删除调整')
    await deleteTenantOverride(tenantId.value, row.id)
    await loadTenant()
  }
  function comparisonVersion(plan: SaasPlan) {
    const rows = versions.value[String(plan.id)] || []
    return rows.find((item) => item.status === 'PUBLISHED') || rows[0]
  }
  function comparisonRule(plan: SaasPlan, featureCode: string) {
    const version = comparisonVersion(plan)
    const feature = features.value.find((item) => item.featureCode === featureCode)
    if (!version || !feature?.id) return undefined
    return comparisonEntitlements.value[String(version.id)]?.find(
      (item) => String(item.featureId) === String(feature.id)
    )
  }
  function planStoreQuota(plan: SaasPlan) {
    const rule = comparisonRule(plan, 'store_count')
    if (!rule || rule.enabled !== 1) return '—'
    if (rule.unlimited === 1) return '不限'
    return rule.quotaValue == null ? '—' : `${rule.quotaValue} 家`
  }
  function monthlyPrice(plan: SaasPlan) {
    const value = comparisonVersion(plan)?.monthlyPrice
    if (value == null) return '—'
    return Number(value).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
  }
  function yearlyPrice(plan: SaasPlan) {
    const value = comparisonVersion(plan)?.yearlyPrice
    if (value == null) return '—'
    return Number(value).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
  }
  function versionLabel(plan: SaasPlan) {
    const version = comparisonVersion(plan)
    return version ? `当前 v${version.versionNo}` : '待创建版本'
  }
  function planBenefits(plan: SaasPlan) {
    const benefits = (plan.coreBenefits || '')
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean)
    return benefits.length ? benefits : ['全部基础经营功能', `门店上限：${planStoreQuota(plan)}`]
  }
  function planTone(plan: SaasPlan, index: number) {
    const key = `${plan.planCode} ${plan.planName}`.toLowerCase()
    if (key.includes('free') || key.includes('免费')) return 'blue'
    if (key.includes('basic') || key.includes('standard') || key.includes('标准')) return 'orange'
    if (key.includes('pro') || key.includes('专业')) return 'purple'
    if (key.includes('chain') || key.includes('enterprise') || key.includes('企业')) return 'gold'
    return ['blue', 'orange', 'purple', 'gold'][index % 4]
  }
  function planImage(plan: SaasPlan, index: number) {
    return {
      blue: freePlanImage,
      orange: standardPlanImage,
      purple: proPlanImage,
      gold: enterprisePlanImage
    }[planTone(plan, index)]
  }
  function featureName(id: Id) {
    return features.value.find((item) => String(item.id) === String(id))?.featureName || String(id)
  }
  function addonName(id: Id) {
    return addons.value.find((item) => String(item.id) === String(id))?.addonName || String(id)
  }
  function quotaText(row: EffectiveEntitlementItem) {
    if (row.featureType === 'BOOLEAN') return '—'
    if (['STRING', 'ENUM'].includes(row.featureType)) return row.textValue || '—'
    if (row.unlimited) return '不限量'
    return row.limit ?? 0
  }
  function isNumericType(type?: string) {
    return type === 'NUMBER' || type === 'QUOTA'
  }
  onMounted(refresh)
</script>

<style scoped>
  .saas-page {
    --saas-blue: #1769ff;
    --saas-navy: #112044;
    --el-component-size: 30px;

    min-height: 100%;
    font-size: 13px;
    color: var(--saas-navy);
  }

  .saas-page :deep(.el-button) {
    padding-right: 13px;
    padding-left: 13px;
  }

  .page-hero {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 96px;
    padding: 15px 20px;
    overflow: hidden;
    background:
      radial-gradient(circle at 86% 20%, rgb(117 165 255 / 28%), transparent 28%),
      linear-gradient(120deg, #f7faff 0%, #eef5ff 58%, #f8fbff 100%);
    border: 1px solid #e4edfb;
    border-radius: 14px 14px 0 0;
  }

  .page-hero::after {
    position: absolute;
    right: 5%;
    bottom: -68px;
    width: 220px;
    height: 150px;
    content: '';
    background: linear-gradient(135deg, rgb(43 118 255 / 9%), rgb(111 77 255 / 10%));
    border-radius: 50%;
    transform: rotate(-12deg);
  }

  .hero-copy,
  .hero-actions {
    position: relative;
    z-index: 1;
  }

  .hero-eyebrow {
    font-size: 11px;
    font-weight: 800;
    color: #4b7bd8;
    letter-spacing: 0.14em;
  }

  .hero-copy h2 {
    margin: 3px 0;
    font-size: 20px;
    line-height: 1.3;
  }

  .hero-copy > p,
  .section-heading p {
    color: #65718b;
  }

  .hero-legend {
    display: flex;
    gap: 18px;
    margin-top: 8px;
    font-size: 11px;
    color: #65718b;
  }

  .hero-legend span,
  .hero-actions,
  .toolbar,
  .tenant-picker {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .legend-dot.base {
    background: #21b678;
    box-shadow: 0 0 0 4px rgb(33 182 120 / 12%);
  }

  .legend-dot.value {
    background: #7867ec;
    box-shadow: 0 0 0 4px rgb(120 103 236 / 12%);
  }

  .management-tabs {
    padding: 0 14px 16px;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-top: 0;
    border-radius: 0 0 14px 14px;
  }

  .management-tabs :deep(.el-tabs__header) {
    margin-bottom: 12px;
  }

  .management-tabs :deep(.el-tabs__item) {
    height: 40px;
    padding: 0 15px;
    font-size: 13px;
    font-weight: 600;
  }

  .plan-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(210px, 1fr));
    gap: 10px;
    min-height: 230px;
  }

  .plan-card {
    position: relative;
    display: flex;
    flex-direction: column;
    min-height: 314px;
    overflow: hidden;
    background: var(--el-bg-color);
    border: 1px solid #e4e9f2;
    border-radius: 11px;
    box-shadow: 0 8px 24px rgb(45 75 125 / 6%);
    transition: 0.2s ease;
  }

  .plan-card:hover {
    border-color: var(--plan-color);
    box-shadow: 0 14px 32px rgb(37 69 122 / 12%);
    transform: translateY(-2px);
  }

  .plan-card.disabled {
    filter: grayscale(0.65);
    opacity: 0.72;
  }

  .tone-blue {
    --plan-color: #2783f5;
    --plan-soft: #eff7ff;
  }

  .tone-orange {
    --plan-color: #f49334;
    --plan-soft: #fff7ea;
  }

  .tone-purple {
    --plan-color: #7356e8;
    --plan-soft: #f3f0ff;
  }

  .tone-gold {
    --plan-color: #e4a22b;
    --plan-soft: #fff8e9;
  }

  .recommend-ribbon {
    position: absolute;
    top: 0;
    right: 12px;
    z-index: 2;
    display: flex;
    gap: 4px;
    align-items: center;
    padding: 4px 8px 5px;
    font-size: 10px;
    font-weight: 700;
    color: white;
    background: var(--plan-color);
    border-radius: 0 0 8px 8px;
  }

  .plan-visual {
    padding: 12px 13px 8px;
    background: linear-gradient(145deg, var(--plan-soft), var(--el-bg-color));
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .plan-heading,
  .plan-name-row,
  .price-line,
  .quota-pill,
  .plan-actions {
    display: flex;
    align-items: center;
  }

  .plan-heading {
    justify-content: space-between;
    min-height: 56px;
  }

  .plan-heading img {
    width: 60px;
    height: 60px;
    object-fit: contain;
    filter: drop-shadow(0 8px 10px rgb(25 62 119 / 13%));
  }

  .plan-name-row {
    gap: 7px;
  }

  .plan-name-row h3 {
    margin: 0;
    font-size: 16px;
  }

  .plan-heading p,
  .plan-description {
    margin-top: 3px;
    font-size: 11px;
    color: #65718b;
  }

  .plan-description {
    color: var(--plan-color);
  }

  .plan-body {
    flex: 1;
    padding: 10px 13px;
  }

  .price-line {
    color: #7c879e;
  }

  .price-line .currency {
    margin-right: 2px;
    font-weight: 700;
    color: var(--saas-navy);
  }

  .price-line strong {
    font-size: 22px;
    color: var(--saas-navy);
  }

  .price-line small {
    margin-left: auto;
    font-size: 11px;
    color: #9aa4b8;
  }

  .yearly-price {
    display: flex;
    gap: 5px;
    align-items: baseline;
    margin-top: 2px;
    font-size: 11px;
    color: #8b95a8;
  }

  .yearly-price b {
    font-size: 13px;
    color: #53617a;
  }

  .quota-pill {
    gap: 7px;
    padding: 6px 8px;
    margin: 8px 0;
    font-size: 11px;
    color: #5e6c86;
    background: var(--plan-soft);
    border-radius: 9px;
  }

  .quota-pill b {
    margin-left: auto;
    color: var(--plan-color);
  }

  .benefit-list {
    padding: 0;
    margin: 0;
    list-style: none;
  }

  .benefit-list li {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-top: 5px;
    font-size: 11px;
    color: #46536d;
  }

  .check,
  .included-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: white;
    background: var(--plan-color);
    border-radius: 50%;
  }

  .check {
    width: 15px;
    height: 15px;
  }

  .plan-actions {
    gap: 6px;
    padding: 8px 10px;
    border-top: 1px solid var(--el-border-color-lighter);
  }

  .plan-actions .el-button:nth-child(1),
  .plan-actions .el-button:nth-child(2) {
    flex: 1;
    margin: 0;
  }

  .section-heading,
  .section-heading > div {
    display: flex;
    align-items: center;
  }

  .section-heading {
    justify-content: space-between;
    margin-bottom: 10px;
  }

  .section-heading > div {
    gap: 12px;
  }

  .section-heading h3 {
    margin: 0 0 4px;
    font-size: 15px;
  }

  .section-heading p {
    font-size: 12px;
  }

  .section-icon {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    font-size: 15px;
    color: var(--saas-blue);
    background: #eef5ff;
    border-radius: 10px;
  }

  .comparison-wrap {
    overflow: hidden;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 12px;
  }

  .feature-cell {
    text-align: left !important;
  }

  .feature-cell b,
  .feature-cell span {
    display: block;
  }

  .feature-cell span {
    margin-top: 4px;
    font-size: 12px;
    color: #8a95a8;
  }

  .included-mark {
    width: 22px;
    height: 22px;
    color: white;
    background: #19ae73;
  }

  .quota-value {
    padding: 5px 9px;
    font-weight: 700;
    color: #33415c;
    cursor: pointer;
    background: transparent;
    border: 0;
    border-radius: 7px;
  }

  .quota-value:hover {
    color: var(--saas-blue);
    background: #eff5ff;
  }

  .row-action {
    font-size: 12px;
    color: #9aa4b6;
  }

  .advanced-config {
    margin-top: 16px;
  }

  .display-feature-manager {
    padding: 11px;
    margin-top: 11px;
    background: var(--el-fill-color-extra-light);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 10px;
  }

  .subsection-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  .subsection-heading h4,
  .subsection-heading p {
    margin: 0;
  }

  .subsection-heading h4 {
    font-size: 14px;
  }

  .subsection-heading p {
    margin-top: 3px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .collapse-title {
    display: flex;
    gap: 8px;
    align-items: center;
    font-weight: 600;
  }

  .notice,
  .dialog-alert {
    margin-bottom: 12px;
  }

  .toolbar {
    justify-content: flex-end;
    margin-bottom: 10px;
  }

  .source-tag {
    margin: 2px 4px 2px 0;
  }

  .tenant-workspace {
    display: grid;
    gap: 12px;
    padding: 2px;
    background: #f5f8fc;
    border-radius: 12px;
  }

  .tenant-toolbar-panel,
  .tenant-panel {
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 10px;
    box-shadow: 0 4px 14px rgb(41 72 122 / 4%);
  }

  .tenant-toolbar-panel {
    display: flex;
    gap: 18px;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
  }

  .tenant-picker {
    flex: 1;
    min-width: 280px;
  }

  .tenant-picker-label {
    flex: none;
    font-weight: 600;
    color: #3f4d67;
  }

  .tenant-select {
    width: min(430px, 100%);
  }

  .tenant-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .tenant-panel {
    padding: 13px 14px;
  }

  .tenant-empty-panel {
    display: grid;
    place-items: center;
    min-height: 280px;
  }

  .tenant-section-heading,
  .tenant-section-heading > div,
  .tenant-metric {
    display: flex;
    align-items: center;
  }

  .tenant-section-heading {
    justify-content: space-between;
    margin-bottom: 11px;
  }

  .tenant-section-heading > div {
    gap: 9px;
  }

  .tenant-section-heading h3,
  .tenant-section-heading p {
    margin: 0;
  }

  .tenant-section-heading h3 {
    font-size: 15px;
    color: #182744;
  }

  .tenant-section-heading p {
    margin-top: 2px;
    font-size: 11px;
    color: var(--el-text-color-secondary);
  }

  .tenant-heading-icon {
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    font-size: 17px;
    color: var(--saas-blue);
  }

  .tenant-metrics {
    display: grid;
    grid-template-columns: 0.9fr 0.9fr 0.9fr 1.4fr 0.9fr 0.9fr;
    gap: 9px;
  }

  .tenant-metric {
    min-width: 0;
    min-height: 72px;
    padding: 10px 11px;
    background: linear-gradient(135deg, var(--metric-soft), var(--el-bg-color));
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
  }

  .metric-icon {
    display: grid;
    flex: none;
    place-items: center;
    width: 34px;
    height: 34px;
    margin-right: 9px;
    font-size: 17px;
    color: var(--metric-color);
    background: var(--metric-icon-bg);
    border-radius: 50%;
  }

  .tenant-metric small,
  .tenant-metric strong,
  .tenant-metric span:not(.metric-icon) {
    display: block;
  }

  .tenant-metric small {
    margin-bottom: 5px;
    font-size: 11px;
    color: #7d899f;
  }

  .tenant-metric strong {
    overflow: hidden;
    font-size: 14px;
    line-height: 1.25;
    color: #1f2d49;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tenant-metric span:not(.metric-icon) {
    margin-top: 2px;
    font-size: 10px;
    color: #76839a;
  }

  .period-metric strong {
    font-size: 11px;
  }

  .metric-blue {
    --metric-color: #1971ee;
    --metric-icon-bg: #e7f1ff;
    --metric-soft: #f5f9ff;
  }

  .metric-purple {
    --metric-color: #7b3fed;
    --metric-icon-bg: #f0e8ff;
    --metric-soft: #faf7ff;
  }

  .metric-green {
    --metric-color: #16a866;
    --metric-icon-bg: #e5f8ed;
    --metric-soft: #f5fcf8;
  }

  .metric-indigo {
    --metric-color: #2f65db;
    --metric-icon-bg: #e9f0ff;
    --metric-soft: #f6f8ff;
  }

  .metric-orange {
    --metric-color: #ee861b;
    --metric-icon-bg: #fff0dd;
    --metric-soft: #fffaf3;
  }

  .metric-violet {
    --metric-color: #8950df;
    --metric-icon-bg: #f2eaff;
    --metric-soft: #fbf8ff;
  }

  .tenant-alert {
    margin-top: 10px;
  }

  .entitlement-panel :deep(.art-table),
  .tenant-bottom-grid :deep(.art-table) {
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 7px;
  }

  .tenant-bottom-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  @media (width <= 1280px) {
    .plan-grid {
      grid-template-columns: repeat(2, minmax(260px, 1fr));
    }

    .tenant-toolbar-panel {
      align-items: flex-start;
    }

    .tenant-actions {
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .tenant-metrics {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (width <= 760px) {
    .page-hero,
    .section-heading {
      flex-direction: column;
      gap: 20px;
      align-items: flex-start;
    }

    .hero-legend {
      flex-direction: column;
      gap: 8px;
      align-items: flex-start;
    }

    .management-tabs {
      padding: 0 12px 20px;
    }

    .plan-grid,
    .tenant-bottom-grid {
      grid-template-columns: 1fr;
    }

    .tenant-toolbar-panel,
    .tenant-picker {
      align-items: stretch;
    }

    .tenant-toolbar-panel {
      flex-direction: column;
      gap: 10px;
    }

    .tenant-picker {
      flex-direction: column;
      min-width: 0;
    }

    .tenant-select {
      width: 100%;
    }

    .tenant-actions {
      justify-content: flex-start;
    }

    .tenant-metrics {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
