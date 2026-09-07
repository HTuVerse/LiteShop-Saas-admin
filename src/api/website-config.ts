import request from '@/utils/http'
import type { WebsiteConfig, PublicWebsiteConfig } from '@/config/website'

export const fetchPublicWebsiteConfig = () =>
  request.get<PublicWebsiteConfig>({
    url: '/config/website/public',
    anonymous: true,
    showErrorMessage: false,
    timeout: 5000
  })
export const fetchWebsiteConfig = () => request.get<WebsiteConfig>({ url: '/config/website/admin' })
export const publishWebsiteConfig = (data: WebsiteConfig) =>
  request.put<WebsiteConfig>({
    url: '/config/website/admin',
    data
  })
export interface LoginCaptcha {
  enabled: boolean
  captchaId?: string
  image?: string
}
export const fetchLoginCaptcha = () =>
  request.get<LoginCaptcha>({
    url: '/user/admin/captcha',
    anonymous: true
  })
