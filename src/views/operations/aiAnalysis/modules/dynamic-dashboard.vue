<!-- 动态诊断仪表盘：决策简报式布局，顶部评分+总体判断，再按问题/机会/图表/建议分区 -->
<template>
  <div class="dynamic-dashboard">
    <div v-if="layout.score || layout.headline || layout.report" class="briefing-top">
      <DashboardScore v-if="layout.score" :score="layout.score" class="briefing-score" />
      <section v-if="layout.headline || layout.report" class="dashboard-report">
        <div class="report-badge"> <ArtSvgIcon icon="ri:sparkling-2-fill" />AI 诊断报告 </div>
        <h2 v-if="layout.headline" class="report-headline">{{ layout.headline }}</h2>
        <AiContent v-if="layout.report" :content="layout.report" class="report-body" />
      </section>
    </div>

    <ElAlert
      v-if="!layout.hasData && layout.sections.length"
      type="info"
      :closable="false"
      show-icon
      title="本次未取得可量化的真实数据，以下为基于现有信息的文字诊断。"
    />

    <section v-for="section in layout.sections" :key="section.id" class="dashboard-section">
      <header class="section-head">
        <span class="section-title">{{ section.title }}</span>
        <span class="section-count">{{ section.cards.length }}</span>
      </header>
      <div class="dashboard-grid">
        <DashboardCard
          v-for="card in section.cards"
          :key="card.id"
          :class="sizeClass(card.size)"
          :card="card"
          :highlighted="highlightIds.has(card.id)"
          @focus="focusCard"
          @blur="blurCard"
          @evidence-click="emit('evidence-click', $event)"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import type { AiDashboardCard, AiDashboardResult } from '@/api/ai'
  import AiContent from './ai-content.vue'
  import DashboardCard from './dashboard-card.vue'
  import DashboardScore from './dashboard-score.vue'
  import { buildDiagnosisLayout } from '@/utils/ai/diagnosis-dashboard'

  defineOptions({ name: 'DynamicDashboard' })

  const props = defineProps<{ result: AiDashboardResult }>()

  const emit = defineEmits<{ 'evidence-click': [card: AiDashboardCard] }>()

  // 按经营价值分区并稳定排序，布局逻辑交由纯函数处理，便于测试
  const layout = computed(() => buildDiagnosisLayout(props.result))

  // 悬停某张卡片时，高亮其 evidenceRefs 指向的卡片，呈现结论与证据的关联
  const highlightIds = ref(new Set<string>())

  function focusCard(card: AiDashboardCard) {
    highlightIds.value = new Set(card.evidenceRefs || [])
  }

  function blurCard() {
    highlightIds.value = new Set()
  }

  function sizeClass(size: AiDashboardCard['size']) {
    return `span-${(size || 'MD').toLowerCase()}`
  }
</script>

<style scoped lang="scss">
  .dynamic-dashboard {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .briefing-top {
    display: grid;
    grid-template-columns: minmax(320px, 420px) 1fr;
    gap: 16px;
    align-items: stretch;
  }

  // 只有一侧内容时占满整行
  .briefing-top:has(.briefing-score:only-child),
  .briefing-top:has(.dashboard-report:only-child) {
    grid-template-columns: 1fr;
  }

  .dashboard-report {
    position: relative;
    padding: 20px 22px;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 16px;
  }

  .report-badge {
    display: inline-flex;
    gap: 5px;
    align-items: center;
    height: 26px;
    padding: 0 11px;
    font-size: 12px;
    font-weight: 600;
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    border-radius: 999px;
  }

  .report-headline {
    margin: 12px 0 6px;
    font-size: 19px;
    font-weight: 700;
    line-height: 1.4;
    color: var(--el-text-color-primary);
  }

  .report-body {
    margin-top: 6px;
  }

  .dashboard-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .section-head {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .section-title {
    position: relative;
    padding-left: 11px;
    font-size: 15px;
    font-weight: 700;
    color: var(--el-text-color-primary);
  }

  .section-title::before {
    position: absolute;
    top: 50%;
    left: 0;
    width: 3px;
    height: 15px;
    content: '';
    background: var(--el-color-primary);
    border-radius: 2px;
    transform: translateY(-50%);
  }

  .section-count {
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    font-size: 11px;
    line-height: 18px;
    color: var(--el-text-color-secondary);
    text-align: center;
    background: var(--el-fill-color-light);
    border-radius: 999px;
  }

  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: 16px;
  }

  // 卡片尺寸 → 栅格跨度
  .span-sm {
    grid-column: span 3;
  }

  .span-md {
    grid-column: span 4;
  }

  .span-lg {
    grid-column: span 6;
  }

  .span-xl {
    grid-column: span 12;
  }

  @media (width <= 1200px) {
    .briefing-top {
      grid-template-columns: 1fr;
    }

    .span-sm {
      grid-column: span 4;
    }

    .span-md {
      grid-column: span 6;
    }
  }

  @media (width <= 860px) {
    .dashboard-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .span-sm,
    .span-md,
    .span-lg,
    .span-xl {
      grid-column: span 2;
    }
  }

  @media (width <= 560px) {
    .dashboard-grid {
      grid-template-columns: 1fr;
    }

    .span-sm,
    .span-md,
    .span-lg,
    .span-xl {
      grid-column: span 1;
    }
  }
</style>
