<template>
  <div class="template-preview">
    <ElAlert v-if="error" :title="error" type="error" :closable="false" show-icon />
    <div class="preview-paper" :class="templateData.paperWidth === 1 ? 'paper-80mm' : 'paper-58mm'">
      <div class="preview-caption"
        >演示订单 · {{ templateData.itemTicketMode === 1 ? '每菜一张（示例菜品 × 2）' : '整批一张' }} · {{ templateData.printCopies || 1 }} 联</div
      >
      <div v-if="loading && !content" class="preview-state">正在生成预览…</div>
      <div v-else-if="content" class="print-content" v-html="renderedContent"></div>
      <div v-else-if="!error" class="preview-state">暂无可预览的小票内容</div>
      <details v-if="content" class="raw-content">
        <summary>查看实际打印指令</summary>
        <pre>{{ content }}</pre>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { ElAlert } from 'element-plus'
  import { previewTemplate } from '@/api/print-template'

  defineOptions({ name: 'TemplatePreview' })

  const props = defineProps<{ templateData: any }>()
  const content = ref('')
  const loading = ref(false)
  const error = ref('')

  // 先转义所有内容，再只还原已知的飞鹅云排版标签，避免草稿内容注入 HTML。
  const renderedContent = computed(() =>
    content.value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/&lt;LOGO&gt;/g, '<span class="media">【设备预置 Logo】</span>')
      .replace(/&lt;QR&gt;(.*?)&lt;\/QR&gt;/g, '<span class="media">【二维码：$1】</span>')
      .replace(/&lt;BR&gt;/g, '<br>')
      .replace(/&lt;CB&gt;/g, '<span class="center enlarged">')
      .replace(/&lt;\/CB&gt;/g, '</span>')
      .replace(/&lt;C&gt;/g, '<span class="center">')
      .replace(/&lt;\/C&gt;/g, '</span>')
      .replace(/&lt;RIGHT&gt;/g, '<span class="right">')
      .replace(/&lt;\/RIGHT&gt;/g, '</span>')
      .replace(/&lt;BOLD&gt;/g, '<strong>')
      .replace(/&lt;\/BOLD&gt;/g, '</strong>')
      .replace(/&lt;B&gt;/g, '<span class="enlarged">')
      .replace(/&lt;\/B&gt;/g, '</span>')
      .replace(/&lt;L&gt;/g, '<span class="tall">')
      .replace(/&lt;\/L&gt;/g, '</span>')
  )

  watch(
    () => ({ ...props.templateData }),
    (_template, _previous, onCleanup) => {
      let active = true
      const timer = window.setTimeout(async () => {
        loading.value = true
        try {
          const result = await previewTemplate({ ...props.templateData })
          if (active) {
            content.value = typeof result === 'string' ? result : ''
            error.value = content.value ? '' : '预览接口没有返回小票内容，请确认后端已更新'
          }
        } catch {
          if (active) {
            content.value = ''
            error.value = '预览生成失败，请检查模板内容或稍后重试'
          }
        } finally {
          if (active) loading.value = false
        }
      }, 250)
      onCleanup(() => {
        active = false
        window.clearTimeout(timer)
      })
    },
    { immediate: true }
  )
</script>

<style scoped lang="scss">
  .template-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    max-height: calc(100vh - 200px);
    padding: 20px;
    overflow: auto;
    background: #f5f5f5;
  }

  .preview-paper {
    flex-shrink: 0;
    box-sizing: border-box;
    max-width: 100%;
    padding: 16px;
    overflow-x: auto;
    color: #000;
    background: #fff;
    box-shadow: 0 2px 8px rgb(0 0 0 / 10%);
  }

  .paper-58mm {
    width: 250px;
  }

  .paper-80mm {
    width: 350px;
  }

  .preview-caption,
  .preview-state {
    margin-bottom: 10px;
    color: #666;
    font-size: 11px;
  }

  .print-content {
    margin: 0;
    white-space: pre;
    font-family: 'Courier New', monospace;
    font-size: 10.5px;
    line-height: 1.5;
  }

  .print-content :deep(.center) {
    display: inline-block;
    width: 100%;
    text-align: center;
  }

  .print-content :deep(.right) {
    display: inline-block;
    width: 100%;
    text-align: right;
  }

  .print-content :deep(.enlarged) {
    font-size: 1.8em;
  }

  .print-content :deep(.tall) {
    display: inline-block;
    transform: scaleY(1.5);
  }

  .print-content :deep(.media) {
    color: #555;
    white-space: normal;
  }

  .raw-content {
    margin-top: 14px;
    font-size: 11px;
    color: #666;
  }

  .raw-content pre {
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }
</style>
