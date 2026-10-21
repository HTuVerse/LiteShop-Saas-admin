<template>
  <ElDialog
    :model-value="modelValue"
    :title="imageOnly ? '选择资源库图片' : '选择资源库文件'"
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
        <ElImage v-if="isImage(row)" :src="imageUrl(row)" :preview-src-list="[imageUrl(row)]"
          fit="cover" class="picker-thumb" preview-teleported>
          <template #error><span class="picker-no-preview">暂无预览</span></template>
        </ElImage>
        <span v-else class="picker-no-preview">文件</span>
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
          label: '图片',
          width: 92,
          useSlot: true,
          slotName: 'preview'
        },
        { prop: 'originalFileName', label: '文件名', minWidth: 280, showOverflowTooltip: true },
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
        roots.value = available.filter((root) => (root.myPermissions & 2) !== 0)
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
  function isImage(file: ResourceFile) {
    return file.contentType?.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.originalFileName)
  }
  function imageUrl(file: ResourceFile) {
    return file.url || `${(import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')}/images/resource/${file.id}`
  }
</script>

<style scoped>
  .picker-thumb {
    width: 58px;
    height: 58px;
    border-radius: 6px;
  }
  .picker-no-preview {
    display: grid;
    place-items: center;
    width: 58px;
    height: 58px;
    font-size: 11px;
    color: var(--el-text-color-placeholder);
    background: var(--el-fill-color-light);
    border-radius: 6px;
  }
</style>
