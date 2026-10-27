<!-- 诊断评分卡：总分环形 + 等级 + 点评，维度用雷达图或进度条呈现 -->
<template>
  <section class="dashboard-score">
    <div class="score-gauge">
      <ElProgress
        type="dashboard"
        :percentage="overall"
        :width="132"
        :stroke-width="10"
        :color="ringColor"
      >
        <template #default>
          <div class="gauge-inner">
            <span class="gauge-value">{{ overall }}</span>
            <span class="gauge-grade" :style="{ color: ringColor }">{{ score.grade }}</span>
          </div>
        </template>
      </ElProgress>
      <p class="gauge-label">AI 参考评分</p>
    </div>

    <div class="score-body">
      <div class="score-head">
        <span class="score-chip"><ArtSvgIcon icon="ri:shield-star-line" />AI 综合诊断</span>
      </div>
      <p v-if="score.comment" class="score-comment">{{ score.comment }}</p>
      <p class="score-comment">评分是本次 AI 综合判断，不适合跨日期或模型直接比较。</p>

      <ArtRadarChart
        v-if="useRadar"
        class="score-radar"
        :indicator="radarIndicator"
        :data="radarData"
        :colors="[ringColor]"
        height="220px"
      />

      <ul v-else-if="dimensions.length" class="score-bars">
        <li v-for="dim in dimensions" :key="dim.name" class="score-bar-item">
          <div class="bar-head">
            <span class="bar-name">{{ dim.name }}</span>
            <span class="bar-score">{{ clampScore(dim.score) }}</span>
          </div>
          <ElProgress
            :percentage="clampScore(dim.score)"
            :color="ringColor"
            :stroke-width="8"
            :show-text="false"
          />
          <p v-if="dim.comment" class="bar-comment">{{ dim.comment }}</p>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import type { AiDashboardScore } from '@/api/ai'

  defineOptions({ name: 'DashboardScore' })

  const props = defineProps<{ score: AiDashboardScore }>()

  const clampScore = (value?: number) => Math.max(0, Math.min(100, Math.round(value || 0)))

  const overall = computed(() => clampScore(props.score.overall))
  const dimensions = computed(() => props.score.dimensions || [])
  // 维度达到 3 个才用雷达图，否则进度条更清晰
  const useRadar = computed(() => dimensions.value.length >= 3)

  const ringColor = computed(() => {
    const value = overall.value
    if (value >= 85) return '#22c55e'
    if (value >= 70) return '#4f46e5'
    if (value >= 60) return '#f59e0b'
    return '#ef4444'
  })

  const radarIndicator = computed(() =>
    dimensions.value.map((dim) => ({ name: dim.name, max: 100 }))
  )
  const radarData = computed(() => [
    { name: '诊断得分', value: dimensions.value.map((dim) => clampScore(dim.score)) }
  ])
</script>

<style scoped lang="scss">
  .dashboard-score {
    display: flex;
    gap: 24px;
    align-items: center;
    padding: 20px 24px;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 16px;
  }

  .score-gauge {
    display: flex;
    flex-direction: column;
    flex: 0 0 auto;
    align-items: center;
    gap: 8px;
  }

  .gauge-inner {
    display: flex;
    flex-direction: column;
    gap: 2px;
    align-items: center;
  }

  .gauge-value {
    font-size: 34px;
    font-weight: 700;
    line-height: 1;
    color: var(--el-text-color-primary);
    font-variant-numeric: tabular-nums;
  }

  .gauge-grade {
    font-size: 14px;
    font-weight: 600;
  }

  .gauge-label {
    margin: 0;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .score-body {
    flex: 1 1 auto;
    min-width: 0;
  }

  .score-chip {
    display: inline-flex;
    gap: 5px;
    align-items: center;
    height: 24px;
    padding: 0 10px;
    font-size: 12px;
    font-weight: 600;
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    border-radius: 999px;

    .art-svg-icon {
      font-size: 14px;
    }
  }

  .score-comment {
    margin: 10px 0 0;
    font-size: 14px;
    line-height: 1.7;
    color: var(--el-text-color-regular);
    overflow-wrap: anywhere;
  }

  .score-radar {
    margin-top: 6px;
  }

  .score-bars {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px 20px;
    padding: 0;
    margin: 14px 0 0;
    list-style: none;
  }

  .bar-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 4px;
  }

  .bar-name {
    font-size: 13px;
    color: var(--el-text-color-regular);
  }

  .bar-score {
    font-size: 14px;
    font-weight: 700;
    color: var(--el-text-color-primary);
    font-variant-numeric: tabular-nums;
  }

  .bar-comment {
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--el-text-color-placeholder);
    overflow-wrap: anywhere;
  }

  @media (width <= 760px) {
    .dashboard-score {
      flex-direction: column;
      gap: 16px;
      align-items: stretch;
    }

    .score-gauge {
      align-self: center;
    }

    .score-bars {
      grid-template-columns: 1fr;
    }
  }
</style>
