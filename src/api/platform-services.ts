import request from '@/utils/http'

/** 平台级邮件、短信和文件服务配置。密钥读取时始终为空，只返回已配置状态。 */
export interface PlatformServiceConfig {
  revision: number
  mailHost: string
  mailPort: number
  mailUsername: string
  mailPassword: string
  mailPasswordConfigured: boolean
  clearMailPassword: boolean
  mailFrom: string
  mailProtocol: 'smtp' | 'smtps'
  smsAppKey: string
  smsAppSecret: string
  smsAppSecretConfigured: boolean
  clearSmsAppSecret: boolean
  smsTemplateId: string
  smsAppcode: string
  smsAppcodeConfigured: boolean
  clearSmsAppcode: boolean
  smsHost: string
  ossEnabled: boolean
  storageMode: 'LOCAL' | 'MINIO' | 'OSS' | 'QINIU'
  uploadPath: string
  baseUrl: string
  publicDeliveryBaseUrl: string
  allowedTypes: string
  maxSize: number
  qiniuAccessKey: string
  qiniuAccessKeyConfigured: boolean
  clearQiniuAccessKey: boolean
  qiniuSecretKey: string
  qiniuSecretKeyConfigured: boolean
  clearQiniuSecretKey: boolean
  qiniuBucket: string
  qiniuDomain: string
  qiniuPrivateBucket: string
  qiniuPrivateDomain: string
  minioEndpoint: string
  minioBrowserEndpoint: string
  minioPublicBucket: string
  minioPrivateBucket: string
  minioPublicBaseUrl: string
  minioAccessKey: string
  minioAccessKeyConfigured: boolean
  clearMinioAccessKey: boolean
  minioSecretKey: string
  minioSecretKeyConfigured: boolean
  clearMinioSecretKey: boolean
  ossEndpoint: string
  ossPublicBucket: string
  ossPrivateBucket: string
  ossPublicBaseUrl: string
  ossAccessKey: string
  ossAccessKeyConfigured: boolean
  clearOssAccessKey: boolean
  ossSecretKey: string
  ossSecretKeyConfigured: boolean
  clearOssSecretKey: boolean
}

export type PlatformMessageConfig = Pick<
  PlatformServiceConfig,
  | 'revision'
  | 'mailHost'
  | 'mailPort'
  | 'mailUsername'
  | 'mailPassword'
  | 'mailPasswordConfigured'
  | 'clearMailPassword'
  | 'mailFrom'
  | 'mailProtocol'
  | 'smsAppKey'
  | 'smsAppSecret'
  | 'smsAppSecretConfigured'
  | 'clearSmsAppSecret'
  | 'smsTemplateId'
  | 'smsAppcode'
  | 'smsAppcodeConfigured'
  | 'clearSmsAppcode'
  | 'smsHost'
>

export type PlatformFileConfig = Pick<
  PlatformServiceConfig,
  | 'revision'
  | 'ossEnabled'
  | 'storageMode'
  | 'uploadPath'
  | 'baseUrl'
  | 'publicDeliveryBaseUrl'
  | 'allowedTypes'
  | 'maxSize'
  | 'qiniuAccessKey'
  | 'qiniuAccessKeyConfigured'
  | 'clearQiniuAccessKey'
  | 'qiniuSecretKey'
  | 'qiniuSecretKeyConfigured'
  | 'clearQiniuSecretKey'
  | 'qiniuBucket'
  | 'qiniuDomain'
  | 'qiniuPrivateBucket'
  | 'qiniuPrivateDomain'
  | 'minioEndpoint'
  | 'minioBrowserEndpoint'
  | 'minioPublicBucket'
  | 'minioPrivateBucket'
  | 'minioPublicBaseUrl'
  | 'minioAccessKey'
  | 'minioAccessKeyConfigured'
  | 'clearMinioAccessKey'
  | 'minioSecretKey'
  | 'minioSecretKeyConfigured'
  | 'clearMinioSecretKey'
  | 'ossEndpoint'
  | 'ossPublicBucket'
  | 'ossPrivateBucket'
  | 'ossPublicBaseUrl'
  | 'ossAccessKey'
  | 'ossAccessKeyConfigured'
  | 'clearOssAccessKey'
  | 'ossSecretKey'
  | 'ossSecretKeyConfigured'
  | 'clearOssSecretKey'
>

export const fetchPlatformMessageConfig = () =>
  request.get<PlatformMessageConfig>({ url: '/config/platform-message/admin' })

export const publishPlatformMessageConfig = (data: PlatformMessageConfig) =>
  request.put<PlatformMessageConfig>({ url: '/config/platform-message/admin', data })

export const fetchPlatformFileConfig = () =>
  request.get<PlatformFileConfig>({ url: '/config/platform-file/admin' })

export const publishPlatformFileConfig = (data: PlatformFileConfig) =>
  request.put<PlatformFileConfig>({ url: '/config/platform-file/admin', data })

/** 检查已保存的默认存储配置，密钥不经过浏览器回显。 */
export const checkPlatformFileConnection = () =>
  request.post<string>({ url: '/file-upload/admin/resources/connection' })
