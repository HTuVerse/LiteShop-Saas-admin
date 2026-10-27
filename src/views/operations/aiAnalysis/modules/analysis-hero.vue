<!-- AI 经营诊断 Hero：问候/日期/范围/额度与诊断入口 -->
<template>
  <section class="analysis-hero">
    <div class="hero-main">
      <div class="hero-copy">
        <div class="hero-badge">
          <span class="hero-badge-dot" :class="{ ready: analyzed }"></span>
          {{ analyzed ? '已生成诊断' : '等待诊断' }}
        </div>
        <h2 class="hero-title">{{ greeting }}，让 AI 为你诊断当前经营</h2>
        <p class="hero-subtitle">
          AI 自动读取真实经营数据，主动诊断并动态生成最有价值的指标、图表与建议，无需手动选指标。
        </p>
        <div class="hero-meta">
          <span class="hero-meta-item">
            <ArtSvgIcon icon="ri:calendar-check-line" />{{ dateText }}
          </span>
          <span class="hero-meta-item">
            <ArtSvgIcon icon="ri:building-2-line" />{{ scopeLabel }}
          </span>
          <span v-if="periodLabel" class="hero-meta-item">
            <ArtSvgIcon icon="ri:calendar-2-line" />诊断周期：{{ periodLabel }}
          </span>
          <span v-if="dataCutoff" class="hero-meta-item">
            <ArtSvgIcon icon="ri:time-line" />汇总最近更新 {{ dataCutoff }}
          </span>
        </div>
      </div>

      <div class="hero-visual" aria-hidden="true">
        <img :src="heroRobot" alt="" class="hero-robot" />
      </div>
    </div>

    <div class="hero-toolbar">
      <div class="hero-controls">
        <slot name="controls" />
      </div>
      <ElButton
        type="primary"
        class="hero-analyze"
        :loading="loading"
        :disabled="disabledAnalyze || loading"
        @click="emit('analyze')"
      >
        <ArtSvgIcon v-if="!loading" icon="ri:sparkling-2-fill" />
        {{ analyzed ? '重新诊断' : '开始经营诊断' }}
      </ElButton>
      <span class="hero-repeat-hint">5 分钟内重复诊断会复用当前结果</span>
    </div>
  </section>
</template>

<script setup lang="ts">
  import heroRobot from '@/assets/images/ai-manager/hero-robot.png'

  defineOptions({ name: 'AnalysisHero' })

  defineProps<{
    greeting: string
    dateText: string
    scopeLabel: string
    periodLabel?: string
    dataCutoff?: string
    analyzed?: boolean
    loading?: boolean
    disabledAnalyze?: boolean
  }>()

  const emit = defineEmits<{ analyze: [] }>()
</script>

<style scoped lang="scss">
  .analysis-hero {
    position: relative;
    padding: 26px 28px 20px;
    overflow: hidden;
    background: linear-gradient(118deg, #4f46e5 0%, #6366f1 48%, #7c6ff2 100%);
    border-radius: 18px;
    box-shadow: 0 18px 40px -24px rgb(79 70 229 / 65%);
  }

  .analysis-hero::before {
    position: absolute;
    top: -70px;
    right: -40px;
    width: 260px;
    height: 260px;
    content: '';
    background: radial-gradient(circle, rgb(255 255 255 / 22%), transparent 68%);
    pointer-events: none;
  }

  .hero-main {
    position: relative;
    display: flex;
    gap: 20px;
    align-items: center;
    justify-content: space-between;
  }

  .hero-copy {
    flex: 1 1 auto;
    min-width: 0;
    color: #fff;
  }

  .hero-badge {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    height: 26px;
    padding: 0 11px;
    font-size: 12px;
    font-weight: 600;
    color: #fff;
    background: rgb(255 255 255 / 18%);
    border-radius: 999px;
  }

  .hero-badge-dot {
    width: 7px;
    height: 7px;
    background: #fbbf24;
    border-radius: 50%;
    box-shadow: 0 0 0 3px rgb(251 191 36 / 25%);

    &.ready {
      background: #4ade80;
      box-shadow: 0 0 0 3px rgb(74 222 128 / 30%);
    }
  }

  .hero-title {
    margin: 14px 0 0;
    font-size: clamp(20px, 3.4vw, 27px);
    font-weight: 700;
    line-height: 1.3;
    color: #fff;
  }

  .hero-subtitle {
    max-width: 52ch;
    margin: 10px 0 0;
    font-size: 13px;
    line-height: 1.7;
    color: rgb(255 255 255 / 82%);
  }

  .hero-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 18px;
  }

  .hero-meta-item {
    display: inline-flex;
    gap: 5px;
    align-items: center;
    height: 30px;
    padding: 0 12px;
    font-size: 12px;
    color: #fff;
    background: rgb(255 255 255 / 14%);
    border: 1px solid rgb(255 255 255 / 18%);
    border-radius: 8px;

    .art-svg-icon {
      font-size: 15px;
    }
  }

  .hero-visual {
    flex: 0 0 auto;
    width: 168px;
    text-align: center;
  }

  .hero-robot {
    width: 100%;
    height: auto;
    filter: drop-shadow(0 16px 26px rgb(49 39 150 / 40%));
  }

  .hero-toolbar {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    justify-content: space-between;
    padding: 14px;
    margin-top: 20px;
    background: rgb(255 255 255 / 92%);
    border-radius: 12px;
  }

  .hero-controls {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    min-width: 0;
  }

  .hero-analyze {
    height: 36px;
    min-width: 168px;
    font-weight: 600;
    border: 0;

    .art-svg-icon {
      margin-right: 5px;
      font-size: 16px;
    }
  }

  .hero-repeat-hint {
    font-size: 11px;
    color: var(--el-text-color-secondary);
  }

  :global(.dark) .hero-toolbar {
    background: var(--el-bg-color-overlay);
  }

  @media (width <= 760px) {
    .analysis-hero {
      padding: 22px 18px 16px;
    }

    .hero-visual {
      width: 96px;
    }

    .hero-title {
      font-size: 20px;
    }

    .hero-subtitle {
      max-width: none;
    }

    .hero-toolbar {
      flex-direction: column;
      align-items: stretch;
    }

    .hero-controls {
      width: 100%;
    }

    .hero-analyze {
      width: 100%;
    }
  }

  @media (width <= 460px) {
    .hero-visual {
      display: none;
    }
  }
</style>
