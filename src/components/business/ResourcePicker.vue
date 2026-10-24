<template>
  <ElDialog
    :model-value="modelValue"
    :title="imageOnly ? '选择资源库图片' : '选择通用资源'"
    width="min(1120px, 96vw)"
    align-center
    class="resource-picker-dialog"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="picker-layout">
      <aside class="picker-sidebar">
        <div class="sidebar-heading">
          <strong>资源目录</strong>
          <ElButton text :loading="rootsLoading" @click="reload">刷新</ElButton>
        </div>
        <div class="sidebar-scroll">
          <template v-if="roots.length > 1">
            <div class="section-label">资源库</div>
            <nav class="folder-list" aria-label="可访问的资源库">
              <button
                v-for="root in roots"
                :key="root.tenantId"
                type="button"
                class="folder-button"
                :class="{ active: tenantId === root.tenantId }"
                :aria-pressed="tenantId === root.tenantId"
                @click="changeRoot(root.tenantId)"
              >
                <ArtSvgIcon icon="ri:folder-2-line" />
                <span class="folder-label">{{ root.name }}</span>
              </button>
            </nav>
            <div class="section-label">文件夹</div>
          </template>
          <nav v-if="roots.length" class="folder-list" aria-label="资源文件夹">
            <button
              type="button"
              class="folder-button"
              :class="{ active: !folderId }"
              :aria-pressed="!folderId"
              @click="selectFolder('')"
            >
              <ArtSvgIcon icon="ri:folder-2-line" />
              <span class="folder-label">全部资源</span>
            </button>
            <button
              v-for="folder in visibleFolders"
              :key="folder.id"
              type="button"
              class="folder-button"
              :class="{ active: folderId === folder.id }"
              :style="{ paddingLeft: `${12 + folder.depth * 16}px` }"
              :aria-pressed="folderId === folder.id"
              @click="selectFolder(folder.id)"
            >
              <ArtSvgIcon icon="ri:folder-2-line" />
              <span class="folder-label" :title="folder.name">{{ folder.name }}</span>
            </button>
          </nav>
          <p v-if="roots.length && !visibleFolders.length" class="folder-empty">暂无文件夹</p>
          <ElEmpty
            v-if="!roots.length && !rootsLoading"
            description="暂无可选用的资源库"
            :image-size="72"
          />
        </div>
        <div v-if="canCreateFolder" class="sidebar-footer">
          <ElButton plain class="create-folder" @click="createFolder">新建文件夹</ElButton>
        </div>
      </aside>

      <section class="picker-main" aria-label="可选资源">
        <ArtForm class="picker-search" inline @submit.prevent="search">
          <ElFormItem class="keyword-field">
            <ElInput v-model="keyword" clearable placeholder="搜索资源名称" />
          </ElFormItem>
          <ElFormItem v-if="!imageOnly" class="type-field">
            <ElSelect v-model="resourceType" clearable placeholder="全部类型">
              <ElOption label="图片" value="image" />
              <ElOption label="其他文件" value="file" />
            </ElSelect>
          </ElFormItem>
          <ElButton
            v-if="canUpload"
            type="primary"
            :loading="uploading"
            @click="fileInput?.click()"
          >
            <ArtSvgIcon v-if="!uploading" icon="ri:upload-cloud-2-line" />上传资源
          </ElButton>
          <ElButton native-type="submit" :disabled="!tenantId">查询</ElButton>
          <input
            ref="fileInput"
            class="file-input"
            type="file"
            multiple
            :accept="imageOnly ? 'image/*' : undefined"
            @change="onFilesSelected"
          />
        </ArtForm>

        <div class="picker-results">
          <ElProgress
            v-if="uploading"
            class="upload-progress"
            :percentage="uploadProgress"
            :stroke-width="4"
          />
          <ArtTable
            row-key="id"
            class="picker-card-table"
            :data="cardRows"
            :columns="columns"
            :loading="loading || rootsLoading"
            :pagination="tenantId ? pagination : undefined"
            :pagination-options="{ layout: 'prev, pager, next', size: 'small', align: 'right' }"
            :show-header="false"
            :show-table-header="false"
            :empty-text="imageOnly ? '暂无可选图片' : '暂无可选资源'"
            fixed-pagination
            height="100%"
            @pagination:size-change="handleSizeChange"
            @pagination:current-change="handleCurrentChange"
          >
            <template #cards>
              <div class="asset-grid">
                <button
                  v-for="file in rows"
                  :key="file.id"
                  type="button"
                  class="asset-card"
                  :class="{ selected: selectedFile?.id === file.id }"
                  :aria-pressed="selectedFile?.id === file.id"
                  :title="file.originalFileName"
                  @click="selectedFile = file"
                  @dblclick="confirmSelection"
                >
                  <span class="asset-preview">
                    <ElImage v-if="isImage(file)" :src="imageUrl(file)" fit="cover">
                      <template #error><img :src="fileImageIcon" alt="" /></template>
                    </ElImage>
                    <img v-else :src="fileIcon(file)" alt="" />
                  </span>
                  <span class="asset-name">{{ file.originalFileName }}</span>
                  <span
                    v-if="selectedFile?.id === file.id"
                    class="selected-mark"
                    aria-hidden="true"
                  >
                    <ArtSvgIcon icon="ri:check-line" />
                  </span>
                </button>
              </div>
            </template>
          </ArtTable>
          <div class="selection-count">已选 {{ selectedFile ? 1 : 0 }} 项</div>
        </div>
      </section>
    </div>
    <template #footer>
      <ElButton @click="emit('update:modelValue', false)">取消</ElButton>
      <ElButton type="primary" :disabled="!selectedFile" @click="confirmSelection">确认</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import {
    listResources,
    listResourceFolders,
    listResourceRoots,
    uploadResources,
    type ResourceFile,
    type ResourceRoot
  } from '@/api/resource-library'
  import { createNestedResourceFolder, type NestedResourceFolder } from '@/api/resource-folders'
  import { useUserStore } from '@/store/modules/user'
  import fileImageIcon from '@/assets/images/resource-library/file-image.png'
  import fileVideoIcon from '@/assets/images/resource-library/file-video.png'
  import fileDocumentIcon from '@/assets/images/resource-library/file-document.png'
  import fileAudioIcon from '@/assets/images/resource-library/file-audio.png'
  import fileArchiveIcon from '@/assets/images/resource-library/file-archive.png'

  const props = withDefaults(defineProps<{ modelValue: boolean; imageOnly?: boolean }>(), {
    imageOnly: true
  })
  const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    select: [file: ResourceFile]
  }>()

  const userStore = useUserStore()
  const ownTenantId = computed(() =>
    String(userStore.activeTenant?.id || userStore.info.tenantId || '0')
  )
  const tenantId = ref(ownTenantId.value)
  const roots = ref<ResourceRoot[]>([])
  const rootsLoading = ref(false)
  const folders = ref<NestedResourceFolder[]>([])
  const folderId = ref('')
  const keyword = ref('')
  const resourceType = ref<'' | 'image' | 'file'>('')
  const selectedFile = ref<ResourceFile>()
  const fileInput = ref<HTMLInputElement>()
  const uploading = ref(false)
  const uploadProgress = ref(0)
  let loadVersion = 0

  const visibleFolders = computed(() => {
    const result: (NestedResourceFolder & { depth: number })[] = []
    const visit = (parentId: string | null, depth: number) => {
      for (const folder of folders.value.filter((item) => (item.parentId || null) === parentId)) {
        result.push({ ...folder, depth })
        visit(folder.id, depth + 1)
      }
    }
    visit(null, 0)
    return result
  })
  const currentPermissions = computed(() =>
    folderId.value
      ? folders.value.find((folder) => folder.id === folderId.value)?.myPermissions || 0
      : roots.value.find((root) => root.tenantId === tenantId.value)?.myPermissions || 0
  )
  const canCreateFolder = computed(() => Boolean(currentPermissions.value & 4))
  const canUpload = computed(() => Boolean(currentPermissions.value & 8))

  const {
    data: rows,
    columns,
    loading,
    pagination,
    replaceSearchParams,
    getData,
    refreshCreate,
    handleSizeChange,
    handleCurrentChange
  } = useTable({
    core: {
      apiFn: listResources,
      immediate: false,
      apiParams: { currentPage: 1, pageSize: 20, visibility: 'PUBLIC', purpose: 'SELECT' },
      paginationKey: { current: 'currentPage', size: 'pageSize' },
      columnsFactory: () => [{ prop: 'cards', label: '资源', useSlot: true, slotName: 'cards' }]
    }
  })
  const cardRows = computed(() => (rows.value.length ? [{ id: 'resource-cards' }] : []))

  watch(
    () => props.modelValue,
    (open) => {
      if (open) {
        selectedFile.value = undefined
        keyword.value = ''
        resourceType.value = ''
        void reload()
      } else {
        loadVersion++
      }
    }
  )

  async function reload() {
    const version = ++loadVersion
    rootsLoading.value = true
    try {
      const available = await listResourceRoots()
      if (version !== loadVersion) return
      roots.value = available.filter(
        (root) => (root.myPermissions & 2) !== 0 || root.selectableFolders
      )
      if (!roots.value.some((root) => root.tenantId === tenantId.value))
        tenantId.value =
          roots.value.find((root) => root.tenantId === ownTenantId.value)?.tenantId ||
          roots.value[0]?.tenantId ||
          ''
      await changeRoot(tenantId.value)
    } catch {
      if (version === loadVersion) rootsLoading.value = false
    }
  }

  async function changeRoot(id: string) {
    const version = ++loadVersion
    tenantId.value = id
    folderId.value = ''
    folders.value = []
    rootsLoading.value = true
    try {
      if (id) {
        const result = await listResourceFolders(id)
        if (version !== loadVersion) return
        folders.value = result
        search()
      } else {
        rows.value = []
      }
    } finally {
      if (version === loadVersion) rootsLoading.value = false
    }
  }

  function selectFolder(id: string) {
    folderId.value = id
    search()
  }

  function search() {
    if (!tenantId.value) return
    selectedFile.value = undefined
    replaceSearchParams({
      keyword: keyword.value.trim() || undefined,
      folderId: folderId.value || undefined,
      tenantId: tenantId.value,
      purpose: 'SELECT',
      visibility: 'PUBLIC',
      type: props.imageOnly ? 'image' : resourceType.value || undefined
    })
    void getData()
  }

  async function createFolder() {
    if (!canCreateFolder.value) return
    try {
      const { value } = await ElMessageBox.prompt('输入文件夹名称', '新建文件夹', {
        inputPattern: /\S/,
        inputErrorMessage: '请输入名称'
      })
      await createNestedResourceFolder(value.trim(), folderId.value || undefined, tenantId.value)
      folders.value = await listResourceFolders(tenantId.value)
      ElMessage.success('文件夹已创建')
    } catch {
      // 用户取消或请求错误由公共层处理。
    }
  }

  async function onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement
    const files = Array.from(input.files || [])
    input.value = ''
    if (!files.length || !canUpload.value || uploading.value) return
    if (props.imageOnly && files.some((file) => !file.type.startsWith('image/'))) {
      ElMessage.warning('只能上传图片文件')
      return
    }
    uploading.value = true
    uploadProgress.value = 0
    try {
      await uploadResources(
        files,
        folderId.value || undefined,
        'PUBLIC',
        (percent) => (uploadProgress.value = percent),
        tenantId.value
      )
      await refreshCreate()
      ElMessage.success('资源上传成功')
    } finally {
      uploading.value = false
    }
  }

  function confirmSelection() {
    if (!selectedFile.value) return
    emit('select', selectedFile.value)
    emit('update:modelValue', false)
  }

  function isImage(file: ResourceFile) {
    return (
      file.contentType?.startsWith('image/') ||
      /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.originalFileName)
    )
  }

  function imageUrl(file: ResourceFile) {
    return (
      file.url ||
      `${(import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')}/images/resource/${file.id}`
    )
  }

  function fileIcon(file: ResourceFile) {
    const name = file.originalFileName
    if (file.contentType?.startsWith('video/') || /\.(mp4|mov|avi|webm)$/i.test(name))
      return fileVideoIcon
    if (file.contentType?.startsWith('audio/') || /\.(mp3|wav|aac|flac)$/i.test(name))
      return fileAudioIcon
    if (/\.(zip|rar|7z|tar|gz)$/i.test(name)) return fileArchiveIcon
    return fileDocumentIcon
  }
</script>

<style scoped>
  .picker-layout {
    display: grid;
    grid-template-columns: 220px minmax(0, 1fr);
    height: min(620px, 70vh);
    min-height: 360px;
    overflow: hidden;
    border: 1px solid var(--el-border-color-light);
    border-radius: 10px;
  }

  .picker-sidebar {
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--el-fill-color-extra-light);
    border-right: 1px solid var(--el-border-color-light);
  }

  .sidebar-heading,
  .picker-search {
    min-height: 64px;
    border-bottom: 1px solid var(--el-border-color-light);
  }

  .sidebar-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    color: var(--el-text-color-primary);
  }

  .sidebar-scroll {
    flex: 1;
    min-height: 0;
    padding: 10px;
    overflow: auto;
  }

  .section-label {
    padding: 10px 8px 6px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .folder-list {
    display: grid;
    gap: 4px;
  }

  .folder-button {
    display: flex;
    gap: 9px;
    align-items: center;
    width: 100%;
    min-height: 36px;
    padding: 7px 10px;
    color: var(--el-text-color-regular);
    text-align: left;
    cursor: pointer;
    background: transparent;
    border: 0;
    border-radius: 7px;
  }

  .folder-button:hover,
  .folder-button.active {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }

  .folder-button.active {
    font-weight: 600;
  }

  .folder-button .art-svg-icon {
    flex: none;
    font-size: 18px;
  }

  .folder-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .folder-empty {
    margin: 14px 8px;
    font-size: 12px;
    color: var(--el-text-color-placeholder);
  }

  .sidebar-footer {
    padding: 12px;
    border-top: 1px solid var(--el-border-color-light);
  }

  .create-folder {
    width: 100%;
  }

  .picker-main {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }

  .picker-search {
    padding: 10px 14px;
    margin: 0;
  }

  .picker-search :deep(.el-form) {
    display: flex;
    gap: 8px;
    align-items: center;
    width: 100%;
  }

  .picker-search :deep(.el-form-item) {
    margin: 0;
  }

  .keyword-field {
    flex: 1;
    min-width: 120px;
  }

  .keyword-field :deep(.el-input),
  .type-field :deep(.el-select) {
    width: 100%;
  }

  .type-field {
    width: 130px;
  }

  .picker-search :deep(.el-button) {
    margin: 0;
  }

  .picker-search :deep(.art-svg-icon) {
    margin-right: 4px;
  }

  .file-input {
    display: none;
  }

  .picker-results {
    position: relative;
    flex: 1;
    min-height: 0;
  }

  .upload-progress {
    position: absolute;
    z-index: 2;
    width: 100%;
  }

  .picker-card-table {
    height: 100%;
  }

  .picker-card-table :deep(.el-table__cell) {
    padding: 14px;
    vertical-align: top;
    border-bottom: 0;
  }

  .picker-card-table :deep(.el-table__row:hover > td.el-table__cell) {
    background: transparent;
  }

  .picker-card-table :deep(.custom-pagination) {
    justify-content: flex-end;
    min-height: 52px;
    padding: 0 12px;
    border-top: 1px solid var(--el-border-color-light);
  }

  .selection-count {
    position: absolute;
    bottom: 16px;
    left: 16px;
    z-index: 1;
    font-size: 13px;
    color: var(--el-text-color-secondary);
    pointer-events: none;
  }

  .asset-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
  }

  .asset-card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 9px;
    min-width: 0;
    padding: 8px;
    color: var(--el-text-color-primary);
    text-align: left;
    cursor: pointer;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-light);
    border-radius: 9px;
  }

  .asset-card:hover,
  .asset-card.selected {
    border-color: var(--el-color-primary);
  }

  .asset-card.selected {
    background: var(--el-color-primary-light-9);
  }

  .asset-preview {
    display: grid;
    place-items: center;
    width: 100%;
    aspect-ratio: 1;
    overflow: hidden;
    background: var(--el-fill-color-light);
    border-radius: 6px;
  }

  .asset-preview > img {
    width: 44px;
    height: 44px;
    object-fit: contain;
  }

  .asset-preview :deep(.el-image) {
    width: 100%;
    height: 100%;
  }

  .asset-preview :deep(.el-image img) {
    object-fit: cover;
  }

  .asset-name {
    width: 100%;
    overflow: hidden;
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .selected-mark {
    position: absolute;
    top: 8px;
    right: 8px;
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    color: white;
    background: var(--el-color-primary);
    border-radius: 50%;
  }

  @media (width <= 850px) {
    .picker-layout {
      grid-template-columns: 168px minmax(0, 1fr);
    }

    .asset-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (width <= 600px) {
    .picker-layout {
      grid-template-columns: 130px minmax(0, 1fr);
    }

    .picker-search :deep(.el-form) {
      flex-wrap: wrap;
      gap: 6px;
    }

    .keyword-field {
      flex-basis: 100%;
    }

    .type-field {
      flex: 1;
    }
  }
</style>
