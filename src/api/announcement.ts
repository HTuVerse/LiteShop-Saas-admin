import request from '@/utils/http'
import type { Id, Page } from '@/types/backend'

export type AnnouncementLevel = 'NORMAL' | 'IMPORTANT' | 'URGENT'
export type AnnouncementStatus = 'DRAFT' | 'PUBLISHED' | 'WITHDRAWN'
export type AnnouncementScope = 'PLATFORM' | 'TENANT' | 'STORE'

export interface AnnouncementAttachment {
  id?: Id
  fileName: string
  fileUrl: string
  fileSize: number
  contentType?: string | null
  sortOrder?: number
}

export interface Announcement {
  id: Id
  tenantId?: Id | null
  title: string
  content: string
  level: AnnouncementLevel
  status: AnnouncementStatus
  scopeType: AnnouncementScope
  storeIds: Id[]
  attachments: AnnouncementAttachment[]
  publisherId: Id
  publisherName: string
  version: number
  read: boolean
  publishTime?: string | null
  expireTime?: string | null
  createdAt: string
  updatedAt: string
}

export interface AnnouncementForm {
  title: string
  content: string
  level: AnnouncementLevel
  scopeType: AnnouncementScope
  storeIds: Id[]
  attachments: AnnouncementAttachment[]
  expireTime?: string | null
}

export interface AnnouncementQuery {
  currentPage: number
  pageSize: number
  status?: AnnouncementStatus | ''
  keyword?: string
}

export const getAnnouncementPage = (params: AnnouncementQuery) =>
  request.get<Page<Announcement>>({ url: '/msg/announcements/admin/page', params })

export const createAnnouncement = (data: AnnouncementForm) =>
  request.post<Announcement>({ url: '/msg/announcements', data })

export const updateAnnouncement = (id: Id, data: AnnouncementForm) =>
  request.put<Announcement>({ url: `/msg/announcements/${id}`, data })

export const publishAnnouncement = (id: Id) =>
  request.post({ url: `/msg/announcements/${id}/publish` })

export const withdrawAnnouncement = (id: Id) =>
  request.post({ url: `/msg/announcements/${id}/withdraw` })

export const deleteAnnouncement = (id: Id) => request.del({ url: `/msg/announcements/${id}` })

export const getCurrentAnnouncements = (size = 5) =>
  request.get<Announcement[]>({
    url: '/msg/announcements/current',
    params: { size },
    showErrorMessage: false
  })

export const getAnnouncementUnreadCount = () =>
  request.get<{ count: number }>({
    url: '/msg/announcements/unread-count',
    showErrorMessage: false
  })

export const markAnnouncementRead = (id: Id) =>
  request.put({ url: `/msg/announcements/${id}/read`, showErrorMessage: false })
