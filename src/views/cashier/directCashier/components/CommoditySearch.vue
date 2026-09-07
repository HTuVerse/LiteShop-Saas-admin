<template>
  <div class="commodity-search">
    <ElCard shadow="never">
      <div class="search-toolbar">
        <ElInput
          ref="inputRef"
          v-model="keyword"
          placeholder="搜索商品名称、拼音或条码"
          :prefix-icon="Search"
          size="large"
          clearable
          @input="handleInput"
          @clear="handleClear"
        />
        <ElButton
          v-if="storeSwitcher"
          class="store-switcher"
          size="large"
          @click="storeSwitcher.openStoreDialog"
        >
          <ElIcon><Shop /></ElIcon>
          <span class="store-copy">
            <small>当前门店</small>
            <strong>{{ storeName }}</strong>
          </span>
          <ElIcon class="switch-icon"><Switch /></ElIcon>
        </ElButton>
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { computed, inject, onMounted, ref, unref } from 'vue'
  import { ElButton, ElCard, ElIcon, ElInput } from 'element-plus'
  import { Search, Shop, Switch } from '@element-plus/icons-vue'

  const emit = defineEmits(['search'])
  const keyword = ref('')
  const inputRef = ref()
  const storeSwitcher = inject<any>('cashierStoreSwitcher', null)
  const storeName = computed(() => unref(storeSwitcher?.currentStoreName) || '选择门店')

  const handleInput = () => emit('search', keyword.value)
  const handleClear = () => emit('search', '')

  onMounted(() => inputRef.value?.focus())
</script>

<style scoped lang="scss">
  .commodity-search {
    :deep(.el-card) {
      border: 0;
      border-radius: 12px;
    }

    :deep(.el-card__body) {
      padding: 8px;
    }

    :deep(.el-input__wrapper) {
      min-height: 40px;
      padding: 0 14px;
      background: var(--el-fill-color-blank);
      border: 1px solid var(--el-border-color-light);
      border-radius: 9px;
      box-shadow: none;

      &.is-focus {
        border-color: var(--el-color-primary);
        box-shadow: 0 0 0 3px var(--el-color-primary-light-9);
      }
    }
  }

  .search-toolbar {
    display: flex;
    gap: 8px;
    align-items: stretch;
  }

  .store-switcher {
    flex-shrink: 0;
    gap: 8px;
    height: 42px;
    padding: 0 12px;
    border-color: var(--el-border-color-light);
    border-radius: 9px;

    > .el-icon:first-child {
      font-size: 18px;
      color: var(--el-color-primary);
    }

    .store-copy {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      max-width: 130px;
      line-height: 1.15;

      small {
        margin-bottom: 2px;
        font-size: 9px;
        font-weight: 400;
        color: var(--el-text-color-secondary);
      }

      strong {
        overflow: hidden;
        font-size: 12px;
        color: var(--el-text-color-primary);
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .switch-icon {
      color: var(--el-text-color-placeholder);
    }
  }

  @media screen and (width <= 1100px) {
    .store-switcher {
      width: 42px;
      padding: 0;

      .store-copy,
      .switch-icon {
        display: none;
      }
    }
  }
</style>
