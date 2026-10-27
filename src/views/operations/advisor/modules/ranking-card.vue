<template>
  <section class="data-card ranking-card">
    <header class="card-heading">
      <span class="heading-icon"><ArtSvgIcon icon="ri:bar-chart-grouped-line" /></span>
      <h3>{{ card.title }}</h3>
    </header>
    <p v-if="card.period" class="card-period">{{ card.period }}</p>
    <ol class="ranking-list">
      <li v-for="(item, index) in card.items" :key="`${item.name}-${index}`">
        <span class="rank-number" :class="`rank-${index + 1}`">{{ index + 1 }}</span>
        <span class="rank-name" :title="item.name">{{ item.name }}</span>
        <span class="rank-track"><span :style="{ width: `${barWidth(item.percent)}%` }" /></span>
        <strong class="rank-value"
          >{{ item.value }}<small v-if="item.unit"> {{ item.unit }}</small></strong
        >
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
  import type { AiChatRankingCard } from '@/api/ai'

  defineProps<{ card: AiChatRankingCard }>()

  function barWidth(value?: number) {
    return typeof value === 'number' && Number.isFinite(value)
      ? Math.min(100, Math.max(0, value))
      : 0
  }
</script>

<style scoped lang="scss">
  .data-card {
    min-width: 0;
    padding: 17px 18px 18px;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 15px;
  }

  .card-heading {
    display: flex;
    gap: 8px;
    align-items: center;

    h3 {
      min-width: 0;
      margin: 0;
      font-size: 15px;
      font-weight: 700;
      line-height: 1.45;
      color: var(--el-text-color-primary);
      overflow-wrap: anywhere;
    }
  }

  .heading-icon {
    font-size: 21px;
    line-height: 1;
    color: var(--el-color-primary);
  }

  .card-period {
    margin: 4px 0 14px 29px;
    font-size: 11px;
    color: var(--el-text-color-secondary);
  }

  .ranking-list {
    display: grid;
    gap: 13px;
    padding: 0;
    margin: 16px 0 0;
    list-style: none;

    li {
      display: grid;
      grid-template-columns: 28px minmax(70px, 1fr) minmax(42px, 1.1fr) auto;
      gap: 8px;
      align-items: center;
      min-width: 0;
    }
  }

  .rank-number {
    display: grid;
    place-items: center;
    width: 27px;
    height: 27px;
    font-size: 13px;
    font-weight: 700;
    color: #fff;
    background: #9aaad0;
    border-radius: 50%;

    &.rank-1 {
      background: #f3ab14;
    }

    &.rank-2 {
      background: #aebddd;
    }

    &.rank-3 {
      background: #f4b272;
    }
  }

  .rank-name {
    min-width: 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    overflow-wrap: anywhere;
  }

  .rank-track {
    height: 10px;
    overflow: hidden;
    background: var(--el-fill-color-light);
    border-radius: 999px;

    span {
      display: block;
      height: 100%;
      background: linear-gradient(90deg, #3372f3, #20c1ea);
      border-radius: inherit;
    }
  }

  .rank-value {
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    color: var(--el-color-primary);
    white-space: nowrap;

    small {
      font-size: 11px;
    }
  }

  @media (width <= 640px) {
    .ranking-list li {
      grid-template-columns: 28px minmax(62px, 1fr) minmax(36px, 0.65fr) auto;
    }
  }
</style>
