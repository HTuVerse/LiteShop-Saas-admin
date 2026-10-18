<template>
  <ElDialog :model-value="modelValue" title="选择公开资源" width="min(900px, 95vw)" @update:model-value="emit('update:modelValue', $event)">
    <ArtForm inline @submit.prevent="search">
      <ElFormItem><ElInput v-model="keyword" clearable placeholder="搜索资源名称" /></ElFormItem>
      <ElButton type="primary" native-type="submit">搜索</ElButton>
    </ArtForm>
    <ArtTable
      row-key="id" :data="rows" :columns="columns" :loading="loading" :pagination="pagination"
      @pagination:size-change="handleSizeChange" @pagination:current-change="handleCurrentChange"
    >
      <template #preview="{ row }">
        <ElImage v-if="row.contentType?.startsWith('image/') && row.url" :src="row.url" fit="cover" class="picker-thumb" />
        <span v-else>{{ row.originalFileName }}</span>
      </template>
      <template #choose="{ row }"><ElButton type="primary" text @click="choose(row)">选择</ElButton></template>
    </ArtTable>
  </ElDialog>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { useTable } from '@/hooks/core/useTable'
  import { listResources, type ResourceFile } from '@/api/resource-library'

  const props = withDefaults(defineProps<{ modelValue: boolean; imageOnly?: boolean }>(), { imageOnly: true })
  const emit = defineEmits<{ 'update:modelValue': [value: boolean]; select: [file: ResourceFile] }>()
  const keyword = ref('')
  const { data: rows, columns, loading, pagination, replaceSearchParams, getData,
    handleSizeChange, handleCurrentChange } = useTable({
    core: {
      apiFn: listResources,
      apiParams: { currentPage: 1, pageSize: 10, visibility: 'PUBLIC' as const,
        type: props.imageOnly ? 'image' as const : undefined },
      paginationKey: { current: 'currentPage', size: 'pageSize' },
      columnsFactory: () => [
        { prop: 'originalFileName', label: '预览', minWidth: 210, useSlot: true, slotName: 'preview' },
        { prop: 'originalFileName', label: '名称', minWidth: 220 },
        { prop: 'createdAt', label: '上传时间', width: 180 },
        { prop: 'operation', label: '操作', width: 90, useSlot: true, slotName: 'choose' }
      ]
    }
  })
  function search() { replaceSearchParams({ keyword: keyword.value || undefined }); getData() }
  function choose(file: ResourceFile) { emit('select', file); emit('update:modelValue', false) }
</script>

<style scoped>
  .picker-thumb { width: 54px; height: 54px; border-radius: 6px; }
</style>
