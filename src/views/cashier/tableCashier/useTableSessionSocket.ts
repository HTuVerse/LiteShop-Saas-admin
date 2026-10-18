/** 餐桌会话消息连接；每个收银面板独立持有，离开桌位立即关闭。 */
export function connectTableSessionSocket(
  sessionNo: string,
  token: string,
  onEvent: (type: string) => void,
  renewToken?: () => Promise<string>
) {
  const configured = String(import.meta.env.VITE_WS_BASEURL || '').trim()
  const base = configured || `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}`
  let currentToken = token
  let active = true
  let socket: WebSocket | undefined
  let heartbeat: ReturnType<typeof setInterval> | undefined
  let retry: ReturnType<typeof setTimeout> | undefined
  let attempts = 0

  const scheduleRetry = () => {
    if (!active || retry) return
    retry = setTimeout(
      () => {
        retry = undefined
        void connect()
      },
      Math.min(30000, 1000 * 2 ** Math.min(attempts++, 5))
    )
  }

  const connect = async () => {
    if (!active) return
    try {
      if (attempts && renewToken) currentToken = await renewToken()
    } catch {
      scheduleRetry()
      return
    }
    if (!active) return
    const url = `${base.replace(/\/$/, '')}/ws/table-session?sessionNo=${encodeURIComponent(sessionNo)}&token=${encodeURIComponent(currentToken)}`
    let current: WebSocket
    try {
      current = new WebSocket(url)
    } catch {
      scheduleRetry()
      return
    }
    socket = current
    current.onopen = () => {
      if (!active || socket !== current) return current.close()
      attempts = 0
      onEvent('CONNECTED')
      heartbeat = setInterval(() => {
        if (current.readyState === WebSocket.OPEN) {
          current.send(JSON.stringify({ type: 'HEARTBEAT' }))
        }
      }, 60000)
    }
    current.onmessage = (event) => {
      if (!active || socket !== current) return
      try {
        const message = JSON.parse(String(event.data)) as { type?: string; sessionNo?: string }
        if (message.sessionNo === sessionNo && message.type) onEvent(message.type)
      } catch {
        // 忽略不属于桌位消息协议的数据。
      }
    }
    current.onclose = () => {
      if (socket !== current) return
      socket = undefined
      if (heartbeat) clearInterval(heartbeat)
      heartbeat = undefined
      scheduleRetry()
    }
    current.onerror = () => current.close()
  }

  void connect()
  return () => {
    active = false
    if (retry) clearTimeout(retry)
    if (heartbeat) clearInterval(heartbeat)
    socket?.close(1000)
  }
}
