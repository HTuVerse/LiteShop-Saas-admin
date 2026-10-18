<template>
  <div class="resource-page art-full-height">
    <div class="page-title">
      <div>
        <h2>资源库</h2>
        <p>集中查看所有商户和用户上传的图片、文档与附件。</p>
      </div>
      <div class="title-actions">
        <ElButton @click="storageConfigVisible = true">存储配置</ElButton>
        <ElButton @click="createFolder">新建文件夹</ElButton>
        <ElSelect v-model="uploadVisibility" style="width: 120px" aria-label="上传访问权限">
          <ElOption label="公开资源" value="PUBLIC" />
          <ElOption label="私有资源" value="PRIVATE" />
        </ElSelect>
        <ElButton type="primary" :loading="uploading" @click="fileInput?.click()">
          上传文件
        </ElButton>
        <input ref="fileInput" class="hidden-input" type="file" multiple @change="onFilesSelected" />
      </div>
    </div>

    <ElProgress v-if="uploading" :percentage="uploadProgress" :stroke-width="8" />
    <ElAlert v-if="failedFiles.length" type="warning" :closable="false" show-icon>
      {{ failedFiles.length }} 个文件上传失败。<ElButton link @click="retryUpload">重试失败文件</ElButton>
    </ElAlert>

    <div class="resource-layout">
      <ElCard class="folder-card" shadow="never">
        <div class="folder-heading">文件夹</div>
        <button class="folder-item" :class="{ active: folderFilter === undefined }" @click="selectFolder()">
          <span>全部资源</span>
        </button>
        <button class="folder-item" :class="{ active: folderFilter === '0' }" @click="selectFolder('0')">
          <span>未分类</span>
        </button>
        <div v-for="folder in folders" :key="folder.id" class="folder-row">
          <button class="folder-item" :class="{ active: folderFilter === folder.id }" @click="selectFolder(folder.id)">
            <span class="folder-name">{{ folder.name }}</span>
          </button>
          <ElDropdown trigger="click" @command="(command: string) => folderCommand(command, folder)">
            <ElButton text size="small" aria-label="文件夹操作">···</ElButton>
            <template #dropdown>
              <ElDropdownMenu>
                <ElDropdownItem command="rename">重命名</ElDropdownItem>
                <ElDropdownItem command="delete">删除</ElDropdownItem>
              </ElDropdownMenu>
            </template>
          </ElDropdown>
        </div>
      </ElCard>

      <ElCard class="art-table-card files-card" shadow="never" @dragover.prevent @drop.prevent="onDrop">
        <ArtForm class="search-form" inline @submit.prevent="search">
          <ElFormItem><ElInput v-model="filters.keyword" clearable placeholder="搜索文件名" /></ElFormItem>
          <ElFormItem>
            <ElSelect v-model="filters.type" clearable placeholder="全部类型" style="width: 130px">
              <ElOption label="图片" value="image" />
              <ElOption label="其他文件" value="file" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem>
            <ElSelect v-model="filters.visibility" clearable placeholder="全部权限" style="width: 130px">
              <ElOption label="公开" value="PUBLIC" />
              <ElOption label="私有" value="PRIVATE" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem><ElInput v-model="filters.tenantId" clearable placeholder="商户 ID" /></ElFormItem>
          <ElFormItem><ElInput v-model="filters.uploaderId" clearable placeholder="上传者 ID" /></ElFormItem>
          <ElButton type="primary" native-type="submit">搜索</ElButton>
          <ElButton @click="resetFilters">重置</ElButton>
        </ArtForm>

        <div class="drop-hint">可拖拽文件到此处上传 · 默认按上方访问权限保存</div>
        <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
          <template #left>
            <ElSpace wrap>
              <span class="selected-count">已选 {{ selected.length }} 项</span>
              <ElButton :disabled="!selected.length" @click="openMove(selected.map((item) => item.id))">批量移动</ElButton>
              <ElButton :disabled="!selected.length" type="danger" plain @click="remove(selected.map((item) => item.id))">批量删除</ElButton>
            </ElSpace>
          </template>
        </ArtTableHeader>

        <ArtTable
          row-key="id"
          :data="rows"
          :columns="columns"
          :loading="loading"
          :pagination="pagination"
          @selection-change="(items: ResourceFile[]) => (selected = items)"
          @pagination:size-change="handleSizeChange"
          @pagination:current-change="handleCurrentChange"
        >
          <template #resourceName="{ row }">
            <div class="file-name-cell">
              <ElImage v-if="isImage(row) && row.url" :src="row.url" fit="cover" class="thumbnail" @click="preview(row)" />
              <div v-else class="file-icon">{{ extension(row.originalFileName) }}</div>
              <button class="name-button" @click="preview(row)">{{ row.originalFileName }}</button>
            </div>
          </template>
          <template #resourceActions="{ row }">
            <ElSpace>
              <ElButton text type="primary" @click="preview(row)">预览</ElButton>
              <ElButton text type="primary" @click="download(row)">下载</ElButton>
              <ElButton v-if="row.visibility !== 'PRIVATE'" text type="primary" @click="copyUrl(row)">复制链接</ElButton>
              <ElDropdown @command="(command: string) => fileCommand(command, row)">
                <ElButton text type="primary">更多</ElButton>
                <template #dropdown>
                  <ElDropdownMenu>
                    <ElDropdownItem command="rename">重命名</ElDropdownItem>
                    <ElDropdownItem command="move">移动到文件夹</ElDropdownItem>
                    <ElDropdownItem command="visibility">切换公开/私有</ElDropdownItem>
                    <ElDropdownItem command="delete">删除</ElDropdownItem>
                  </ElDropdownMenu>
                </template>
              </ElDropdown>
            </ElSpace>
          </template>
        </ArtTable>
      </ElCard>
    </div>

    <ElDialog v-model="previewVisible" :title="previewFile?.originalFileName" width="min(850px, 94vw)">
      <div class="preview-content">
        <ElImage v-if="previewFile && isImage(previewFile) && previewUrl" :src="previewUrl" fit="contain" />
        <iframe v-else-if="previewFile?.contentType === 'application/pdf' && previewUrl" :src="previewUrl" title="PDF 预览" />
        <video v-else-if="previewFile?.contentType?.startsWith('video/') && previewUrl" :src="previewUrl" controls class="preview-video" />
        <div v-else>此类型暂不支持在线预览，请下载查看。</div>
      </div>
      <template #footer><ElButton v-if="previewFile" @click="download(previewFile)">下载</ElButton></template>
    </ElDialog>

    <ElDialog v-model="moveVisible" title="移动到文件夹" width="420px">
      <ArtForm label-width="90px">
        <ElFormItem label="目标文件夹">
          <ElSelect v-model="moveFolderId" placeholder="未分类" style="width: 100%">
            <ElOption label="未分类" value="" />
            <ElOption v-for="folder in folders" :key="folder.id" :label="folder.name" :value="folder.id" />
          </ElSelect>
        </ElFormItem>
      </ArtForm>
      <template #footer>
        <ElButton @click="moveVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="confirmMove">确定</ElButton>
      </template>
    </ElDialog>

    <ElDialog v-model="storageConfigVisible" title="文件存储配置" width="min(900px, 96vw)" destroy-on-close>
      <PlatformServicesConfig file-only />
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { onMounted, reactive, ref, watch } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import PlatformServicesConfig from '@/views/config/website/modules/platform-services-config.vue'
  import {
    listResources, listResourceFolders, createResourceFolder, renameResourceFolder,
    deleteResourceFolder, uploadResources, renameResource, moveResources, deleteResources,
    downloadResource,
    getResourceAccessUrl, setResourceVisibility,
    type ResourceFile, type ResourceFolder
  } from '@/api/resource-library'

  defineOptions({ name: 'PlatformResources' })

  const folders = ref<ResourceFolder[]>([])
  const folderFilter = ref<string>()
  const filters = reactive({ keyword: '', type: '' as '' | 'image' | 'file',
    visibility: '' as '' | 'PUBLIC' | 'PRIVATE', tenantId: '', uploaderId: '' })
  const selected = ref<ResourceFile[]>([])
  const fileInput = ref<HTMLInputElement>()
  const uploading = ref(false)
  const uploadVisibility = ref<'PUBLIC' | 'PRIVATE'>('PUBLIC')
  const uploadProgress = ref(0)
  const failedFiles = ref<File[]>([])
  const saving = ref(false)
  const previewVisible = ref(false)
  const previewFile = ref<ResourceFile>()
  const previewUrl = ref('')
  const moveVisible = ref(false)
  const storageConfigVisible = ref(false)
  const moveIds = ref<string[]>([])
  const moveFolderId = ref('')
  const storageLabels: Record<number, string> = { 0: 'Local', 1: '七牛', 2: 'MinIO', 3: '阿里云' }

  const { data: rows, columns, columnChecks, loading, pagination, getData, replaceSearchParams,
    refreshData, refreshCreate, refreshUpdate, refreshRemove, handleSizeChange, handleCurrentChange } = useTable({
    core: {
      apiFn: listResources,
      apiParams: { currentPage: 1, pageSize: 20 },
      paginationKey: { current: 'currentPage', size: 'pageSize' },
      columnsFactory: () => [
        { type: 'selection', width: 48 },
        { prop: 'originalFileName', label: '文件名', minWidth: 280, useSlot: true, slotName: 'resourceName' },
        { prop: 'size', label: '大小', width: 110, formatter: (row: ResourceFile) => formatSize(row.size) },
        { prop: 'contentType', label: '类型', minWidth: 145 },
        { prop: 'storageType', label: '存储', width: 90, formatter: (row: ResourceFile) => storageLabels[row.storageType] || '-' },
        { prop: 'visibility', label: '权限', width: 85, formatter: (row: ResourceFile) => row.visibility === 'PRIVATE' ? '私有' : '公开' },
        { prop: 'tenantId', label: '商户 ID', width: 125, formatter: (row: ResourceFile) => row.tenantId === '0' ? '平台' : row.tenantId || '历史资源' },
        { prop: 'uploaderId', label: '上传者 ID', width: 125, formatter: (row: ResourceFile) => row.uploaderId || '未知' },
        { prop: 'folderId', label: '文件夹', minWidth: 130, formatter: (row: ResourceFile) => folders.value.find((item) => item.id === row.folderId)?.name || '未分类' },
        { prop: 'createdAt', label: '上传时间', width: 180, formatter: (row: ResourceFile) => row.createdAt?.replace('T', ' ').slice(0, 19) || '-' },
        { prop: 'operation', label: '操作', width: 195, fixed: 'right', useSlot: true, slotName: 'resourceActions' }
      ]
    }
  })

  const isImage = (file: ResourceFile) => file.contentType?.startsWith('image/') === true
  const extension = (name: string) => name.split('.').pop()?.slice(0, 4).toUpperCase() || 'FILE'
  const formatSize = (size: number) => size < 1024 ? `${size} B` : size < 1048576 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1048576).toFixed(1)} MB`

  async function loadFolders() { folders.value = await listResourceFolders() }
  function search() {
    replaceSearchParams({ keyword: filters.keyword || undefined, type: filters.type || undefined,
      visibility: filters.visibility || undefined,
      tenantId: filters.tenantId || undefined, uploaderId: filters.uploaderId || undefined,
      folderId: folderFilter.value })
    getData()
  }
  function resetFilters() {
    Object.assign(filters, { keyword: '', type: '', visibility: '', tenantId: '', uploaderId: '' })
    search()
  }
  function selectFolder(id?: string) { folderFilter.value = id; search() }

  async function createFolder() {
    try {
      const { value } = await ElMessageBox.prompt('输入文件夹名称', '新建文件夹', { inputPattern: /\S/, inputErrorMessage: '请输入名称' })
      await createResourceFolder(value.trim())
      await loadFolders()
      ElMessage.success('文件夹已创建')
    } catch { /* 取消输入或请求失败由公共层提示 */ }
  }
  async function folderCommand(command: string, folder: ResourceFolder) {
    try {
      if (command === 'rename') {
        const { value } = await ElMessageBox.prompt('输入新名称', '重命名文件夹', { inputValue: folder.name, inputPattern: /\S/, inputErrorMessage: '请输入名称' })
        await renameResourceFolder(folder.id, value.trim())
      } else {
        await ElMessageBox.confirm(`确定删除空文件夹「${folder.name}」？`, '删除文件夹', { type: 'warning' })
        await deleteResourceFolder(folder.id)
        if (folderFilter.value === folder.id) folderFilter.value = undefined
      }
      await loadFolders()
      await refreshData()
      ElMessage.success('操作成功')
    } catch { /* 取消操作或请求失败由公共层提示 */ }
  }
  async function onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement
    const files = Array.from(input.files || [])
    input.value = ''
    await uploadFiles(files)
  }
  async function onDrop(event: DragEvent) { await uploadFiles(Array.from(event.dataTransfer?.files || [])) }
  async function retryUpload() { const files = [...failedFiles.value]; failedFiles.value = []; await uploadFiles(files) }
  async function uploadFiles(files: File[]) {
    if (!files.length || uploading.value) return
    uploading.value = true
    uploadProgress.value = 0
    failedFiles.value = []
    try {
      let uploaded = 0
      // 单文件请求使失败项可精确重试，资源库仍支持一次选择多个文件。
      for (const file of files) {
        try {
          await uploadResources([file], folderFilter.value && folderFilter.value !== '0' ? folderFilter.value : undefined,
            uploadVisibility.value, (percent) => { uploadProgress.value = Math.round((uploaded + percent / 100) / files.length * 100) })
        } catch { failedFiles.value.push(file) }
        uploaded++
      }
      if (uploaded > failedFiles.value.length) ElMessage.success(`已上传 ${uploaded - failedFiles.value.length} 个文件`)
      await refreshCreate()
    } finally { uploading.value = false }
  }
  async function preview(file: ResourceFile) {
    previewFile.value = file
    previewUrl.value = ''
    previewVisible.value = true
    if (file.visibility === 'PRIVATE') {
      const signed = await getResourceAccessUrl(file.id)
      previewUrl.value = signed || URL.createObjectURL(await downloadResource(file.id))
    } else previewUrl.value = file.url || ''
  }
  watch(previewVisible, (visible) => {
    if (!visible && previewUrl.value.startsWith('blob:')) URL.revokeObjectURL(previewUrl.value)
  })
  async function download(file: ResourceFile) {
    if (file.size > 20 * 1024 * 1024 || file.contentType?.startsWith('video/')) {
      const url = file.visibility === 'PRIVATE' ? await getResourceAccessUrl(file.id) : file.url
      if (url) { window.open(url, '_blank', 'noopener,noreferrer'); return }
    }
    const blob = await downloadResource(file.id)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = file.originalFileName
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  async function copyUrl(file: ResourceFile) {
    if (file.visibility === 'PRIVATE' || !file.url) return
    await navigator.clipboard.writeText(file.url)
    ElMessage.success('公开链接已复制')
  }
  function openMove(ids: string[]) { moveIds.value = ids; moveFolderId.value = ''; moveVisible.value = true }
  async function confirmMove() {
    saving.value = true
    try {
      await moveResources(moveIds.value, moveFolderId.value || null)
      moveVisible.value = false
      selected.value = []
      await refreshUpdate()
      ElMessage.success('已移动')
    } finally { saving.value = false }
  }
  async function remove(ids: string[]) {
    try {
      await ElMessageBox.confirm(`删除选中的 ${ids.length} 个资源？文件将从存储中移除，无法恢复。`, '删除资源', { type: 'warning' })
      await deleteResources(ids)
      selected.value = []
      await refreshRemove()
      ElMessage.success('已删除')
    } catch { /* 取消操作或请求失败由公共层提示 */ }
  }
  async function fileCommand(command: string, file: ResourceFile) {
    if (command === 'move') { openMove([file.id]); return }
    if (command === 'delete') { await remove([file.id]); return }
    if (command === 'visibility') {
      const target = file.visibility === 'PRIVATE' ? 'PUBLIC' : 'PRIVATE'
      try {
        await ElMessageBox.confirm(`确定将「${file.originalFileName}」改为${target === 'PUBLIC' ? '公开' : '私有'}？${target === 'PRIVATE' ? '原地址会从源站撤销；若已接入 CDN，仍需清理缓存。' : '新地址将允许匿名访问。'}`, '切换访问权限')
        await setResourceVisibility(file.id, target)
        await refreshUpdate()
        ElMessage.success('访问权限已更新')
      } catch { /* 取消或公共请求提示 */ }
      return
    }
    try {
      const { value } = await ElMessageBox.prompt('输入新文件名', '重命名资源', { inputValue: file.originalFileName, inputPattern: /\S/, inputErrorMessage: '请输入名称' })
      await renameResource(file.id, value.trim())
      await refreshUpdate()
      ElMessage.success('已重命名')
    } catch { /* 取消输入或请求失败由公共层提示 */ }
  }
  onMounted(loadFolders)
</script>

<style scoped lang="scss">
  .resource-page { display: flex; flex-direction: column; gap: 16px; }
  .page-title { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .page-title h2 { margin: 0 0 4px; font-size: 22px; font-weight: 600; }
  .page-title p { margin: 0; color: var(--el-text-color-secondary); }
  .title-actions { display: flex; gap: 8px; }
  .hidden-input { display: none; }
  .resource-layout { display: grid; grid-template-columns: 210px minmax(0, 1fr); gap: 16px; min-height: 0; }
  .folder-card { height: fit-content; }
  .folder-heading { margin-bottom: 12px; font-weight: 600; }
  .folder-row { display: flex; align-items: center; }
  .folder-item { display: flex; flex: 1; min-width: 0; padding: 10px; border: 0; border-radius: 6px; background: transparent; color: var(--el-text-color-regular); text-align: left; cursor: pointer; }
  .folder-item:hover, .folder-item.active { background: var(--el-color-primary-light-9); color: var(--el-color-primary); }
  .folder-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .files-card { min-width: 0; }
  .search-form { margin-bottom: 8px; }
  .selected-count { color: var(--el-text-color-secondary); font-size: 13px; }
  .file-name-cell { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .thumbnail, .file-icon { flex: none; width: 36px; height: 36px; border-radius: 5px; }
  .thumbnail { cursor: pointer; }
  .file-icon { display: grid; place-items: center; background: var(--el-fill-color-light); font-size: 10px; font-weight: 700; }
  .name-button { overflow: hidden; border: 0; background: transparent; color: var(--el-color-primary); text-align: left; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
  .preview-content { display: grid; min-height: 320px; place-items: center; }
  .preview-content :deep(.el-image) { max-width: 100%; max-height: 68vh; }
  .preview-content iframe { width: 100%; height: 68vh; border: 0; }
  .preview-video { max-width: 100%; max-height: 68vh; }
  .drop-hint { margin: 4px 0 12px; color: var(--el-text-color-secondary); font-size: 12px; }
  @media (max-width: 900px) { .resource-layout { grid-template-columns: 1fr; } .page-title { align-items: flex-start; flex-direction: column; } }
</style>
