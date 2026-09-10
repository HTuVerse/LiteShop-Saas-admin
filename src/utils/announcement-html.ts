const ALLOWED_TAGS = new Set([
  'P',
  'BR',
  'H1',
  'H2',
  'H3',
  'H4',
  'BLOCKQUOTE',
  'PRE',
  'CODE',
  'STRONG',
  'B',
  'EM',
  'I',
  'U',
  'S',
  'UL',
  'OL',
  'LI',
  'A',
  'IMG',
  'TABLE',
  'THEAD',
  'TBODY',
  'TR',
  'TH',
  'TD',
  'HR',
  'SPAN',
  'DIV'
])

const isSafeUrl = (value: string, image = false) => {
  const url = value.trim()
  if (!url) return false
  if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) return true
  if (image && /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(url)) return true
  return /^https?:\/\//i.test(url)
}

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

/** 渲染管理员富文本前做客户端白名单清洗，兼容历史纯文本公告。 */
export function sanitizeAnnouncementHtml(value?: string | null) {
  const html = value?.trim() || ''
  if (!html) return ''
  if (!/<[a-z][\s\S]*>/i.test(html)) return escapeHtml(html).replace(/\r?\n/g, '<br>')
  if (typeof DOMParser === 'undefined') return escapeHtml(html)

  const document = new DOMParser().parseFromString(html, 'text/html')
  for (const element of Array.from(document.body.querySelectorAll('*'))) {
    if (!ALLOWED_TAGS.has(element.tagName)) {
      element.replaceWith(document.createTextNode(element.textContent || ''))
      continue
    }
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase()
      const keep =
        (element.tagName === 'A' && ['href', 'title'].includes(name)) ||
        (element.tagName === 'IMG' && ['src', 'alt', 'title', 'width', 'height'].includes(name)) ||
        (['TH', 'TD'].includes(element.tagName) && ['colspan', 'rowspan'].includes(name))
      if (!keep) element.removeAttribute(attribute.name)
    }
    if (element.tagName === 'A') {
      const href = element.getAttribute('href') || ''
      if (!isSafeUrl(href)) element.removeAttribute('href')
      else {
        element.setAttribute('target', '_blank')
        element.setAttribute('rel', 'noopener noreferrer')
      }
    }
    if (element.tagName === 'IMG' && !isSafeUrl(element.getAttribute('src') || '', true)) {
      element.removeAttribute('src')
    }
  }
  return document.body.innerHTML
}
