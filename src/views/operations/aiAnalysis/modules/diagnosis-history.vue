<!-- 诊断记录抽屉：列出本周期历史诊断（含失败/进行中），点击查看对应快照 -->
<template>
  <ElDrawer
    :model-value="visible"
    title="诊断记录"
    size="380px"
    :append-to-body="true"
    @update:model-value="emit('update:visible', $event)"
  >
    <ElEmpty v-if="!records.length" description="本周期暂无诊断记录" />
    <ul v-else class="history-list">
      <li
        v-for="record in records"
        :key="record.requestId"
        class="history-item"
        :class="{ 'is-active': record.requestId === activeId }"
        @click="emit('select', record)"
      >
        <div class="item-head">
          <span class="item-status" :class="`status-${record.status.toLowerCase()}`">
            <ArtSvgIcon :icon="statusIcon(record.status)" />{{ statusLabel(record.status) }}
          </span>
          <span class="item-time">{{ formatTime(record.createdAt) }}</span>
        </div>
        <p class="item-title">
          {{ headline(record) }}
        </p>
      </li>
    </ul>
  </ElDrawer>
</template>

<script setup lang="ts">
  import type { AiManagerRecord } from '@/api/ai'

  defineOptions({ name: 'DiagnosisHistory' })

  defineProps<{
    visible: boolean
    records: AiManagerRecord[]
    activeId?: string
  }>()

  const emit = defineEmits<{
    'update:visible': [value: boolean]
    select: [record: AiManagerRecord]
  }>()

  const statusMeta: Record<AiManagerRecord['status'], { label: string; icon: string }> = {
    PROCESSING: { label: '生成中', icon: 'ri:loader-4-line' },
    SUCCEEDED: { label: '已完成', icon: 'ri:checkbox-circle-line' },
    FAILED: { label: '失败', icon: 'ri:close-circle-line' }
  }
  const statusLabel = (status: AiManagerRecord['status']) => statusMeta[status]?.label || status
  const statusIcon = (status: AiManagerRecord['status']) =>
    statusMeta[status]?.icon || 'ri:information-line'

  function headline(record: AiManagerRecord) {
    if (record.status === 'FAILED') return record.failureMessage || '生成失败'
    if (record.status === 'PROCESSING') return '正在生成诊断…'
    return record.result?.dashboard?.headline || record.result?.content || 'AI 经营诊断'
  }

  function formatTime(value?: string) {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return new Intl.DateTimeFormat('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }
</script>

<style scoped lang="scss">
  .history-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 0;
    margin: 0;
    list-style: none;
  }

  .history-item {
    padding: 12px 14px;
    cursor: pointer;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 12px;
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease;

    &:hover {
      border-color: var(--el-color-primary-light-5);
    }

    &.is-active {
      border-color: var(--el-color-primary);
      box-shadow: 0 0 0 2px var(--el-color-primary-light-7);
    }
  }

  .item-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .item-status {
    display: inline-flex;
    gap: 4px;
    align-items: center;
    font-size: 12px;
    font-weight: 600;

    .art-svg-icon {
      font-size: 14px;
    }

    &.status-succeeded {
      color: var(--el-color-success);
    }

    &.status-failed {
      color: var(--el-color-danger);
    }

    &.status-processing {
      color: var(--el-color-warning);
    }
  }

  .item-time {
    font-size: 12px;
    color: var(--el-text-color-placeholder);
  }

  .item-title {
    margin: 8px 0 0;
    font-size: 13px;
    line-height: 1.5;
    color: var(--el-text-color-primary);
    overflow-wrap: anywhere;
  }
</style>
