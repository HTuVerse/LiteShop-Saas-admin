<!-- 自适应卡片：按 AI 返回的 type 渲染指标/风险/机会/建议/叙述/图表卡 -->
<template>
  <div
    class="dashboard-card"
    :class="[
      `is-${card.type.toLowerCase()}`,
      `level-${card.level.toLowerCase()}`,
      { 'is-highlighted': highlighted, 'is-linkable': linkable }
    ]"
    @mouseenter="emit('focus', card)"
    @mouseleave="emit('blur', card)"
    @click="handleClick"
  >
    <div class="card-head">
      <span class="card-type-chip"> <ArtSvgIcon :icon="typeIcon" />{{ typeLabel }} </span>
      <span v-if="metricTag" class="card-metric-tag">{{ metricTag }}</span>
    </div>

    <h3 class="card-title">{{ card.title }}</h3>

    <!-- 指标卡：突出数值与环比 -->
    <div v-if="card.type === 'METRIC' && card.value" class="metric-value">
      <span class="value-number">{{ card.value }}</span>
      <span v-if="card.unit" class="value-unit">{{ card.unit }}</span>
      <span
        v-if="typeof card.changeRate === 'number'"
        class="value-change"
        :class="card.changeRate >= 0 ? 'is-up' : 'is-down'"
      >
        <ArtSvgIcon :icon="card.changeRate >= 0 ? 'ri:arrow-up-line' : 'ri:arrow-down-line'" />
        {{ Math.abs(card.changeRate) }}%
      </span>
    </div>

    <!-- 图表卡：动态渲染对应图表 -->
    <DashboardChart
      v-if="card.type === 'CHART' && card.chart"
      :chart="card.chart"
      :height="chartHeight"
    />

    <!-- 表格卡：动态渲染受控列与行 -->
    <DashboardTable v-if="card.type === 'TABLE' && card.table" :table="card.table" />

    <p v-if="card.body" class="card-body">{{ card.body }}</p>

    <div v-if="linkable" class="card-footer">
      <span class="card-link">查看明细<ArtSvgIcon icon="ri:arrow-right-up-line" /></span>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import type { AiDashboardCard } from '@/api/ai'
  import DashboardChart from './dashboard-chart.vue'
  import DashboardTable from './dashboard-table.vue'

  defineOptions({ name: 'DashboardCard' })

  const props = defineProps<{
    card: AiDashboardCard
    /** 被其它卡片的 evidenceRefs 关联时高亮 */
    highlighted?: boolean
  }>()

  const emit = defineEmits<{
    focus: [card: AiDashboardCard]
    blur: [card: AiDashboardCard]
    'evidence-click': [card: AiDashboardCard]
  }>()

  // 带来源页的指标/风险/机会/建议卡可下钻到传统分析页
  const linkable = computed(
    () =>
      props.card.type !== 'CHART' &&
      props.card.type !== 'TABLE' &&
      props.card.type !== 'NARRATIVE' &&
      Boolean(props.card.sourcePage)
  )

  const chartHeight = computed(() =>
    props.card.size === 'XL' || props.card.size === 'LG' ? '280px' : '220px'
  )

  const metricTag = computed(() => props.card.metricName || '')

  const typeMeta: Record<AiDashboardCard['type'], { label: string; icon: string }> = {
    METRIC: { label: '关键指标', icon: 'ri:dashboard-3-line' },
    RISK: { label: '经营风险', icon: 'ri:error-warning-line' },
    OPPORTUNITY: { label: '经营机会', icon: 'ri:lightbulb-flash-line' },
    SUGGESTION: { label: '行动建议', icon: 'ri:task-line' },
    NARRATIVE: { label: '诊断说明', icon: 'ri:chat-quote-line' },
    CHART: { label: '数据图表', icon: 'ri:bar-chart-grouped-line' },
    TABLE: { label: '数据明细', icon: 'ri:table-line' }
  }
  const typeLabel = computed(() => typeMeta[props.card.type]?.label || '卡片')
  const typeIcon = computed(() => typeMeta[props.card.type]?.icon || 'ri:apps-line')

  function handleClick() {
    if (linkable.value) emit('evidence-click', props.card)
  }
</script>

<style scoped lang="scss">
  .dashboard-card {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 16px 18px;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 14px;
    transition:
      box-shadow 0.2s ease,
      transform 0.2s ease,
      border-color 0.2s ease;

    &.is-linkable {
      cursor: pointer;
    }

    &.is-linkable:hover {
      box-shadow: 0 12px 30px -20px rgb(79 70 229 / 55%);
      transform: translateY(-2px);
    }

    // 被关联高亮：描边 + 阴影
    &.is-highlighted {
      border-color: var(--el-color-primary);
      box-shadow: 0 0 0 2px var(--el-color-primary-light-7);
    }

    // 风险/机会/建议左侧色条
    &.is-risk,
    &.level-warning {
      border-left: 3px solid var(--el-color-danger);
    }

    &.is-opportunity,
    &.level-opportunity {
      border-left: 3px solid var(--el-color-success);
    }

    &.is-suggestion {
      border-left: 3px solid var(--el-color-primary);
    }
  }

  .card-head {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
  }

  .card-type-chip {
    display: inline-flex;
    gap: 4px;
    align-items: center;
    height: 22px;
    padding: 0 9px;
    font-size: 12px;
    font-weight: 600;
    color: var(--el-text-color-secondary);
    background: var(--el-fill-color-light);
    border-radius: 999px;

    .art-svg-icon {
      font-size: 13px;
    }
  }

  .is-risk .card-type-chip,
  .level-warning .card-type-chip {
    color: var(--el-color-danger);
    background: var(--el-color-danger-light-9);
  }

  .is-opportunity .card-type-chip,
  .level-opportunity .card-type-chip {
    color: var(--el-color-success);
    background: var(--el-color-success-light-9);
  }

  .card-metric-tag {
    font-size: 12px;
    color: var(--el-text-color-placeholder);
  }

  .card-title {
    margin: 12px 0 0;
    font-size: 15px;
    font-weight: 600;
    line-height: 1.4;
    color: var(--el-text-color-primary);
  }

  .metric-value {
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin-top: 12px;

    .value-number {
      font-size: 30px;
      font-weight: 700;
      line-height: 1;
      color: var(--el-text-color-primary);
      font-variant-numeric: tabular-nums;
    }

    .value-unit {
      font-size: 13px;
      color: var(--el-text-color-secondary);
    }

    .value-change {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      margin-left: auto;
      font-size: 13px;
      font-weight: 600;

      &.is-up {
        color: var(--el-color-success);
      }

      &.is-down {
        color: var(--el-color-danger);
      }
    }
  }

  .card-body {
    margin: 10px 0 0;
    font-size: 13px;
    line-height: 1.7;
    color: var(--el-text-color-regular);
    overflow-wrap: anywhere;
  }

  .dashboard-chart {
    margin-top: 12px;
  }

  .card-footer {
    margin-top: auto;
    padding-top: 12px;
  }

  .card-link {
    display: inline-flex;
    gap: 2px;
    align-items: center;
    font-size: 12px;
    font-weight: 600;
    color: var(--el-color-primary);
  }
</style>
