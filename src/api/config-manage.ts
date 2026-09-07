import request from '@/utils/http'

// ==================== 轮播图管理 ====================

/**
 * 获取轮播图列表（管理端）
 */
export function fetchGetBannerList(params?: Api.Config.BannerSearchParams) {
  return request.get<Api.Config.Banner[]>({
    url: '/config/banner/admin/list',
    params
  })
}

/**
 * 获取轮播图详情
 */
export function fetchGetBannerById(id: number) {
  return request.get<Api.Config.Banner>({
    url: `/config/banner/admin/${id}`
  })
}

/**
 * 新增轮播图
 */
export function fetchAddBanner(data: Api.Config.BannerFormData) {
  return request.post({
    url: '/config/banner/admin/add',
    data
  })
}

/**
 * 更新轮播图
 */
export function fetchUpdateBanner(data: Api.Config.BannerFormData) {
  return request.put({
    url: '/config/banner/admin/update',
    data
  })
}

/**
 * 删除轮播图
 */
export function fetchDeleteBanner(id: number) {
  return request.del({
    url: `/config/banner/admin/delete/${id}`
  })
}

/**
 * 更新轮播图状态
 */
export function fetchUpdateBannerStatus(id: number, status: number) {
  return request.put({
    url: `/config/banner/admin/status/${id}`,
    data: null,
    params: { status }
  })
}

/**
 * 更新轮播图排序
 */
export function fetchUpdateBannerSort(id: number, sortOrder: number) {
  return request.put({
    url: `/config/banner/admin/sort/${id}`,
    data: null,
    params: { sortOrder }
  })
}

/**
 * 批量删除轮播图
 */
export function fetchBatchDeleteBanner(ids: number[]) {
  return request.del({
    url: '/config/banner/admin/batch-delete',
    data: ids
  })
}

// ==================== 系统配置管理 ====================

/**
 * 获取配置列表（管理端）
 */
export function fetchGetConfigList(params?: Api.Config.ConfigSearchParams) {
  return request.get<Api.Config.AppConfig[]>({
    url: '/config/app/admin/list',
    params
  })
}

/**
 * 获取配置详情
 */
export function fetchGetConfigById(id: number) {
  return request.get<Api.Config.AppConfig>({
    url: `/config/app/admin/${id}`
  })
}

/**
 * 根据配置键获取配置
 */
export function fetchGetConfigByKey(configKey: string) {
  return request.get<Api.Config.AppConfig>({
    url: `/config/app/admin/key/${configKey}`
  })
}

/**
 * 新增配置
 */
export function fetchAddConfig(data: Api.Config.ConfigFormData) {
  return request.post({
    url: '/config/app/admin/add',
    data
  })
}

/**
 * 更新配置
 */
export function fetchUpdateConfig(data: Api.Config.ConfigFormData) {
  return request.put({
    url: '/config/app/admin/update',
    data
  })
}

/**
 * 更新配置值（简化接口）
 */
export function fetchUpdateConfigValue(configKey: string, configValue: string) {
  return request.put({
    url: '/config/app/admin/update-value',
    params: { configKey, configValue }
  })
}

/**
 * 批量更新配置值
 */
export function fetchBatchUpdateConfig(configs: Record<string, string>) {
  return request.put({
    url: '/config/app/admin/batch-update',
    data: configs
  })
}

/**
 * 删除配置
 */
export function fetchDeleteConfig(id: number) {
  return request.del({
    url: `/config/app/admin/delete/${id}`
  })
}

/**
 * 刷新配置缓存
 */
export function fetchRefreshConfigCache() {
  return request.post({
    url: '/config/app/admin/refresh-cache'
  })
}

/**
 * 获取配置分组列表
 */
export function fetchGetConfigGroups() {
  return request.get<Api.Config.ConfigGroup[]>({
    url: '/config/app/admin/groups'
  })
}
// ==================== 部署配置相关 ====================

/**
 * 部署配置键名常量
 */
export const DEPLOY_CONFIG_KEYS = {
  H5_BASE_URL: 'h5_base_url',
  MINIAPP_BASE_URL: 'miniapp_base_url',
  MINIAPP_APPID: 'miniapp_appid',
  QRCODE_DEFAULT_PLATFORM: 'qrcode_default_platform',
  APP_LOGO: 'app_logo'
} as const

/**
 * 部署配置类型
 */
export interface DeployConfig {
  h5BaseUrl: string
  miniappBaseUrl: string
  miniappAppid: string
  qrcodeDefaultPlatform: 'h5' | 'miniapp'
  appLogo: string
}

/**
 * 获取部署配置（用于二维码生成等场景）
 */
export async function fetchGetDeployConfig(): Promise<DeployConfig> {
  const keys = Object.values(DEPLOY_CONFIG_KEYS)
  const res = await request.post<Record<string, string>>({
    url: '/config/app/values',
    data: keys
  })
  console.log('[部署配置] API 返回:', res, typeof res)

  return {
    h5BaseUrl: res?.[DEPLOY_CONFIG_KEYS.H5_BASE_URL] || '',
    miniappBaseUrl: res?.[DEPLOY_CONFIG_KEYS.MINIAPP_BASE_URL] || '',
    miniappAppid: res?.[DEPLOY_CONFIG_KEYS.MINIAPP_APPID] || '',
    qrcodeDefaultPlatform:
      (res?.[DEPLOY_CONFIG_KEYS.QRCODE_DEFAULT_PLATFORM] as 'h5' | 'miniapp') || 'h5',
    appLogo: res?.[DEPLOY_CONFIG_KEYS.APP_LOGO] || ''
  }
}
