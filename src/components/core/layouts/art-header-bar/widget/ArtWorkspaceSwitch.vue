<template>
  <button class="workspace-switch" type="button" title="切换工作空间" @click="open">
    <ArtSvgIcon icon="ri:building-2-line" />
    <span class="workspace-copy">
      <strong>{{ title }}</strong>
      <small>{{ subtitle }}</small>
    </span>
    <ArtSvgIcon icon="ri:arrow-down-s-line" class="arrow" />
  </button>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { useRouter } from 'vue-router'
  import { useUserStore } from '@/store/modules/user'

  defineOptions({ name: 'ArtWorkspaceSwitch' })

  const router = useRouter()
  const session = useUserStore()
  const title = computed(() =>
    session.isSuperAdmin && !session.activeTenant
      ? '平台管理'
      : session.activeTenant?.tenantName || session.info.tenantCode || '工作空间'
  )
  const subtitle = computed(() =>
    session.isSuperAdmin
      ? session.activeTenant
        ? '超级管理员 · 商户视角'
        : '超级管理员'
      : session.info.roles?.includes('ADMIN')
      ? '商户管理员 · 全部门店'
      : session.activeStore?.storeName ||
        (session.info.activeStoreId == null ? '门店账号' : `门店 ${session.info.activeStoreId}`)
  )
  const open = () => router.push('/workspace/select')
</script>

<style scoped>
  .workspace-switch {
    display: flex;
    gap: 9px;
    align-items: center;
    min-width: 168px;
    max-width: 260px;
    height: 40px;
    padding: 5px 10px;
    color: var(--el-text-color-primary);
    cursor: pointer;
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 9px;
  }

  .workspace-switch:hover {
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary-light-5);
  }

  .workspace-copy {
    display: grid;
    min-width: 0;
    line-height: 1.2;
    text-align: left;
  }

  strong,
  small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    font-size: 12px;
    font-weight: 650;
  }

  small {
    margin-top: 3px;
    font-size: 10px;
    color: var(--el-text-color-secondary);
  }

  .arrow {
    margin-left: auto;
  }

  @media (width <= 760px) {
    .workspace-switch {
      justify-content: center;
      width: 38px;
      min-width: 0;
    }

    .workspace-copy,
    .arrow {
      display: none;
    }
  }
</style>
