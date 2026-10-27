export interface AdvisorSessionDateSource {
  lastMessageAt?: string
}

export interface AdvisorSessionGroup<T extends AdvisorSessionDateSource> {
  label: string
  items: T[]
}

const dateParts = (value: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(value)
  return Object.fromEntries(parts.map((part) => [part.type, part.value]))
}

const dayKey = (value: Date, timeZone: string) => {
  const parts = dateParts(value, timeZone)
  return `${parts.year}-${parts.month}-${parts.day}`
}

export function groupAdvisorSessionsByDate<T extends AdvisorSessionDateSource>(
  sessions: T[],
  now = new Date(),
  timeZone = 'Asia/Shanghai'
): AdvisorSessionGroup<T>[] {
  const today = dayKey(now, timeZone)
  const yesterday = dayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000), timeZone)
  const groups = new Map<string, T[]>()

  for (const session of sessions) {
    const date = new Date(session.lastMessageAt || '')
    let label = '更早'
    if (!Number.isNaN(date.getTime())) {
      const key = dayKey(date, timeZone)
      if (key === today) label = '今天'
      else if (key === yesterday) label = '昨天'
      else {
        const parts = dateParts(date, timeZone)
        label = `${parts.month}月${parts.day}日`
      }
    }
    const items = groups.get(label) || []
    items.push(session)
    groups.set(label, items)
  }

  return Array.from(groups, ([label, items]) => ({ label, items }))
}
