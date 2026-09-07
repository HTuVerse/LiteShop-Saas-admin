import { reactive } from 'vue'

export interface PublicWebsiteConfig {
  revision: number
  systemName: string
  description: string
  watermarkEnabled: boolean
  watermarkMode: 'username' | 'username_time' | 'system' | 'custom'
  watermarkText: string
  loginTitle: string
  loginDescription: string
  defaultLanguage: 'zh' | 'en'
  captchaEnabled: boolean
  captchaType: 'image'
  maintenanceEnabled: boolean
  maintenanceMessage: string
  seoTitle: string
  seoKeywords: string
  seoDescription: string
  contactEmail: string
  contactPhone: string
  contactAddress: string
  copyright: string
  icpNumber: string
  publicSecurityNumber: string
}

export interface WebsiteConfig extends PublicWebsiteConfig {
  maxLoginAttempts: number | null
  lockMinutes: number
}

export const defaultWebsiteConfig: PublicWebsiteConfig = {
  revision: 0,
  systemName: 'LiteShop',
  description: '商户运营管理平台',
  watermarkEnabled: false,
  watermarkMode: 'username',
  watermarkText: '',
  loginTitle: '欢迎回来',
  loginDescription: '使用已开通管理权限的账号登录。',
  defaultLanguage: 'zh',
  captchaEnabled: false,
  captchaType: 'image',
  maintenanceEnabled: false,
  maintenanceMessage: '系统正在维护，请稍后再试。',
  seoTitle: '',
  seoKeywords: '',
  seoDescription: '',
  contactEmail: '',
  contactPhone: '',
  contactAddress: '',
  copyright: '',
  icpNumber: '',
  publicSecurityNumber: ''
}

/** One shared, reactive snapshot for the entire application. No tenant or security data is stored here. */
export const website = reactive<PublicWebsiteConfig>({ ...defaultWebsiteConfig })

export function applyWebsiteConfig(config: PublicWebsiteConfig) {
  for (const key of Object.keys(defaultWebsiteConfig) as (keyof PublicWebsiteConfig)[]) {
    if (config[key] !== undefined) Object.assign(website, { [key]: config[key] })
  }
}
