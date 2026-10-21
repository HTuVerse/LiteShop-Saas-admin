<template>
  <div class="tenant-library art-full-height">
    <header class="library-header">
      <div><h2>我的资源库</h2><p>管理自己的文件，访问平台或其他租户开放的资源。</p></div>
      <div class="header-actions">
        <ElSelect v-model="uploadVisibility" class="visibility-select" :disabled="!canUpload">
          <ElOption label="公开上传" value="PUBLIC" /><ElOption label="私有上传" value="PRIVATE" />
        </ElSelect>
        <ElButton v-if="canEdit" @click="createFolder()">新建文件夹</ElButton>
        <ElButton v-if="canUpload" type="primary" :loading="uploading" @click="fileInput?.click()">上传文件</ElButton>
        <input ref="fileInput" hidden type="file" multiple @change="onFilesSelected" />
      </div>
    </header>
    <div class="library-layout">
      <aside class="library-sidebar">
        <h3>可访问的资源库</h3>
        <button v-for="root in roots" :key="root.tenantId" class="sidebar-item"
          :class="{ active: selectedRootId === root.tenantId }" @click="selectRoot(root.tenantId)">
          <ArtSvgIcon icon="ri:folder-3-line" /><span>{{ root.tenantId === ownTenantId ? '我的资源' : root.name }}</span>
          <small v-if="root.tenantId !== ownTenantId">共享</small>
        </button>
        <h3 class="folder-title">文件夹
          <ElButton v-if="canEdit" text size="small" aria-label="新建文件夹" @click="createFolder()">
            <ArtSvgIcon icon="ri:add-line" />
          </ElButton>
        </h3>
        <button class="sidebar-item" :class="{ active: folderId === undefined }" @click="selectFolder()">
          <ArtSvgIcon icon="ri:folder-open-line" /><span>全部文件</span>
        </button>
        <button v-if="(currentRoot?.myPermissions || 0) & 1" class="sidebar-item" :class="{ active: folderId === '0' }" @click="selectFolder('0')">
          <ArtSvgIcon icon="ri:folder-line" /><span>未分类</span>
        </button>
        <div v-for="folder in visibleFolders" :key="folder.id" class="folder-row"
          :class="{ active: folderId === folder.id }">
          <button class="sidebar-item" :style="{ paddingLeft: `${14 + folder.depth * 16}px` }"
            @click="selectFolder(folder.id)">
            <ArtSvgIcon icon="ri:folder-line" /><span>{{ folder.name }}</span>
          </button>
          <ElDropdown v-if="(folder.myPermissions || 0) & 4" trigger="click" @command="(command: string) => folderCommand(command, folder)">
            <ElButton text size="small" aria-label="文件夹操作"><ArtSvgIcon icon="ri:more-2-fill" /></ElButton>
            <template #dropdown><ElDropdownMenu>
              <ElDropdownItem command="child">新建子文件夹</ElDropdownItem>
              <ElDropdownItem command="rename">重命名</ElDropdownItem>
              <ElDropdownItem command="delete">删除</ElDropdownItem>
            </ElDropdownMenu></template>
          </ElDropdown>
        </div>
      </aside>
      <main class="library-content" @dragover.prevent @drop.prevent="onDrop">
        <div class="content-heading"><strong>{{ currentRoot?.name || '资源库' }}</strong>
          <span>{{ pagination.total }} 个文件</span>
          <span v-if="currentRoot && currentRoot.tenantId !== ownTenantId" class="permission-note">
            {{ permissionsLabel(currentPermissions) || '仅开放指定文件夹' }}
          </span>
        </div>
        <ArtForm class="library-search" inline @submit.prevent="search">
          <ElFormItem><ElInput v-model="keyword" clearable placeholder="搜索文件名" /></ElFormItem>
          <ElFormItem><ElSelect v-model="type" clearable placeholder="全部类型" style="width: 130px">
            <ElOption label="图片" value="image" /><ElOption label="其他文件" value="file" />
          </ElSelect></ElFormItem>
          <ElButton type="primary" native-type="submit">搜索</ElButton>
          <ElButton @click="resetSearch">重置</ElButton>
        </ArtForm>
        <ElProgress v-if="uploading" :percentage="uploadProgress" />
        <div class="library-table">
          <ArtTable row-key="id" :data="rows" :columns="columns" :loading="loading"
            :pagination="pagination" height="100%" :show-table-header="false"
            @pagination:size-change="handleSizeChange" @pagination:current-change="handleCurrentChange">
            <template #file="{ row }"><div class="file-cell">
              <ElImage v-if="isImage(row) && row.visibility !== 'PRIVATE'" :src="imageUrl(row)"
                fit="cover" class="file-thumb" />
              <ArtSvgIcon v-else :icon="isImage(row) ? 'ri:image-line' : 'ri:file-line'" />
              <span :title="row.originalFileName">{{ row.originalFileName }}</span>
            </div></template>
            <template #actions="{ row }">
              <ElButton text type="primary" @click="preview(row)">预览</ElButton>
              <ElDropdown v-if="canEditFile(row)" trigger="click" @command="(command: string) => fileCommand(command, row)">
                <ElButton text aria-label="文件操作"><ArtSvgIcon icon="ri:more-2-fill" /></ElButton>
                <template #dropdown><ElDropdownMenu>
                  <ElDropdownItem command="rename">重命名</ElDropdownItem>
                  <ElDropdownItem command="move">移动</ElDropdownItem>
                  <ElDropdownItem command="delete">删除</ElDropdownItem>
                </ElDropdownMenu></template>
              </ElDropdown>
            </template>
          </ArtTable>
        </div>
      </main>
    </div>
    <ElDialog v-model="previewVisible" :title="previewFile?.originalFileName" width="min(800px, 94vw)">
      <div class="preview-body">
        <ElImage v-if="previewFile && isImage(previewFile) && previewUrl" :src="previewUrl" fit="contain" />
        <iframe v-else-if="previewFile?.contentType === 'application/pdf' && previewUrl" :src="previewUrl" title="PDF 预览" />
        <span v-else>此文件类型暂不支持在线预览</span>
      </div>
    </ElDialog>
    <ElDialog v-model="moveVisible" title="移动文件" width="420px">
      <ArtForm label-width="90px"><ElFormItem label="目标文件夹">
        <ElSelect v-model="moveFolderId" style="width: 100%">
          <ElOption v-if="(currentRoot?.myPermissions || 0) & 4" label="未分类" value="" />
          <ElOption v-for="folder in folders.filter((item) => (item.myPermissions || 0) & 4)"
            :key="folder.id" :label="folder.name" :value="folder.id" />
        </ElSelect>
      </ElFormItem></ArtForm>
      <template #footer><ElButton @click="moveVisible = false">取消</ElButton>
        <ElButton type="primary" @click="confirmMove">确定</ElButton></template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref, watch } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import { useUserStore } from '@/store/modules/user'
  import {
    listResourceRoots, listResourceFolders, listResources, uploadResources,
    renameResourceFolder, deleteResourceFolder, renameResource, moveResources,
    deleteResources, getResourceAccessUrl, downloadResource,
    type ResourceFile, type ResourceRoot
  } from '@/api/resource-library'
  import { createNestedResourceFolder, type NestedResourceFolder } from '@/api/resource-folders'

  defineOptions({ name: 'TenantResources' })
  const userStore = useUserStore()
  const ownTenantId = computed(() => String(userStore.activeTenant?.id || userStore.info.tenantId || ''))
  const roots = ref<ResourceRoot[]>([])
  const selectedRootId = ref('')
  const currentRoot = computed(() => roots.value.find((root) => root.tenantId === selectedRootId.value))
  const currentPermissions = computed(() => folderId.value && folderId.value !== '0'
    ? folders.value.find((folder) => folder.id === folderId.value)?.myPermissions || 0
    : currentRoot.value?.myPermissions || 0)
  const canEdit = computed(() => Boolean(currentPermissions.value & 4))
  const canUpload = computed(() => Boolean(currentPermissions.value & 8))
  const canEditFile = (file: ResourceFile) => Boolean((file.folderId
    ? folders.value.find((folder) => folder.id === file.folderId)?.myPermissions || 0
    : currentRoot.value?.myPermissions || 0) & 4)
  const folders = ref<NestedResourceFolder[]>([])
  const folderId = ref<string>()
  const visibleFolders = computed(() => {
    const result: (NestedResourceFolder & { depth: number })[] = []
    const visit = (parentId: string | null, depth: number) => {
      for (const folder of folders.value.filter((item) => (item.parentId || null) === parentId)) {
        result.push({ ...folder, depth }); visit(folder.id, depth + 1)
      }
    }
    visit(null, 0); return result
  })
  const keyword = ref('')
  const type = ref<'' | 'image' | 'file'>('')
  const uploadVisibility = ref<'PUBLIC' | 'PRIVATE'>('PUBLIC')
  const uploading = ref(false)
  const uploadProgress = ref(0)
  const fileInput = ref<HTMLInputElement>()
  const previewVisible = ref(false)
  const previewFile = ref<ResourceFile>()
  const previewUrl = ref('')
  const moveVisible = ref(false)
  const moveFileId = ref('')
  const moveFolderId = ref('')
  const { data: rows, columns, loading, pagination, replaceSearchParams, getData,
    handleSizeChange, handleCurrentChange } = useTable({
    core: {
      apiFn: listResources, apiParams: { currentPage: 1, pageSize: 20 },
      paginationKey: { current: 'currentPage', size: 'pageSize' },
      columnsFactory: () => [
        { prop: 'originalFileName', label: '文件名', minWidth: 260, useSlot: true, slotName: 'file' },
        { prop: 'size', label: '大小', width: 110, formatter: (row: ResourceFile) => formatSize(row.size) },
        { prop: 'visibility', label: '文件权限', width: 100,
          formatter: (row: ResourceFile) => row.visibility === 'PRIVATE' ? '私有' : '公开' },
        { prop: 'createdAt', label: '上传时间', width: 175,
          formatter: (row: ResourceFile) => row.createdAt?.replace('T', ' ').slice(0, 19) || '-' },
        { prop: 'operation', label: '操作', width: 130, useSlot: true, slotName: 'actions' }
      ]
    }
  })
  const formatSize = (size: number) => size < 1024 ? `${size} B`
    : size < 1048576 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1048576).toFixed(1)} MB`
  const isImage = (file: ResourceFile) => file.contentType?.startsWith('image/')
    || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.originalFileName)
  const imageUrl = (file: ResourceFile) => file.url
    || `${(import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')}/images/resource/${file.id}`
  const permissionsLabel = (bits: number) => [
    bits & 1 && '查看', bits & 2 && '选用', bits & 4 && '编辑', bits & 8 && '上传'
  ].filter(Boolean).join(' · ')
  async function loadRoots() {
    roots.value = await listResourceRoots()
    if (!roots.value.some((root) => root.tenantId === selectedRootId.value))
      selectedRootId.value = roots.value.find((root) => root.tenantId === ownTenantId.value)?.tenantId
        || roots.value[0]?.tenantId || ''
  }
  async function loadFolders() {
    const owner = selectedRootId.value
    const result = owner ? await listResourceFolders(owner) : []
    if (owner === selectedRootId.value) folders.value = result
  }
  async function selectRoot(id: string) {
    selectedRootId.value = id; folderId.value = undefined
    await loadFolders(); search()
  }
  function selectFolder(id?: string) { folderId.value = id; search() }
  function search() {
    if (!selectedRootId.value) return
    replaceSearchParams({ tenantId: selectedRootId.value, folderId: folderId.value,
      keyword: keyword.value || undefined, type: type.value || undefined }); getData()
  }
  function resetSearch() { keyword.value = ''; type.value = ''; search() }
  async function createFolder(parentId?: string) {
    if (parentId ? !((folders.value.find((folder) => folder.id === parentId)?.myPermissions || 0) & 4) : !canEdit.value) return
    try {
      const { value } = await ElMessageBox.prompt('输入文件夹名称', '新建文件夹', {
        inputPattern: /\S/, inputErrorMessage: '请输入名称'
      })
      await createNestedResourceFolder(value.trim(), parentId || (folderId.value !== '0' ? folderId.value : undefined), selectedRootId.value)
      await loadFolders(); ElMessage.success('文件夹已创建')
    } catch { /* 取消或请求层已提示 */ }
  }
  async function folderCommand(command: string, folder: NestedResourceFolder) {
    try {
      if (command === 'child') { await createFolder(folder.id); return }
      if (command === 'rename') {
        const { value } = await ElMessageBox.prompt('输入新名称', '重命名文件夹', {
          inputValue: folder.name, inputPattern: /\S/, inputErrorMessage: '请输入名称'
        })
        await renameResourceFolder(folder.id, value.trim())
      } else {
        await ElMessageBox.confirm(`确定删除空文件夹「${folder.name}」？`, '删除文件夹', { type: 'warning' })
        await deleteResourceFolder(folder.id)
        if (folderId.value === folder.id) folderId.value = undefined
      }
      await loadFolders(); search(); ElMessage.success('操作成功')
    } catch { /* 取消或请求层已提示 */ }
  }
  async function onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement
    const files = Array.from(input.files || []); input.value = ''
    await uploadFiles(files)
  }
  async function onDrop(event: DragEvent) { await uploadFiles(Array.from(event.dataTransfer?.files || [])) }
  async function uploadFiles(files: File[]) {
    if (!files.length || !canUpload.value || uploading.value) return
    uploading.value = true; uploadProgress.value = 0
    try {
      await uploadResources(files, folderId.value && folderId.value !== '0' ? folderId.value : undefined,
        uploadVisibility.value, (progress) => uploadProgress.value = progress, selectedRootId.value)
      search(); ElMessage.success('上传完成')
    } finally { uploading.value = false }
  }
  async function preview(file: ResourceFile) {
    previewFile.value = file; previewUrl.value = ''; previewVisible.value = true
    previewUrl.value = file.visibility === 'PRIVATE'
      ? (await getResourceAccessUrl(file.id)) || URL.createObjectURL(await downloadResource(file.id))
      : imageUrl(file)
  }
  watch(previewVisible, (open) => {
    if (!open && previewUrl.value.startsWith('blob:')) URL.revokeObjectURL(previewUrl.value)
  })
  async function fileCommand(command: string, file: ResourceFile) {
    if (!canEditFile(file)) return
    try {
      if (command === 'rename') {
        const { value } = await ElMessageBox.prompt('输入新文件名', '重命名文件', {
          inputValue: file.originalFileName, inputPattern: /\S/, inputErrorMessage: '请输入名称'
        })
        await renameResource(file.id, value.trim())
      } else if (command === 'move') {
        moveFileId.value = file.id; moveFolderId.value = ''; moveVisible.value = true; return
      } else {
        await ElMessageBox.confirm(`确定删除「${file.originalFileName}」？`, '删除文件', { type: 'warning' })
        await deleteResources([file.id])
      }
      search(); ElMessage.success('操作成功')
    } catch { /* 取消或请求层已提示 */ }
  }
  async function confirmMove() {
    await moveResources([moveFileId.value], moveFolderId.value || null, selectedRootId.value)
    moveVisible.value = false; search(); ElMessage.success('已移动')
  }
  onMounted(async () => { await loadRoots(); await loadFolders(); search() })
</script>

<style scoped lang="scss">
  .tenant-library { min-height: 0; gap: 14px; }
  .library-header { display: flex; align-items: center; justify-content: space-between; gap: 16px;
    padding: 20px 24px; background: var(--el-bg-color); border: 1px solid var(--el-border-color-light); border-radius: 12px; }
  .library-header h2 { margin: 0 0 5px; font-size: 20px; }
  .library-header p { margin: 0; color: var(--el-text-color-secondary); font-size: 13px; }
  .header-actions { display: flex; align-items: center; gap: 8px; }
  .header-actions :deep(.el-button) { margin: 0; }
  .visibility-select { width: 120px; }
  .library-layout { display: grid; flex: 1; grid-template-columns: 220px minmax(0, 1fr);
    min-height: 0; overflow: hidden; background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-light); border-radius: 12px; }
  .library-sidebar { min-width: 0; padding: 14px 10px; overflow-y: auto; border-right: 1px solid var(--el-border-color-light); }
  .library-sidebar h3 { display: flex; align-items: center; justify-content: space-between;
    padding: 6px 10px 12px; margin: 0; font-size: 13px; }
  .library-sidebar .folder-title { margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--el-border-color-lighter); }
  .sidebar-item { display: flex; align-items: center; gap: 9px; width: 100%; min-width: 0; padding: 9px 10px;
    text-align: left; color: var(--el-text-color-regular); background: transparent; border: 0; border-radius: 7px; cursor: pointer; }
  .sidebar-item span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sidebar-item small { font-size: 11px; color: var(--el-text-color-placeholder); }
  .sidebar-item.active, .sidebar-item:hover, .folder-row.active { color: var(--el-color-primary); background: var(--el-color-primary-light-9); }
  .folder-row { display: flex; align-items: center; min-width: 0; border-radius: 7px; }
  .folder-row .sidebar-item { flex: 1; }
  .library-content { display: flex; flex-direction: column; min-width: 0; min-height: 0; padding: 16px; }
  .content-heading { display: flex; align-items: center; gap: 12px; min-height: 36px; }
  .content-heading strong { font-size: 17px; }
  .content-heading span { font-size: 12px; color: var(--el-text-color-secondary); }
  .permission-note { margin-left: auto; }
  .library-search { margin: 12px 0; }
  .library-search :deep(.el-form-item) { margin-bottom: 0; }
  .library-table { flex: 1; min-height: 0; }
  .library-table :deep(.art-table) { height: 100% !important; }
  .file-cell { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .file-cell span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .file-thumb { flex: none; width: 34px; height: 34px; border-radius: 6px; }
  .preview-body { display: grid; place-items: center; min-height: 300px; }
  .preview-body :deep(.el-image) { max-width: 100%; max-height: 68vh; }
  .preview-body iframe { width: 100%; height: 68vh; border: 0; }
  @media (width <= 760px) {
    .tenant-library { height: auto; }
    .library-header { flex-direction: column; align-items: stretch; }
    .header-actions { flex-wrap: wrap; }
    .library-layout { grid-template-columns: 1fr; }
    .library-sidebar { max-height: 250px; border-right: 0; border-bottom: 1px solid var(--el-border-color-light); }
    .library-table { min-height: 420px; }
  }
</style>
