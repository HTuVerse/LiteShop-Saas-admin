import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ElNotification } from 'element-plus'
import {
  getAnnouncementUnreadCount,
  getCurrentAnnouncements,
  markAnnouncementRead,
  type Announcement
} from '@/api/announcement'
import { useUserStore } from './user'
import { AnnouncementStream, type AnnouncementStreamEvent } from '@/utils/sse/announcement-stream'

export const useAnnouncementStore = defineStore('announcementStore', () => {
  const list = ref<Announcement[]>([])
  const unreadCount = ref(0)
  const connected = ref(false)
  const loading = ref(false)
  let stream: AnnouncementStream | undefined
  let lastEventKey = ''

  async function refresh() {
    const session = useUserStore()
    if (!session.isLogin) return clear()
    loading.value = true
    try {
      const [announcements, unread] = await Promise.all([
        getCurrentAnnouncements(20),
        getAnnouncementUnreadCount()
      ])
      list.value = announcements
      unreadCount.value = Number(unread.count || 0)
    } finally {
      loading.value = false
    }
  }

  function connect() {
    disconnect()
    const session = useUserStore()
    if (!session.isLogin || !session.accessToken) return
    stream = new AnnouncementStream({
      token: () => useUserStore().accessToken,
      onStatus: (value) => (connected.value = value),
      onAnnouncement: handleRealtimeEvent
    })
    stream.start()
  }

  function disconnect() {
    stream?.stop()
    stream = undefined
    connected.value = false
  }

  async function handleRealtimeEvent(event: AnnouncementStreamEvent) {
    const key = `${event.action}:${event.announcementId}:${event.version}`
    if (key === lastEventKey) return
    lastEventKey = key
    await refresh().catch(() => undefined)
    if (event.action !== 'PUBLISHED') return
    const item = list.value.find(
      (announcement) => String(announcement.id) === String(event.announcementId)
    )
    if (item) {
      ElNotification({
        title: item.level === 'URGENT' ? '紧急公告' : '新公告',
        message: item.title,
        type: item.level === 'URGENT' ? 'warning' : 'info',
        duration: 6000
      })
    }
  }

  async function markRead(item: Announcement) {
    if (item.read) return
    await markAnnouncementRead(item.id)
    item.read = true
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  }

  function clear() {
    disconnect()
    list.value = []
    unreadCount.value = 0
    lastEventKey = ''
  }

  return { list, unreadCount, connected, loading, refresh, connect, disconnect, markRead, clear }
})
