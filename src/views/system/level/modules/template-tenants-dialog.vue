<template>
  <ElDialog
    v-model="visible"
    :title="'分配体系：' + template.name"
    width="min(660px,94vw)"
    align-center
    :close-on-click-modal="false"
    :close-on-press-escape="!saving"
    :show-close="!saving"
  >
    <ElAlert
      :title="
        template.isDefault === 1
          ? '当前为平台默认体系，所有租户均可使用'
          : '分配后，租户可以自行选择使用这套体系'
      "
      :description="
        template.isDefault === 1
          ? '这里的名单用于保留指定租户的使用权限：以后更换平台默认体系，这些租户仍可以选择本体系。'
          : '保存分配不会切换租户当前体系。取消分配后，租户已复制的方案仍保留。'
      "
      type="info"
      :closable="false"
      show-icon
    />
    <ElAlert v-if="loadError" class="load-error" :title="loadError" type="error" :closable="false">
      <ElButton link type="primary" @click="initialize">重新加载</ElButton>
    </ElAlert>
    <div class="tenant-picker">
      <label id="template-tenant-label">可选用此体系的租户</label>
      <ElSelect
        v-model="tenantIds"
        aria-labelledby="template-tenant-label"
        multiple
        filterable
        remote
        remote-show-suffix
        :remote-method="search"
        :reserve-keyword="false"
        :multiple-limit="1000"
        :loading="searching || loading"
        :disabled="!loaded || saving"
        collapse-tags
        collapse-tags-tooltip
        :max-collapse-tags="5"
        placeholder="输入商户名称或编码搜索，可选择多个租户"
        style="width: 100%"
      >
        <ElOption
          v-for="tenant in options"
          :key="tenant.id"
          :value="String(tenant.id)"
          :label="
            tenant.tenantName +
            '（' +
            tenant.tenantCode +
            '）' +
            (tenant.status === 1 ? '' : ' · 已停用')
          "
        />
      </ElSelect>
      <div class="picker-actions">
        <span>已选择 {{ tenantIds.length }} 个租户</span>
        <ElButton
          v-if="hasMore"
          link
          type="primary"
          :loading="searching"
          :disabled="saving"
          @click="loadMore"
          >加载更多搜索结果</ElButton
        >
      </div>
    </div>
    <template #footer>
      <ElButton :disabled="saving" @click="visible = false">取消</ElButton>
      <ElButton type="primary" :loading="saving" :disabled="!loaded || loading" @click="save"
        >保存分配</ElButton
      >
    </template>
  </ElDialog>
</template>
<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { ElMessage } from 'element-plus'
  import { listTenants } from '@/api/tenant'
  import {
    assignLevelTemplateTenants,
    listLevelTemplateTenants,
    type LevelScheme
  } from '@/api/member-level'
  import type { Tenant } from '@/types/backend'

  const props = defineProps<{ template: LevelScheme }>()
  const visible = defineModel<boolean>({ required: true })
  const tenantIds = ref<string[]>([])
  const options = ref<Tenant[]>([])
  const loading = ref(false),
    searching = ref(false),
    saving = ref(false),
    loaded = ref(false)
  const loadError = ref(''),
    keyword = ref(''),
    page = ref(1),
    total = ref(0)
  const hasMore = computed(() => page.value * 50 < total.value)
  let generation = 0,
    searchVersion = 0

  function mergeOptions(next: Tenant[]) {
    const existing = new Map(options.value.map((t) => [String(t.id), t]))
    for (const tenant of next) existing.set(String(tenant.id), tenant)
    options.value = [...existing.values()]
  }
  async function initialize() {
    const current = ++generation
    searchVersion++
    loaded.value = false
    loading.value = true
    searching.value = false
    loadError.value = ''
    tenantIds.value = []
    options.value = []
    keyword.value = ''
    page.value = 1
    total.value = 0
    try {
      const [assigned, tenants] = await Promise.all([
        listLevelTemplateTenants(props.template.id),
        listTenants({ currentPage: 1, pageSize: 50 })
      ])
      if (current !== generation || !visible.value) return
      tenantIds.value = assigned.map((t) => String(t.id))
      mergeOptions([...assigned, ...tenants.records])
      total.value = tenants.total
      loaded.value = true
    } catch {
      if (current === generation) loadError.value = '分配名单加载失败，请重新加载后再保存。'
    } finally {
      if (current === generation) loading.value = false
    }
  }
  async function query(nextPage: number) {
    const current = generation,
      request = ++searchVersion
    searching.value = true
    try {
      const result = await listTenants({
        currentPage: nextPage,
        pageSize: 50,
        keyword: keyword.value || undefined
      })
      if (current !== generation || request !== searchVersion || !visible.value) return
      if (nextPage === 1)
        options.value = options.value.filter((t) => tenantIds.value.includes(String(t.id)))
      mergeOptions(result.records)
      page.value = nextPage
      total.value = result.total
    } catch {
      // Keep the selected tenants if a search fails; the API displays the error.
    } finally {
      if (current === generation && request === searchVersion) searching.value = false
    }
  }
  function search(value: string) {
    keyword.value = value
    void query(1)
  }
  function loadMore() {
    if (!searching.value) void query(page.value + 1)
  }
  async function save() {
    if (!loaded.value || saving.value) return
    saving.value = true
    try {
      await assignLevelTemplateTenants(props.template.id, [...tenantIds.value])
      ElMessage.success('租户可选等级体系已更新')
      visible.value = false
    } catch {
      // Preserve selections for retry; the API displays the error.
    } finally {
      saving.value = false
    }
  }
  watch(
    () => [visible.value, props.template.id],
    () => {
      if (visible.value) void initialize()
      else {
        generation++
        searchVersion++
      }
    },
    { immediate: true }
  )
</script>
<style scoped>
  .tenant-picker {
    margin-top: 24px;
  }

  label {
    display: block;
    margin-bottom: 12px;
  }

  .load-error {
    margin-top: 16px;
  }

  .picker-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: space-between;
    margin-top: 12px;
    color: var(--el-text-color-secondary);
  }
</style>
