<template>
  <div v-if="announcement" class="announcement-detail-panel">
    <aside class="detail-meta">
      <div class="level-mark" :class="announcement.level.toLowerCase()">
        <ArtSvgIcon :icon="levelIcon" />
      </div>
      <strong>{{ levelLabel }}</strong>
      <span class="scope-pill">{{ scopeLabel }}</span>
      <dl>
        <div
          ><dt>发布人</dt><dd>{{ publisherLabel }}</dd></div
        >
        <div
          ><dt>发布时间</dt><dd>{{ announcement.publishTime || '尚未发布' }}</dd></div
        >
        <div
          ><dt>有效期至</dt><dd>{{ announcement.expireTime || '长期有效' }}</dd></div
        >
        <div
          ><dt>附件</dt><dd>{{ announcement.attachments?.length || 0 }} 个</dd></div
        >
      </dl>
    </aside>

    <article class="detail-main">
      <header>
        <span>通知正文</span>
        <h2>{{ announcement.title }}</h2>
      </header>
      <div class="detail-scroll">
        <div class="rich-content" v-html="safeContent" />
        <section v-if="announcement.attachments?.length" class="attachment-section">
          <h3><ArtSvgIcon icon="ri:attachment-2" />附件下载</h3>
          <div class="attachment-list">
            <a
              v-for="file in announcement.attachments"
              :key="String(file.id || file.fileUrl)"
              :href="file.fileUrl"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span><ArtSvgIcon icon="ri:file-text-line" /></span>
              <div
                ><strong>{{ file.fileName }}</strong
                ><small>{{ formatSize(file.fileSize) }}</small></div
              >
              <ArtSvgIcon icon="ri:download-2-line" />
            </a>
          </div>
        </section>
      </div>
    </article>
  </div>
  <ElEmpty v-else :image-size="64" description="请选择一条公告查看详情" />
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import type { Announcement } from '@/api/announcement'
  import { sanitizeAnnouncementHtml } from '@/utils/announcement-html'

  const props = defineProps<{ announcement?: Announcement }>()
  const levelLabelMap = { NORMAL: '普通通知', IMPORTANT: '重要通知', URGENT: '紧急通知' }
  const levelIconMap = {
    NORMAL: 'ri:notification-3-line',
    IMPORTANT: 'ri:alarm-warning-line',
    URGENT: 'ri:error-warning-line'
  }
  const levelLabel = computed(() => levelLabelMap[props.announcement?.level || 'NORMAL'])
  const levelIcon = computed(() => levelIconMap[props.announcement?.level || 'NORMAL'])
  const publisherLabel = computed(() => {
    if (props.announcement?.publisherName) return props.announcement.publisherName
    return props.announcement?.publisherId ? `用户 ${props.announcement.publisherId}` : '未知'
  })
  const scopeLabel = computed(() => {
    if (props.announcement?.scopeType === 'PLATFORM') return '全平台'
    if (props.announcement?.scopeType === 'STORE') return '指定门店'
    return '整个商户'
  })
  const safeContent = computed(() => sanitizeAnnouncementHtml(props.announcement?.content))
  const formatSize = (size = 0) => {
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / 1024 / 1024).toFixed(1)} MB`
  }
</script>

<style scoped lang="scss">
  .announcement-detail-panel {
    display: grid;
    grid-template-columns: 190px minmax(0, 1fr);
    height: min(58vh, 500px);
    min-height: 330px;
    overflow: hidden;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 14px;
  }

  .detail-meta {
    min-height: 0;
    padding: 24px 18px;
    overflow-y: auto;
    text-align: center;
    background: linear-gradient(
      160deg,
      var(--el-color-primary-light-9),
      var(--el-fill-color-light)
    );
    border-right: 1px solid var(--el-border-color-lighter);
  }

  .level-mark {
    display: grid;
    place-items: center;
    width: 50px;
    height: 50px;
    margin: 0 auto 10px;
    font-size: 24px;
    color: var(--el-color-primary);
    background: var(--el-bg-color);
    border-radius: 15px;
    box-shadow: 0 8px 22px rgb(36 104 183 / 12%);
  }

  .level-mark.important {
    color: var(--el-color-warning);
  }

  .level-mark.urgent {
    color: var(--el-color-danger);
  }

  .detail-meta > strong {
    display: block;
    font-size: 15px;
  }

  .scope-pill {
    display: inline-block;
    padding: 3px 9px;
    margin-top: 8px;
    font-size: 11px;
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-8);
    border-radius: 999px;
  }

  dl {
    margin: 22px 0 0;
    text-align: left;
  }

  dl div {
    padding: 10px 0;
    border-top: 1px solid var(--el-border-color-lighter);
  }

  dt {
    margin-bottom: 3px;
    font-size: 11px;
    color: var(--el-text-color-secondary);
  }

  dd {
    margin: 0;
    font-size: 12px;
    overflow-wrap: anywhere;
  }

  .detail-main {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    padding: 24px 28px;
    overflow: hidden;
  }

  .detail-main header > span {
    font-size: 11px;
    font-weight: 700;
    color: var(--el-color-primary);
    letter-spacing: 1.5px;
  }

  .detail-main h2 {
    margin: 7px 0 20px;
    font-size: 20px;
    line-height: 1.4;
  }

  .detail-scroll {
    flex: 1;
    min-height: 0;
    padding-right: 8px;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
  }

  .rich-content {
    min-height: 130px;
    font-size: 14px;
    line-height: 1.8;
    overflow-wrap: anywhere;
  }

  .rich-content :deep(img) {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
  }

  .rich-content :deep(table) {
    width: 100%;
    border-collapse: collapse;
  }

  .rich-content :deep(th),
  .rich-content :deep(td) {
    padding: 6px;
    border: 1px solid var(--el-border-color);
  }

  .attachment-section {
    padding-top: 18px;
    margin-top: 22px;
    border-top: 1px dashed var(--el-border-color);
  }

  .attachment-section h3 {
    display: flex;
    gap: 6px;
    align-items: center;
    margin: 0 0 10px;
    font-size: 13px;
  }

  .attachment-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .attachment-list a {
    display: flex;
    gap: 9px;
    align-items: center;
    min-width: 0;
    padding: 9px 10px;
    color: inherit;
    text-decoration: none;
    background: var(--el-fill-color-light);
    border-radius: 9px;
  }

  .attachment-list a:hover {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }

  .attachment-list a > span {
    font-size: 20px;
  }

  .attachment-list a > div {
    flex: 1;
    min-width: 0;
  }

  .attachment-list strong,
  .attachment-list small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .attachment-list strong {
    font-size: 12px;
  }

  .attachment-list small {
    margin-top: 2px;
    font-size: 10px;
    color: var(--el-text-color-secondary);
  }

  @media (width <= 680px) {
    .announcement-detail-panel {
      grid-template-rows: auto minmax(0, 1fr);
      grid-template-columns: 1fr;
      height: min(72vh, 600px);
    }

    .detail-meta {
      padding: 16px;
      border-right: 0;
      border-bottom: 1px solid var(--el-border-color-lighter);
    }

    .detail-meta dl {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-top: 14px;
    }

    .detail-main {
      padding: 20px;
    }

    .attachment-list {
      grid-template-columns: 1fr;
    }
  }
</style>
