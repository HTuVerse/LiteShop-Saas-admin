<template>
  <section class="compact-search-panel">
    <div class="search-fields">
      <ElInput
        :model-value="modelValue.tableNumber"
        placeholder="桌位编号"
        clearable
        maxlength="20"
        @update:model-value="updateField('tableNumber', $event)"
        @keyup.enter="handleSearch"
      >
        <template #prefix
          ><ElIcon><Search /></ElIcon
        ></template>
      </ElInput>
      <ElInput
        :model-value="modelValue.tableName"
        placeholder="桌位名称"
        clearable
        maxlength="50"
        @update:model-value="updateField('tableName', $event)"
        @keyup.enter="handleSearch"
      >
        <template #prefix
          ><ElIcon><EditPen /></ElIcon
        ></template>
      </ElInput>
      <ElSelect
        :model-value="modelValue.status"
        placeholder="桌位状态"
        clearable
        @update:model-value="updateField('status', $event)"
      >
        <ElOption
          v-for="option in statusOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </ElSelect>
    </div>

    <div class="search-actions">
      <ElButton @click="handleReset">重置</ElButton>
      <ElButton type="primary" @click="handleSearch">
        <ElIcon><Search /></ElIcon>
        查询
      </ElButton>
      <span class="action-divider"></span>
      <ElButton :loading="loading" @click="emit('refresh')">
        <ElIcon><Refresh /></ElIcon>
        刷新
      </ElButton>
      <ElButton
        v-auth="['restaurant:table:clear', 'operations:table-cashier:clear']"
        type="danger"
        plain
        @click="emit('clear')"
      >
        <ElIcon><Delete /></ElIcon>
        清空门店会话
      </ElButton>
    </div>
  </section>
</template>

<script setup lang="ts">
  import { Delete, EditPen, Refresh, Search } from '@element-plus/icons-vue'

  const props = withDefaults(
    defineProps<{
      modelValue: Record<string, any>
      loading?: boolean
    }>(),
    { loading: false }
  )

  const emit = defineEmits<{
    (e: 'update:modelValue', value: Record<string, any>): void
    (e: 'search', params: Record<string, any>): void
    (e: 'reset' | 'refresh' | 'clear'): void
  }>()

  const statusOptions = [
    { label: '全部状态', value: '' },
    { label: '空闲', value: '空闲' },
    { label: '使用中', value: '使用中' },
    { label: '停用', value: '停用' }
  ]

  const updateField = (key: string, value: unknown) => {
    emit('update:modelValue', { ...props.modelValue, [key]: value ?? '' })
  }

  const handleReset = () => emit('reset')
  const handleSearch = () => emit('search', props.modelValue)
</script>

<style scoped lang="scss">
  .compact-search-panel {
    display: flex;
    gap: 14px;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    background: var(--el-bg-color);
    border: 1px solid rgb(95 121 143 / 10%);
    border-radius: 12px;
    marigin: 8px 0
  }

  .search-fields,
  .search-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .search-fields {
    flex: 1;
    min-width: 0;

    :deep(.el-input) {
      width: min(190px, 25%);
      min-width: 135px;
    }

    :deep(.el-select) {
      width: 150px;
      min-width: 130px;
    }
  }

  .search-actions {
    flex: 0 0 auto;

    :deep(.el-button) {
      min-height: 34px;
      padding: 7px 13px;
      margin-left: 0;
      border-radius: 8px;
    }
  }

  .action-divider {
    width: 1px;
    height: 22px;
    margin: 0 2px;
    background: var(--el-border-color-lighter);
  }

  :deep(.el-input__wrapper),
  :deep(.el-select__wrapper) {
    min-height: 34px;
    border-radius: 8px;
  }

  @media (width <= 1100px) {
    .compact-search-panel {
      flex-wrap: wrap;
    }

    .search-actions {
      justify-content: flex-end;
      width: 100%;
    }
  }

  @media (width <= 640px) {
    .search-fields {
      flex-wrap: wrap;

      :deep(.el-input),
      :deep(.el-select) {
        flex: 1 1 140px;
        width: auto;
      }
    }

    .search-actions {
      flex-wrap: wrap;
      justify-content: flex-start;
    }

    .action-divider {
      display: none;
    }
  }
</style>
