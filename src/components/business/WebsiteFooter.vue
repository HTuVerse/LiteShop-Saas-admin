<template>
  <div v-if="visible" class="website-footer">
    <div v-if="config.contactEmail || config.contactPhone" class="footer-line"
      ><span v-if="config.contactEmail">{{ config.contactEmail }}</span
      ><span v-if="config.contactPhone">{{ config.contactPhone }}</span></div
    >
    <div v-if="config.contactAddress">{{ config.contactAddress }}</div>
    <div v-if="config.copyright">{{ config.copyright }}</div>
    <div class="footer-line"
      ><a
        v-if="config.icpNumber"
        href="https://beian.miit.gov.cn/"
        target="_blank"
        rel="noopener noreferrer"
        >{{ config.icpNumber }}</a
      ><a
        v-if="config.publicSecurityNumber"
        href="https://beian.mps.gov.cn/"
        target="_blank"
        rel="noopener noreferrer"
        >{{ config.publicSecurityNumber }}</a
      ></div
    >
  </div>
</template>
<script setup lang="ts">
  import { computed } from 'vue'
  import type { PublicWebsiteConfig } from '@/config/website'
  const props = defineProps<{ config: PublicWebsiteConfig }>()
  const visible = computed(() =>
    [
      props.config.contactEmail,
      props.config.contactPhone,
      props.config.contactAddress,
      props.config.copyright,
      props.config.icpNumber,
      props.config.publicSecurityNumber
    ].some(Boolean)
  )
</script>
<style scoped>
  .website-footer {
    font-size: 12px;
    line-height: 1.9;
    color: var(--el-text-color-secondary);
    overflow-wrap: anywhere;
  }

  .footer-line {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 16px;
    justify-content: center;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  a:hover {
    color: var(--el-color-primary);
    text-decoration: underline;
  }
</style>
