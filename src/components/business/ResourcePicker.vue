<template>
  <ElDialog
    :model-value="modelValue"
    title="选择公开资源"
    width="min(900px, 95vw)"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <ArtForm inline @submit.prevent="search">
      <ElFormItem>
        <ElSelect v-model="tenantId" placeholder="选择资源库" style="width: 180px" @change="changeRoot">
          <ElOption v-for="root in roots" :key="root.tenantId" :label="root.name" :value="root.tenantId" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem>
        <ElSelect
          v-model="folderId"
          clearable
          placeholder="全部文件夹"
          style="width: 180px"
          @change="search"
        >
          <ElOption
            v-for="folder in folderOptions"
            :key="folder.id"
            :label="folder.label"
            :value="folder.id"
          />
        </ElSelect>
      </ElFormItem>
      <ElFormItem><ElInput v-model="keyword" clearable placeholder="搜索资源名称" /></ElFormItem>
      <ElButton type="primary" native-type="submit">搜索</ElButton>
    </ArtForm>
    <ArtTable
      row-key="id"
      :data="rows"
      :columns="columns"
      :loading="loading"
      :pagination="pagination"
      @pagination:size-change="handleSizeChange"
      @pagination:current-change="handleCurrentChange"
    >
      <template #preview="{ row }">
        <ElImage
          v-if="row.contentType?.startsWith('image/') && row.url"
          :src="row.url"
          fit="cover"
          class="picker-thumb"
        />
        <span v-else>{{ row.originalFileName }}</span>
      </template>
      <template #choose="{ row }"
        ><ElButton type="primary" text @click="choose(row)">选择</ElButton></template
      >
    </ArtTable>
  </ElDialog>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { useTable } from '@/hooks/core/useTable'
  import { listResources, listResourceFolders, listResourceRoots, type ResourceFile, type ResourceRoot } from '@/api/resource-library'
  import { useUserStore } from '@/store/modules/user'
  import type { NestedResourceFolder } from '@/api/resource-folders'

  const props = withDefaults(defineProps<{ modelValue: boolean; imageOnly?: boolean }>(), {
    imageOnly: true
  })
  const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    select: [file: ResourceFile]
  }>()
  const keyword = ref('')
  const userStore = useUserStore()
  const tenantId = ref(String(userStore.activeTenant?.id || userStore.info.tenantId || '0'))
  const roots = ref<ResourceRoot[]>([])
  const folderId = ref('')
  const folders = ref<NestedResourceFolder[]>([])
  const folderOptions = computed(() => {
    const result: { id: string; label: string }[] = []
    const visit = (parentId: string | null, depth: number) => {
      for (const folder of folders.value.filter((item) => (item.parentId || null) === parentId)) {
        result.push({ id: folder.id, label: `${'　'.repeat(depth)}${folder.name}` })
        visit(folder.id, depth + 1)
      }
    }
    visit(null, 0)
    return result
  })
  const {
    data: rows,
    columns,
    loading,
    pagination,
    replaceSearchParams,
    getData,
    handleSizeChange,
    handleCurrentChange
  } = useTable({
    core: {
      apiFn: listResources,
      apiParams: {
        currentPage: 1,
        pageSize: 10,
        visibility: 'PUBLIC' as const,
        type: props.imageOnly ? ('image' as const) : undefined
      },
      paginationKey: { current: 'currentPage', size: 'pageSize' },
      columnsFactory: () => [
        {
          prop: 'originalFileName',
          label: '预览',
          minWidth: 210,
          useSlot: true,
          slotName: 'preview'
        },
        { prop: 'originalFileName', label: '名称', minWidth: 220 },
        { prop: 'createdAt', label: '上传时间', width: 180 },
        { prop: 'operation', label: '操作', width: 90, useSlot: true, slotName: 'choose' }
      ]
    }
  })
  watch(
    () => props.modelValue,
    async (open) => {
      if (open) {
        const available = await listResourceRoots()
        roots.value = [
          ...(userStore.isSuperAdmin && !userStore.activeTenant
            ? [{ tenantId: '0', name: '平台资源', mode: 'PRIVATE' as const, permissions: 0, grants: [], myPermissions: 15 }]
            : []),
          ...available
        ].filter((root) => (root.myPermissions & 2) !== 0)
        if (!roots.value.some((root) => root.tenantId === tenantId.value))
          tenantId.value = roots.value[0]?.tenantId || ''
        await changeRoot()
      }
    }
  )
  async function changeRoot() {
    folderId.value = ''
    folders.value = tenantId.value ? await listResourceFolders(tenantId.value) : []
    search()
  }
  function search() {
    replaceSearchParams({
      keyword: keyword.value || undefined,
      folderId: folderId.value || undefined,
      tenantId: tenantId.value || undefined,
      purpose: 'SELECT',
      visibility: 'PUBLIC',
      type: props.imageOnly ? 'image' : undefined
    })
    getData()
  }
  function choose(file: ResourceFile) {
    emit('select', file)
    emit('update:modelValue', false)
  }
</script>

<style scoped>
  .picker-thumb {
    width: 54px;
    height: 54px;
    border-radius: 6px;
  }
</style>
