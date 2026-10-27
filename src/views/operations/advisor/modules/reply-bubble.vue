<template>
  <div class="reply-bubble">
    <header class="reply-header">
      <div class="reply-identity">
        <strong><span>AI</span> 智能问数</strong>
        <time>{{ time }}</time>
      </div>
      <div v-if="message.requestId" class="reply-tools" aria-label="回答操作">
        <button
          type="button"
          aria-label="标记有用"
          title="有用"
          :aria-pressed="message.feedback === 'USEFUL'"
          :class="{ selected: message.feedback === 'USEFUL' }"
          @click="emit('feedback', 'USEFUL')"
          ><ArtSvgIcon icon="ri:thumb-up-line"
        /></button>
        <button
          type="button"
          aria-label="标记无用"
          title="无用"
          :aria-pressed="message.feedback === 'NOT_USEFUL'"
          :class="{ selected: message.feedback === 'NOT_USEFUL' }"
          @click="emit('feedback', 'NOT_USEFUL')"
          ><ArtSvgIcon icon="ri:thumb-down-line"
        /></button>
        <button type="button" aria-label="复制回答" title="复制回答" @click="emit('copy')"
          ><ArtSvgIcon icon="ri:file-copy-line"
        /></button>
      </div>
    </header>

    <AiContent :content="message.content" class="reply-answer" />

    <TipBanner v-if="message.chatView?.tip" :text="message.chatView.tip" class="reply-tip" />

    <div v-if="message.chatView?.cards?.length" class="reply-card-grid">
      <template v-for="(card, index) in message.chatView.cards" :key="`${card.type}-${index}`">
        <RankingCard v-if="card.type === 'RANKING'" :card="card" />
        <InsightListCard v-else-if="card.type === 'INSIGHT_LIST'" :card="card" />
        <section v-else-if="card.type === 'CHART'" class="chart-card">
          <header
            ><ArtSvgIcon icon="ri:line-chart-line" /><h3>{{ card.title }}</h3></header
          >
          <p v-if="card.period" class="chart-period">{{ card.period }}</p>
          <DashboardChart :chart="card.chart" height="220px" />
        </section>
      </template>
    </div>

    <div v-if="!message.chatView?.cards?.length && message.keyPoints?.length" class="answer-points">
      <div v-for="(point, index) in message.keyPoints" :key="index" class="answer-point">
        <span class="point-index">{{ index + 1 }}</span>
        <div
          ><strong>{{ point.title }}</strong
          ><p v-if="point.detail">{{ point.detail }}</p></div
        >
      </div>
    </div>

    <div v-if="message.actions?.length" class="answer-actions">
      <strong>建议下一步</strong>
      <div v-for="(action, index) in message.actions" :key="index">
        <b>{{ action.title }}</b
        ><span v-if="action.description">{{ action.description }}</span>
      </div>
    </div>

    <details v-if="message.evidence?.length" class="reply-evidence">
      <summary>查看数据依据（{{ message.evidence.length }}）</summary>
      <ul>
        <li v-for="(item, index) in message.evidence" :key="`${item.metricCode || item.title}-${index}`">
          <strong>{{ item.title }}</strong>
          <span>{{ item.detail }}</span>
          <RouterLink v-if="item.sourcePage" :to="item.sourcePage">查看经营数据</RouterLink>
        </li>
      </ul>
    </details>

    <p v-if="message.dataPeriod && !message.chatView?.cards?.length" class="data-period">
      本次使用数据：{{ message.dataPeriod }}
    </p>

    <FollowUps
      v-if="message.chatView?.followUps?.length"
      :questions="message.chatView.followUps"
      :disabled="disabled"
      class="reply-follow-ups"
      @ask="emit('ask', $event)"
    />
  </div>
</template>

<script setup lang="ts">
  import type { AiFeedback } from '@/api/ai'
  import type { AdvisorMessage } from '@/utils/ai/advisor-message'
  import AiContent from '../../aiAnalysis/modules/ai-content.vue'
  import DashboardChart from '../../aiAnalysis/modules/dashboard-chart.vue'
  import FollowUps from './follow-ups.vue'
  import InsightListCard from './insight-list-card.vue'
  import RankingCard from './ranking-card.vue'
  import TipBanner from './tip-banner.vue'

  defineProps<{ message: AdvisorMessage; time: string; disabled?: boolean }>()
  const emit = defineEmits<{
    ask: [question: string]
    feedback: [value: AiFeedback]
    copy: []
  }>()
</script>

<style scoped lang="scss">
  .reply-bubble {
    display: grid;
    gap: 17px;
    min-width: 0;
    padding: clamp(16px, 2vw, 25px);
    color: var(--el-text-color-primary);
    background: var(--el-bg-color);
    border: 1px solid
      color-mix(in srgb, var(--el-color-primary) 20%, var(--el-border-color-lighter));
    border-radius: 17px;
    box-shadow: 0 16px 35px -30px rgb(47 99 189 / 45%);
  }

  .reply-header,
  .reply-identity,
  .reply-tools {
    display: flex;
    align-items: center;
  }

  .reply-header {
    gap: 12px;
    justify-content: space-between;
  }

  .reply-identity {
    gap: 17px;
    min-width: 0;
  }

  .reply-identity strong {
    font-size: 16px;
    font-weight: 700;
    color: var(--el-text-color-primary);
    white-space: nowrap;

    span {
      color: var(--el-color-primary);
    }
  }

  .reply-identity time {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .reply-tools {
    gap: 5px;
  }

  .reply-tools button {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    padding: 0;
    font-size: 17px;
    color: var(--el-text-color-secondary);
    cursor: pointer;
    background: transparent;
    border: 0;
    border-radius: 7px;

    &:hover,
    &.selected {
      color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
    }

    &:focus-visible {
      outline: 2px solid var(--el-color-primary);
      outline-offset: 2px;
    }
  }

  .reply-answer {
    font-size: 15px;
    line-height: 1.75;
    color: var(--el-text-color-primary);
  }

  .reply-answer :deep(strong) {
    font-weight: 700;
    color: var(--el-color-primary);
  }

  .reply-tip {
    margin-top: -2px;
  }

  .reply-card-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 13px;
  }

  .chart-card {
    min-width: 0;
    padding: 17px 18px 18px;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 15px;

    header {
      display: flex;
      gap: 8px;
      align-items: center;
      font-size: 21px;
      color: var(--el-color-primary);
    }

    h3 {
      margin: 0;
      font-size: 15px;
      line-height: 1.45;
      color: var(--el-text-color-primary);
      overflow-wrap: anywhere;
    }
  }

  .chart-period {
    margin: 4px 0 10px 29px;
    font-size: 11px;
    color: var(--el-text-color-secondary);
  }

  .answer-points {
    display: grid;
    gap: 8px;
  }

  .answer-point {
    display: flex;
    gap: 9px;
    align-items: baseline;
    font-size: 13px;
  }

  .point-index {
    font-weight: 700;
    color: var(--el-color-primary);
  }

  .answer-point strong {
    color: var(--el-text-color-primary);
  }

  .answer-point p {
    margin: 2px 0 0;
    color: var(--el-text-color-secondary);
  }

  .answer-actions {
    display: grid;
    gap: 7px;
    padding: 12px 14px;
    font-size: 12px;
    background: var(--el-fill-color-light);
    border-radius: 11px;
  }

  .answer-actions > strong {
    color: var(--el-color-primary);
  }

  .answer-actions div {
    display: grid;
    gap: 2px;
  }

  .answer-actions b {
    color: var(--el-text-color-primary);
  }

  .answer-actions span,
  .data-period {
    color: var(--el-text-color-secondary);
  }

  .data-period {
    margin: 0;
    font-size: 11px;
  }

  .reply-evidence {
    padding-top: 11px;
    border-top: 1px solid var(--el-border-color-lighter);

    summary {
      font-size: 12px;
      color: var(--el-color-primary);
      cursor: pointer;
    }

    ul {
      display: grid;
      gap: 9px;
      padding: 10px 0 0;
      margin: 0;
      list-style: none;
    }

    li {
      display: grid;
      gap: 2px;
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }

    li strong {
      color: var(--el-text-color-primary);
    }
  }

  @media (width <= 780px) {
    .reply-card-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  @media (width <= 480px) {
    .reply-header {
      align-items: flex-start;
    }

    .reply-identity {
      display: grid;
      gap: 2px;
    }

    .reply-tools {
      gap: 1px;
    }
  }
</style>
