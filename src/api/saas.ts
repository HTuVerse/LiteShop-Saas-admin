import request from '@/utils/http'
import type { Id } from '@/types/backend'

export interface SaasFeature {
  id?: Id
  featureCode: string
  featureName: string
  featureType: 'BOOLEAN' | 'NUMBER' | 'QUOTA' | 'STRING' | 'ENUM'
  unit?: string
  quotaMode?: 'RESOURCE' | 'PERIODIC' | 'RATE' | 'CONCURRENT'
  usageSource?: 'NONE' | 'COUNTER' | 'REALTIME'
  usageMetric?: string
  defaultValue?: number
  defaultTextValue?: string
  allowedValues?: string
  description?: string
  status: number
}
export interface SaasPlan {
  id?: Id
  planCode: string
  planName: string
  targetCustomer?: string
  coreBenefits?: string
  description?: string
  recommended?: number
  sortOrder?: number
  status: number
}
export interface SaasDisplayFeature {
  id?: Id
  moduleCode: string
  moduleName: string
  featureCode: string
  featureName: string
  description?: string
  sortOrder?: number
  status: number
}
export interface SaasPlanVersion {
  id: Id
  planId: Id
  versionNo: number
  monthlyPrice?: number | null
  yearlyPrice?: number | null
  currency?: string
  status: 'DRAFT' | 'PUBLISHED' | 'RETIRED'
  publishedAt?: string
}
export interface PlanEntitlement {
  id?: Id
  planVersionId?: Id
  featureId: Id
  enabled: number
  quotaValue?: number | null
  textValue?: string | null
  unlimited: number
  resetPeriod: 'NONE' | 'DAY' | 'MONTH' | 'BILLING_CYCLE'
  enforcement: 'HARD' | 'SOFT'
}
export interface SaasAddon {
  id?: Id
  addonCode: string
  addonName: string
  description?: string
  monthlyPrice?: number | null
  yearlyPrice?: number | null
  currency?: string
  maxQuantity: number
  sortOrder?: number
  status: number
}
export interface AddonEntitlement {
  id?: Id
  addonId?: Id
  featureId: Id
  operation: 'ENABLE' | 'ADD' | 'SET'
  quotaValue?: number | null
  textValue?: string | null
}
export interface TenantSubscription {
  id?: Id
  tenantId?: Id
  planVersionId: Id
  billingCycle?: 'MONTHLY' | 'YEARLY' | 'CUSTOM'
  autoRenew?: number
  status: string
  startAt?: string
  currentPeriodStart?: string
  currentPeriodEnd?: string
  trialEndAt?: string
  graceEndAt?: string
  externalSubscriptionId?: string
}
export interface SubscriptionAddon {
  id?: Id
  addonId: Id
  quantity: number
  status?: string
  startAt?: string
  endAt?: string
}
export interface EntitlementOverride {
  id?: Id
  featureId: Id
  operation: 'ENABLE' | 'DISABLE' | 'ADD' | 'SET'
  quotaValue?: number | null
  textValue?: string | null
  reason?: string
  effectiveFrom?: string
  effectiveTo?: string
}
export interface EffectiveEntitlementItem {
  featureId: Id
  featureCode: string
  featureName: string
  featureType: 'BOOLEAN' | 'NUMBER' | 'QUOTA' | 'STRING' | 'ENUM'
  unit?: string
  usageSource?: 'NONE' | 'COUNTER' | 'REALTIME'
  usageMetric?: string
  enabled: boolean
  unlimited: boolean
  limit?: number | null
  textValue?: string | null
  used?: number
  remaining?: number | null
  resetPeriod: string
  enforcement: string
  sources: string[]
}
export interface EffectiveEntitlements {
  tenantId: Id
  subscriptionId?: Id
  planCode?: string
  planName?: string
  planVersion?: number
  subscriptionStatus?: string
  periodStart?: string
  periodEnd?: string
  features: Record<string, EffectiveEntitlementItem>
}

const root = '/saas/admin'
export const getMyEntitlements = () =>
  request.get<EffectiveEntitlements>({ url: '/saas/entitlements/me' })
export const listSaasFeatures = () => request.get<SaasFeature[]>({ url: `${root}/features` })
export const saveSaasFeature = (data: SaasFeature) =>
  data.id
    ? request.put<SaasFeature>({ url: `${root}/features`, data })
    : request.post<SaasFeature>({ url: `${root}/features`, data })
export const listSaasDisplayFeatures = () =>
  request.get<SaasDisplayFeature[]>({ url: `${root}/display-features` })
export const saveSaasDisplayFeature = (data: SaasDisplayFeature) =>
  data.id
    ? request.put<SaasDisplayFeature>({ url: `${root}/display-features`, data })
    : request.post<SaasDisplayFeature>({ url: `${root}/display-features`, data })
export const listSaasPlans = () => request.get<SaasPlan[]>({ url: `${root}/plans` })
export const saveSaasPlan = (data: SaasPlan) =>
  data.id
    ? request.put<SaasPlan>({ url: `${root}/plans`, data })
    : request.post<SaasPlan>({ url: `${root}/plans`, data })
export const listPlanVersions = (planId: Id) =>
  request.get<SaasPlanVersion[]>({ url: `${root}/plans/${planId}/versions` })
export const createPlanVersion = (planId: Id, copyFromVersionId?: Id) =>
  request.post<SaasPlanVersion>({
    url: `${root}/plans/${planId}/versions`,
    params: { copyFromVersionId }
  })
export const savePlanVersion = (versionId: Id, data: Partial<SaasPlanVersion>) =>
  request.put<SaasPlanVersion>({ url: `${root}/plan-versions/${versionId}`, data })
export const deletePlanVersion = (versionId: Id) =>
  request.del<void>({ url: `${root}/plan-versions/${versionId}` })
export const listPlanEntitlements = (versionId: Id) =>
  request.get<PlanEntitlement[]>({ url: `${root}/plan-versions/${versionId}/entitlements` })
export const savePlanEntitlements = (versionId: Id, data: PlanEntitlement[]) =>
  request.put<PlanEntitlement[]>({
    url: `${root}/plan-versions/${versionId}/entitlements`,
    data
  })
export const publishPlanVersion = (versionId: Id) =>
  request.post<SaasPlanVersion>({ url: `${root}/plan-versions/${versionId}/publish` })
export const listSaasAddons = () => request.get<SaasAddon[]>({ url: `${root}/addons` })
export const saveSaasAddon = (data: SaasAddon) =>
  data.id
    ? request.put<SaasAddon>({ url: `${root}/addons`, data })
    : request.post<SaasAddon>({ url: `${root}/addons`, data })
export const listAddonEntitlements = (addonId: Id) =>
  request.get<AddonEntitlement[]>({ url: `${root}/addons/${addonId}/entitlements` })
export const saveAddonEntitlements = (addonId: Id, data: AddonEntitlement[]) =>
  request.put<AddonEntitlement[]>({ url: `${root}/addons/${addonId}/entitlements`, data })
export const listTenantSubscriptions = (tenantId: Id) =>
  request.get<TenantSubscription[]>({ url: `${root}/tenants/${tenantId}/subscriptions` })
export const assignTenantSubscription = (tenantId: Id, data: TenantSubscription) =>
  request.put<TenantSubscription>({ url: `${root}/tenants/${tenantId}/subscription`, data })
export const listTenantAddons = (tenantId: Id) =>
  request.get<SubscriptionAddon[]>({ url: `${root}/tenants/${tenantId}/addons` })
export const addTenantAddon = (tenantId: Id, data: SubscriptionAddon) =>
  request.post<SubscriptionAddon>({ url: `${root}/tenants/${tenantId}/addons`, data })
export const cancelTenantAddon = (tenantId: Id, id: Id) =>
  request.del({ url: `${root}/tenants/${tenantId}/addons/${id}` })
export const listTenantOverrides = (tenantId: Id) =>
  request.get<EntitlementOverride[]>({ url: `${root}/tenants/${tenantId}/overrides` })
export const addTenantOverride = (tenantId: Id, data: EntitlementOverride) =>
  request.post<EntitlementOverride>({ url: `${root}/tenants/${tenantId}/overrides`, data })
export const deleteTenantOverride = (tenantId: Id, id: Id) =>
  request.del({ url: `${root}/tenants/${tenantId}/overrides/${id}` })
export const getTenantEntitlements = (tenantId: Id) =>
  request.get<EffectiveEntitlements>({ url: `${root}/tenants/${tenantId}/entitlements` })
