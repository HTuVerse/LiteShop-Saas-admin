<!-- 轻量 Markdown 渲染：用于展示 AI 诊断报告正文 -->
<template>
  <div class="ai-content">
    <template v-for="(block, index) in blocks" :key="index">
      <h4 v-if="block.type === 'heading'" class="content-heading">
        <template v-for="(part, partIndex) in inlineParts(block.text)" :key="partIndex">
          <strong v-if="part.type === 'strong'">{{ part.text }}</strong>
          <code v-else-if="part.type === 'code'">{{ part.text }}</code>
          <span v-else>{{ part.text }}</span>
        </template>
      </h4>
      <component
        :is="block.ordered ? 'ol' : 'ul'"
        v-else-if="block.type === 'list'"
        class="content-list"
      >
        <li v-for="(item, itemIndex) in block.items" :key="itemIndex">
          <template v-for="(part, partIndex) in inlineParts(item)" :key="partIndex">
            <strong v-if="part.type === 'strong'">{{ part.text }}</strong>
            <code v-else-if="part.type === 'code'">{{ part.text }}</code>
            <span v-else>{{ part.text }}</span>
          </template>
        </li>
      </component>
      <blockquote v-else-if="block.type === 'quote'" class="content-quote">{{
        block.text
      }}</blockquote>
      <p v-else class="content-paragraph">
        <template v-for="(part, partIndex) in inlineParts(block.text)" :key="partIndex">
          <strong v-if="part.type === 'strong'">{{ part.text }}</strong>
          <code v-else-if="part.type === 'code'">{{ part.text }}</code>
          <span v-else>{{ part.text }}</span>
        </template>
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'

  defineOptions({ name: 'AiContent' })

  type ContentBlock = {
    type: 'heading' | 'paragraph' | 'quote' | 'list'
    text: string
    ordered?: boolean
    items?: string[]
  }

  const props = defineProps<{ content: string }>()

  const blocks = computed<ContentBlock[]>(() => {
    const result: ContentBlock[] = []
    const paragraph: string[] = []
    const flushParagraph = () => {
      if (paragraph.length) result.push({ type: 'paragraph', text: paragraph.join('\n') })
      paragraph.length = 0
    }

    for (const rawLine of (props.content || '').replace(/\r\n?/g, '\n').split('\n')) {
      const line = rawLine.trim()
      if (!line) {
        flushParagraph()
        continue
      }

      const heading = line.match(/^#{1,4}\s+(.+)$/)
      const bullet = line.match(/^[-*•]\s+(.+)$/)
      const numbered = line.match(/^\d+[.、)]\s*(.+)$/)
      const quote = line.match(/^>\s*(.+)$/)
      if (heading) {
        flushParagraph()
        result.push({ type: 'heading', text: heading[1] })
      } else if (bullet || numbered) {
        flushParagraph()
        const ordered = Boolean(numbered)
        const previous = result[result.length - 1]
        if (previous?.type === 'list' && previous.ordered === ordered) {
          previous.items?.push((bullet || numbered)![1])
        } else {
          result.push({ type: 'list', text: '', ordered, items: [(bullet || numbered)![1]] })
        }
      } else if (quote) {
        flushParagraph()
        result.push({ type: 'quote', text: quote[1] })
      } else {
        paragraph.push(line)
      }
    }
    flushParagraph()
    return result
  })

  function inlineParts(value: string) {
    return value
      .split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
      .filter(Boolean)
      .map((part) => {
        if (part.startsWith('**') && part.endsWith('**'))
          return { type: 'strong', text: part.slice(2, -2) }
        if (part.startsWith('`') && part.endsWith('`'))
          return { type: 'code', text: part.slice(1, -1) }
        return { type: 'text', text: part }
      })
  }
</script>

<style scoped lang="scss">
  .ai-content {
    font-size: 14px;
    line-height: 1.75;
    color: var(--el-text-color-regular);
    overflow-wrap: anywhere;
  }

  .content-heading {
    padding-left: 10px;
    margin: 18px 0 8px;
    font-size: 14px;
    font-weight: 700;
    line-height: 1.5;
    color: var(--el-text-color-primary);
    border-left: 3px solid var(--el-color-primary);
  }

  .content-paragraph {
    margin: 0 0 10px;
    white-space: pre-line;
  }

  .content-list {
    padding-left: 22px;
    margin: 6px 0 14px;

    li {
      padding-left: 3px;
      margin: 5px 0;
    }

    li::marker {
      font-weight: 700;
      color: var(--el-color-primary);
    }
  }

  .content-quote {
    padding: 9px 12px;
    margin: 10px 0;
    color: var(--el-text-color-secondary);
    background: var(--el-fill-color-light);
    border-left: 3px solid var(--el-color-primary-light-5);
    border-radius: 0 8px 8px 0;
  }

  code {
    padding: 2px 5px;
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    border-radius: 4px;
  }

  strong {
    color: var(--el-text-color-primary);
  }

  :last-child {
    margin-bottom: 0;
  }
</style>
