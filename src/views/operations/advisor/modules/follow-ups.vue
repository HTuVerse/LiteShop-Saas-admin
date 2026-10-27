<template>
  <section class="follow-ups" aria-label="你可能还想问">
    <h3>你可能还想问</h3>
    <div class="follow-up-list">
      <button
        v-for="(question, index) in questions"
        :key="`${question}-${index}`"
        type="button"
        :disabled="disabled"
        @click="emit('ask', question)"
      >
        <ArtSvgIcon :icon="icons[index % icons.length]" />
        <span>{{ question }}</span>
        <ArtSvgIcon class="follow-arrow" icon="ri:arrow-right-s-line" />
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
  defineProps<{ questions: string[]; disabled?: boolean }>()
  const emit = defineEmits<{ ask: [question: string] }>()
  const icons = ['ri:bar-chart-grouped-line', 'ri:line-chart-line', 'ri:lightbulb-line']
</script>

<style scoped lang="scss">
  .follow-ups {
    padding-top: 13px;
    border-top: 1px solid var(--el-border-color-lighter);

    h3 {
      margin: 0 0 10px;
      font-size: 12px;
      font-weight: 500;
      color: var(--el-text-color-secondary);
    }
  }

  .follow-up-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;

    button {
      display: inline-flex;
      gap: 8px;
      align-items: center;
      justify-content: space-between;
      max-width: 100%;
      min-height: 37px;
      padding: 7px 10px;
      font: inherit;
      font-size: 12px;
      color: var(--el-text-color-primary);
      text-align: left;
      cursor: pointer;
      background: color-mix(in srgb, var(--el-color-primary) 3%, var(--el-bg-color));
      border: 1px solid var(--el-color-primary-light-7);
      border-radius: 10px;
      transition:
        background-color 160ms ease,
        border-color 160ms ease;

      &:hover:not(:disabled) {
        background: var(--el-color-primary-light-9);
        border-color: var(--el-color-primary-light-5);
      }

      &:focus-visible {
        outline: 2px solid var(--el-color-primary);
        outline-offset: 2px;
      }

      &:disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }

      .art-svg-icon {
        flex: 0 0 auto;
        font-size: 18px;
        color: var(--el-color-primary);
      }

      .follow-arrow {
        margin-left: auto;
        font-size: 16px;
      }

      span {
        min-width: 0;
        overflow-wrap: anywhere;
      }
    }
  }
</style>
