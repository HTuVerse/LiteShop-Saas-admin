<template>
  <section class="data-card insight-card">
    <header class="card-heading">
      <span class="heading-icon"><ArtSvgIcon icon="ri:key-2-line" /></span>
      <h3>{{ card.title }}</h3>
    </header>
    <p v-if="card.period" class="card-period">{{ card.period }}</p>
    <ul class="insight-list">
      <li v-for="(item, index) in card.items" :key="`${item.title}-${index}`">
        <span class="insight-icon" :class="`tone-${index % 3}`">
          <ArtSvgIcon :icon="item.icon || fallbackIcons[index % fallbackIcons.length]" />
        </span>
        <span class="insight-copy"
          ><strong>{{ item.title }}</strong
          ><small>{{ item.detail }}</small></span
        >
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
  import type { AiChatInsightCard } from '@/api/ai'

  defineProps<{ card: AiChatInsightCard }>()
  const fallbackIcons = ['ri:group-line', 'ri:shopping-cart-line', 'ri:bar-chart-box-line']
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
    margin: 4px 0 10px 29px;
    font-size: 11px;
    color: var(--el-text-color-secondary);
  }

  .insight-list {
    display: grid;
    gap: 11px;
    padding: 0;
    margin: 14px 0 0;
    list-style: none;
  }

  .insight-list li {
    display: flex;
    gap: 11px;
    align-items: center;
    min-width: 0;
  }

  .insight-icon {
    display: grid;
    flex: 0 0 35px;
    place-items: center;
    width: 35px;
    height: 35px;
    font-size: 20px;
    color: #087dcc;
    background: #e5f5ff;
    border-radius: 50%;

    &.tone-1 {
      color: #7356d8;
      background: #f1edff;
    }

    &.tone-2 {
      color: #08a77a;
      background: #e3f8f1;
    }
  }

  .insight-copy {
    display: grid;
    gap: 2px;
    min-width: 0;

    strong {
      font-size: 13px;
      color: var(--el-text-color-primary);
    }

    small {
      font-size: 12px;
      line-height: 1.45;
      color: var(--el-text-color-secondary);
      overflow-wrap: anywhere;
    }
  }
</style>
