export interface AnnouncementStreamEvent {
  action: 'PUBLISHED' | 'WITHDRAWN'
  announcementId: string | number
  tenantId?: string | number | null
  storeIds: Array<string | number>
  version: number
}

interface StreamOptions {
  token: () => string
  onAnnouncement: (event: AnnouncementStreamEvent) => void
  onStatus?: (connected: boolean) => void
}

/** 使用 fetch 建立 SSE，以便继续通过 satoken 请求头鉴权。 */
export class AnnouncementStream {
  private controller?: AbortController
  private reconnectTimer?: ReturnType<typeof setTimeout>
  private stopped = true
  private attempts = 0

  constructor(private readonly options: StreamOptions) {}

  start() {
    this.stop()
    this.stopped = false
    void this.connect()
  }

  stop() {
    this.stopped = true
    this.controller?.abort()
    this.controller = undefined
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = undefined
    this.options.onStatus?.(false)
  }

  private async connect() {
    const token = this.options.token()
    if (this.stopped || !token) return
    this.controller = new AbortController()
    try {
      const base = String(import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
      const response = await fetch(`${base}/msg/announcements/stream`, {
        headers: { Accept: 'text/event-stream', satoken: token },
        cache: 'no-store',
        signal: this.controller.signal
      })
      if (!response.ok || !response.body) throw new Error(`SSE request failed: ${response.status}`)
      this.attempts = 0
      this.options.onStatus?.(true)
      await this.read(response.body)
      if (!this.stopped) throw new Error('SSE connection closed')
    } catch (error) {
      if (this.stopped || (error instanceof DOMException && error.name === 'AbortError')) return
      this.options.onStatus?.(false)
      this.scheduleReconnect()
    }
  }

  private async read(body: ReadableStream<Uint8Array>) {
    const reader = body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (!this.stopped) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const blocks = buffer.split(/\r?\n\r?\n/)
      buffer = blocks.pop() || ''
      blocks.forEach((block) => this.dispatch(block))
    }
  }

  private dispatch(block: string) {
    let eventName = 'message'
    const data: string[] = []
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith(':')) continue
      const separator = line.indexOf(':')
      const field = separator < 0 ? line : line.slice(0, separator)
      const value = separator < 0 ? '' : line.slice(separator + 1).replace(/^ /, '')
      if (field === 'event') eventName = value
      if (field === 'data') data.push(value)
    }
    if (eventName !== 'announcement' || !data.length) return
    try {
      this.options.onAnnouncement(JSON.parse(data.join('\n')) as AnnouncementStreamEvent)
    } catch {
      // Ignore malformed or forward-incompatible events; the next refresh remains authoritative.
    }
  }

  private scheduleReconnect() {
    const delay = Math.min(30000, 1000 * 2 ** Math.min(this.attempts++, 5)) + Math.random() * 500
    this.reconnectTimer = setTimeout(() => void this.connect(), delay)
  }
}
