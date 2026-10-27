<template>
  <div class="tip-banner">
    <span class="tip-icon"><ArtSvgIcon icon="ri:lightbulb-flash-line" /></span>
    <p><strong>小贴士：</strong>{{ text }}</p>
  </div>
</template>

<script setup lang="ts">
  defineProps<{ text: string }>()
</script>

<style scoped lang="scss">
  .tip-banner {
    display: flex;
    gap: 11px;
    align-items: center;
    padding: 11px 15px;
    color: color-mix(in srgb, var(--el-color-primary) 42%, var(--el-text-color-primary));
    background: color-mix(in srgb, var(--el-color-primary) 7%, var(--el-bg-color));
    border-radius: 11px;

    p {
      margin: 0;
      font-size: 13px;
      line-height: 1.6;
      overflow-wrap: anywhere;
    }

    strong {
      color: var(--el-color-primary);
    }
  }

  .tip-icon {
    display: grid;
    flex: 0 0 28px;
    place-items: center;
    width: 28px;
    height: 28px;
    font-size: 21px;
    color: var(--el-color-primary);
  }
</style>
