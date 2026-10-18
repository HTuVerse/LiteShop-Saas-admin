<template>
  <div class="resource-page art-full-height">
    <div class="resource-layout">
      <aside class="folder-panel">
        <div class="folder-heading">
          <span>文件夹</span>
          <ElButton class="folder-add" text aria-label="新建文件夹" @click="createFolder">
            <ArtSvgIcon icon="ri:add-line" />
          </ElButton>
        </div>
        <nav class="folder-list" aria-label="资源文件夹">
          <button
            class="folder-item"
            :class="{ active: folderFilter === undefined }"
            @click="selectFolder()"
          >
            <img class="folder-asset" :src="folderBlueIcon" alt="" /><span>全部资源</span>
          </button>
          <button
            class="folder-item"
            :class="{ active: folderFilter === '0' }"
            @click="selectFolder('0')"
          >
            <img class="folder-asset" :src="folderGoldIcon" alt="" /><span>未分类</span>
          </button>
          <div class="folder-divider" />
          <div
            v-for="folder in folders"
            :key="folder.id"
            class="folder-row"
            :class="{ active: folderFilter === folder.id }"
          >
            <button
              class="folder-item"
              :class="{ active: folderFilter === folder.id }"
              @click="selectFolder(folder.id)"
            >
              <img class="folder-asset" :src="folderGoldIcon" alt="" /><span class="folder-name">{{
                folder.name
              }}</span>
            </button>
            <ElDropdown
              trigger="click"
              @command="(command: string) => folderCommand(command, folder)"
            >
              <ElButton text size="small" aria-label="文件夹操作"
                ><ArtSvgIcon icon="ri:more-2-fill"
              /></ElButton>
              <template #dropdown>
                <ElDropdownMenu>
                  <ElDropdownItem command="rename">重命名</ElDropdownItem>
                  <ElDropdownItem command="delete">删除</ElDropdownItem>
                </ElDropdownMenu>
              </template>
            </ElDropdown>
          </div>
          <p v-if="!folders.length" class="folder-empty">还没有文件夹</p>
        </nav>
      </aside>

      <main class="workspace-panel" @dragover.prevent @drop.prevent="onDrop">
        <div class="workspace-toolbar">
          <div class="workspace-context">
            <span class="context-icon"><img :src="currentFolderIcon" alt="" /></span>
            <span class="context-name">{{ currentFolderName }}</span>
            <span class="context-count">{{ pagination.total }} 项</span>
          </div>
          <div class="primary-actions">
            <ElSelect
              v-model="uploadVisibility"
              class="visibility-select"
              aria-label="新上传文件访问权限"
            >
              <ElOption label="公开上传" value="PUBLIC" />
              <ElOption label="私有上传" value="PRIVATE" />
            </ElSelect>
            <ElButton @click="storageConfigVisible = true"
              ><ArtSvgIcon icon="ri:settings-3-line" />存储配置</ElButton
            >
            <ElButton @click="createFolder"
              ><ArtSvgIcon icon="ri:folder-add-line" />新建文件夹</ElButton
            >
            <ElButton type="primary" :loading="uploading" @click="fileInput?.click()">
              <ArtSvgIcon v-if="!uploading" icon="ri:upload-cloud-2-line" />上传文件
            </ElButton>
            <input
              ref="fileInput"
              class="hidden-input"
              type="file"
              multiple
              @change="onFilesSelected"
            />
          </div>
        </div>

        <div v-if="uploading || failedFiles.length" class="upload-status">
          <ElProgress v-if="uploading" :percentage="uploadProgress" :stroke-width="6" />
          <ElAlert v-if="failedFiles.length" type="warning" :closable="false" show-icon>
            {{ failedFiles.length }} 个文件上传失败。<ElButton link @click="retryUpload"
              >重试失败文件</ElButton
            >
          </ElAlert>
        </div>

        <ArtForm class="search-form" inline @submit.prevent="search">
          <ElFormItem class="keyword-field"
            ><ElInput
              v-model="filters.keyword"
              clearable
              placeholder="搜索文件名"
              :prefix-icon="Search"
          /></ElFormItem>
          <ElFormItem class="filter-field">
            <ElSelect v-model="filters.type" clearable placeholder="全部类型">
              <ElOption label="图片" value="image" />
              <ElOption label="其他文件" value="file" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem class="filter-field">
            <ElSelect v-model="filters.visibility" clearable placeholder="全部权限">
              <ElOption label="公开" value="PUBLIC" />
              <ElOption label="私有" value="PRIVATE" />
            </ElSelect>
          </ElFormItem>
          <ElPopover placement="bottom" :width="270" trigger="click">
            <template #reference
              ><ElButton>高级筛选<ArtSvgIcon icon="ri:filter-3-line" /></ElButton
            ></template>
            <div class="advanced-filters">
              <ElInput v-model="filters.tenantId" clearable placeholder="商户 ID" />
              <ElInput v-model="filters.uploaderId" clearable placeholder="上传者 ID" />
              <p>输入 ID 后点击搜索应用筛选</p>
            </div>
          </ElPopover>
          <ElButton type="primary" native-type="submit">搜索</ElButton>
          <ElButton @click="resetFilters">重置</ElButton>
        </ArtForm>

        <div class="content-layout">
          <section class="files-panel" aria-label="资源文件列表">
            <div class="batch-toolbar">
              <div class="batch-actions">
                <span class="selected-count">已选择 {{ selected.length }} 项</span>
                <ElButton
                  :disabled="!selected.length"
                  @click="openMove(selected.map((item) => item.id))"
                  >批量移动</ElButton
                >
                <ElButton
                  :disabled="!selected.length"
                  type="danger"
                  plain
                  @click="remove(selected.map((item) => item.id))"
                  >批量删除</ElButton
                >
              </div>
              <ArtTableHeader
                class="resource-table-header"
                v-model:columns="columnChecks"
                :loading="loading"
                @refresh="refreshData"
              />
            </div>

            <ArtTable
              row-key="id"
              :data="rows"
              :columns="columns"
              :loading="loading"
              :pagination="pagination"
              @selection-change="(items: ResourceFile[]) => (selected = items)"
              @row-click="selectFile"
              @pagination:size-change="handleSizeChange"
              @pagination:current-change="handleCurrentChange"
            >
              <template #resourceName="{ row }">
                <div class="file-name-cell">
                  <ElImage
                    v-if="isImage(row) && row.url && row.visibility !== 'PRIVATE'"
                    :src="row.url"
                    fit="cover"
                    class="thumbnail"
                    @click.stop="preview(row)"
                  />
                  <div v-else class="file-icon">
                    <img :src="fileIcon(row)" alt="" />
                  </div>
                  <button class="name-button" @click.stop="selectFile(row)">{{
                    row.originalFileName
                  }}</button>
                </div>
              </template>
              <template #resourceActions="{ row }">
                <ElSpace>
                  <ElButton text type="primary" @click.stop="preview(row)">预览</ElButton>
                  <ElDropdown @command="(command: string) => fileCommand(command, row)">
                    <ElButton text aria-label="更多文件操作" @click.stop
                      ><ArtSvgIcon icon="ri:more-2-fill"
                    /></ElButton>
                    <template #dropdown>
                      <ElDropdownMenu>
                        <ElDropdownItem command="download">下载</ElDropdownItem>
                        <ElDropdownItem command="usage">查看引用</ElDropdownItem>
                        <ElDropdownItem v-if="row.visibility !== 'PRIVATE'" command="copy"
                          >复制链接</ElDropdownItem
                        >
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
          </section>

          <aside class="detail-panel" aria-label="文件详情">
            <template v-if="activeFile">
              <div class="detail-preview" @click="preview(activeFile)">
                <ElImage
                  v-if="
                    isImage(activeFile) && activeFile.url && activeFile.visibility !== 'PRIVATE'
                  "
                  :src="activeFile.url"
                  fit="cover"
                />
                <img v-else class="detail-file-icon" :src="fileIcon(activeFile)" alt="" />
              </div>
              <div class="detail-title-row">
                <strong :title="activeFile.originalFileName">{{
                  activeFile.originalFileName
                }}</strong>
                <ElButton text aria-label="重命名文件" @click="fileCommand('rename', activeFile)"
                  ><ArtSvgIcon icon="ri:edit-line"
                /></ElButton>
              </div>
              <div class="detail-tags">
                <ElTag size="small" effect="light">{{ fileTypeLabel(activeFile) }}</ElTag>
                <ElTag
                  size="small"
                  :type="activeFile.visibility === 'PRIVATE' ? 'warning' : 'success'"
                  effect="light"
                >
                  {{ activeFile.visibility === 'PRIVATE' ? '私有' : '公开' }}
                </ElTag>
              </div>
              <div class="detail-section">
                <h3>文件信息</h3>
                <dl>
                  <dt>文件大小</dt><dd>{{ formatSize(activeFile.size) }}</dd> <dt>文件类型</dt
                  ><dd>{{ activeFile.contentType || '-' }}</dd> <dt>上传时间</dt
                  ><dd>{{ formatDate(activeFile.createdAt) }}</dd> <dt>存储方式</dt
                  ><dd>{{ storageLabels[activeFile.storageType] || '-' }}</dd> <dt>所在文件夹</dt
                  ><dd>{{ folderName(activeFile.folderId) }}</dd> <dt>商户 ID</dt
                  ><dd>{{
                    activeFile.tenantId === '0' ? '平台' : activeFile.tenantId || '历史资源'
                  }}</dd>
                  <dt>上传者 ID</dt><dd>{{ activeFile.uploaderId || '未知' }}</dd>
                </dl>
              </div>
              <div class="detail-section detail-actions">
                <h3>快捷操作</h3>
                <ElButton @click="download(activeFile)"
                  ><ArtSvgIcon icon="ri:download-2-line" />下载文件</ElButton
                >
                <ElButton @click="openMove([activeFile.id])"
                  ><ArtSvgIcon icon="ri:folder-transfer-line" />移动到文件夹</ElButton
                >
                <ElButton @click="showUsages(activeFile)"
                  ><ArtSvgIcon icon="ri:links-line" />查看引用</ElButton
                >
                <ElButton v-if="activeFile.visibility !== 'PRIVATE'" @click="copyUrl(activeFile)"
                  ><ArtSvgIcon icon="ri:link" />复制链接</ElButton
                >
                <ElButton type="danger" plain @click="remove([activeFile.id])"
                  ><ArtSvgIcon icon="ri:delete-bin-line" />删除文件</ElButton
                >
              </div>
            </template>
            <div v-else class="detail-empty">
              <img :src="emptyFilesIcon" alt="" />
              <strong>选择一个文件</strong>
              <p>点击列表中的文件，查看文件信息与快捷操作。</p>
            </div>
          </aside>
        </div>
        <p class="drop-hint">可将文件拖入列表区域上传，访问权限由顶部“公开上传 / 私有上传”决定。</p>
      </main>
    </div>

    <ElDialog
      v-model="previewVisible"
      :title="previewFile?.originalFileName"
      width="min(850px, 94vw)"
    >
      <div class="preview-content">
        <ElImage
          v-if="previewFile && isImage(previewFile) && previewUrl"
          :src="previewUrl"
          fit="contain"
        />
        <iframe
          v-else-if="previewFile?.contentType === 'application/pdf' && previewUrl"
          :src="previewUrl"
          title="PDF 预览"
        />
        <video
          v-else-if="previewFile?.contentType?.startsWith('video/') && previewUrl"
          :src="previewUrl"
          controls
          class="preview-video"
        />
        <div v-else>此类型暂不支持在线预览，请下载查看。</div>
      </div>
      <template #footer
        ><ElButton v-if="previewFile" @click="download(previewFile)">下载</ElButton></template
      >
    </ElDialog>

    <ElDialog v-model="moveVisible" title="移动到文件夹" width="420px">
      <ArtForm label-width="90px">
        <ElFormItem label="目标文件夹">
          <ElSelect v-model="moveFolderId" placeholder="未分类" style="width: 100%">
            <ElOption label="未分类" value="" />
            <ElOption
              v-for="folder in folders"
              :key="folder.id"
              :label="folder.name"
              :value="folder.id"
            />
          </ElSelect>
        </ElFormItem>
      </ArtForm>
      <template #footer>
        <ElButton @click="moveVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="confirmMove">确定</ElButton>
      </template>
    </ElDialog>

    <ElDialog
      v-model="usageVisible"
      :title="`资源引用 · ${usageFile?.originalFileName || ''}`"
      width="min(850px, 95vw)"
    >
      <ArtTable
        row-key="id"
        :data="usageRows"
        :columns="usageColumns"
        :loading="usageLoading"
        :pagination="usagePagination"
        @pagination:size-change="usageSizeChange"
        @pagination:current-change="usageCurrentChange"
      />
      <p class="usage-hint">同一资源可在多个业务及图片位置重复使用。删除前请逐一移除引用。</p>
    </ElDialog>

    <ElDialog
      v-model="storageConfigVisible"
      align-center
      title="文件存储配置"
      width="min(900px, 96vw)"
      destroy-on-close
    >
      <PlatformServicesConfig file-only />
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, reactive, ref, watch } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Search } from '@element-plus/icons-vue'
  import { useTable } from '@/hooks/core/useTable'
  import PlatformServicesConfig from '@/views/config/website/modules/platform-services-config.vue'
  import folderBlueIcon from '@/assets/images/resource-library/folder-blue.png'
  import folderGoldIcon from '@/assets/images/resource-library/folder-gold.png'
  import fileImageIcon from '@/assets/images/resource-library/file-image.png'
  import fileVideoIcon from '@/assets/images/resource-library/file-video.png'
  import fileDocumentIcon from '@/assets/images/resource-library/file-document.png'
  import fileAudioIcon from '@/assets/images/resource-library/file-audio.png'
  import fileArchiveIcon from '@/assets/images/resource-library/file-archive.png'
  import emptyFilesIcon from '@/assets/images/resource-library/empty-files.png'
  import {
    listResources,
    listResourceFolders,
    createResourceFolder,
    renameResourceFolder,
    deleteResourceFolder,
    uploadResources,
    renameResource,
    moveResources,
    deleteResources,
    downloadResource,
    getResourceAccessUrl,
    setResourceVisibility,
    getResourceUsages,
    type ResourceFile,
    type ResourceFolder
  } from '@/api/resource-library'

  defineOptions({ name: 'PlatformResources' })

  const folders = ref<ResourceFolder[]>([])
  const folderFilter = ref<string>()
  const filters = reactive({
    keyword: '',
    type: '' as '' | 'image' | 'file',
    visibility: '' as '' | 'PUBLIC' | 'PRIVATE',
    tenantId: '',
    uploaderId: ''
  })
  const selected = ref<ResourceFile[]>([])
  const activeFileId = ref<string>()
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
  const usageVisible = ref(false)
  const usageFile = ref<ResourceFile>()
  const moveIds = ref<string[]>([])
  const moveFolderId = ref('')
  const storageLabels: Record<number, string> = { 0: 'Local', 1: '七牛', 2: 'MinIO', 3: '阿里云' }
  const usageLabels: Record<string, string> = {
    BANNER: '轮播图',
    DISH: '菜品',
    CATEGORY: '菜品分类',
    STORE: '门店',
    TEMPLATE: '打印模板',
    USER: '用户头像',
    SPEC: '菜品规格'
  }

  const {
    data: usageRows,
    columns: usageColumns,
    loading: usageLoading,
    pagination: usagePagination,
    replaceSearchParams: replaceUsageParams,
    getData: loadUsageData,
    handleSizeChange: usageSizeChange,
    handleCurrentChange: usageCurrentChange
  } = useTable({
    core: {
      apiFn: (params: { resourceId: string; currentPage: number; pageSize: number }) =>
        params.resourceId
          ? getResourceUsages(params)
          : Promise.resolve({ records: [], total: 0, current: 1, size: 10 }),
      apiParams: { resourceId: '', currentPage: 1, pageSize: 10 },
      paginationKey: { current: 'currentPage', size: 'pageSize' },
      columnsFactory: () => [
        {
          prop: 'business_type',
          label: '业务类型',
          minWidth: 120,
          formatter: (row: any) => usageLabels[row.business_type] || row.business_type
        },
        { prop: 'business_id', label: '业务 ID', minWidth: 180 },
        { prop: 'tenant_id', label: '商户 ID', minWidth: 130 },
        { prop: 'field_name', label: '字段', minWidth: 130 },
        {
          prop: 'sort_order',
          label: '图片位置',
          width: 100,
          formatter: (row: any) => String(Number(row.sort_order) + 1)
        },
        { prop: 'created_at', label: '关联时间', minWidth: 175 }
      ]
    }
  })

  function showUsages(file: ResourceFile) {
    usageFile.value = file
    usageVisible.value = true
    replaceUsageParams({ resourceId: file.id, currentPage: 1 })
    loadUsageData()
  }

  const {
    data: rows,
    columns,
    columnChecks,
    loading,
    pagination,
    getData,
    replaceSearchParams,
    refreshData,
    refreshCreate,
    refreshUpdate,
    refreshRemove,
    handleSizeChange,
    handleCurrentChange
  } = useTable({
    core: {
      apiFn: listResources,
      apiParams: { currentPage: 1, pageSize: 20 },
      paginationKey: { current: 'currentPage', size: 'pageSize' },
      columnsFactory: () => [
        { type: 'selection', width: 48 },
        {
          prop: 'originalFileName',
          label: '文件名',
          minWidth: 210,
          useSlot: true,
          slotName: 'resourceName'
        },
        {
          prop: 'contentType',
          label: '类型',
          minWidth: 85,
          formatter: (row: ResourceFile) => fileTypeLabel(row)
        },
        {
          prop: 'size',
          label: '大小',
          width: 85,
          formatter: (row: ResourceFile) => formatSize(row.size)
        },
        {
          prop: 'visibility',
          label: '权限',
          width: 72,
          formatter: (row: ResourceFile) => (row.visibility === 'PRIVATE' ? '私有' : '公开')
        },
        {
          prop: 'createdAt',
          label: '上传时间',
          width: 150,
          formatter: (row: ResourceFile) => formatDate(row.createdAt)
        },
        {
          prop: 'operation',
          label: '操作',
          width: 95,
          fixed: 'right',
          useSlot: true,
          slotName: 'resourceActions'
        }
      ]
    }
  })

  const activeFile = computed(() => rows.value.find((item) => item.id === activeFileId.value))
  const currentFolderIcon = computed(() =>
    folderFilter.value === undefined ? folderBlueIcon : folderGoldIcon
  )
  const currentFolderName = computed(() =>
    folderFilter.value === undefined
      ? '全部资源'
      : folderFilter.value === '0'
        ? '未分类'
        : folderName(folderFilter.value)
  )
  function selectFile(file: ResourceFile) {
    activeFileId.value = file.id
  }
  function folderName(id?: string) {
    return folders.value.find((item) => item.id === id)?.name || '未分类'
  }
  function formatDate(date?: string) {
    return date?.replace('T', ' ').slice(0, 19) || '-'
  }
  function fileTypeLabel(file: ResourceFile) {
    if (isImage(file)) return '图片'
    if (file.contentType?.startsWith('video/')) return '视频'
    if (file.contentType?.startsWith('audio/')) return '音频'
    if (file.contentType === 'application/pdf') return 'PDF'
    return extension(file.originalFileName)
  }
  function fileIcon(file: ResourceFile) {
    const ext = extension(file.originalFileName)
    if (isImage(file) || ['PNG', 'JPG', 'JPEG', 'GIF', 'WEBP', 'SVG'].includes(ext))
      return fileImageIcon
    if (file.contentType?.startsWith('video/') || ['MP4', 'MOV', 'AVI', 'WEBM'].includes(ext))
      return fileVideoIcon
    if (file.contentType?.startsWith('audio/') || ['MP3', 'WAV', 'AAC', 'FLAC'].includes(ext))
      return fileAudioIcon
    if (['ZIP', 'RAR', '7Z', 'TAR', 'GZ'].includes(ext)) return fileArchiveIcon
    return fileDocumentIcon
  }
  const isImage = (file: ResourceFile) => file.contentType?.startsWith('image/') === true
  const extension = (name: string) => name.split('.').pop()?.slice(0, 4).toUpperCase() || 'FILE'
  const formatSize = (size: number) =>
    size < 1024
      ? `${size} B`
      : size < 1048576
        ? `${(size / 1024).toFixed(1)} KB`
        : `${(size / 1048576).toFixed(1)} MB`

  async function loadFolders() {
    folders.value = await listResourceFolders()
  }
  function search() {
    selected.value = []
    replaceSearchParams({
      keyword: filters.keyword || undefined,
      type: filters.type || undefined,
      visibility: filters.visibility || undefined,
      tenantId: filters.tenantId || undefined,
      uploaderId: filters.uploaderId || undefined,
      folderId: folderFilter.value
    })
    getData()
  }
  function resetFilters() {
    Object.assign(filters, { keyword: '', type: '', visibility: '', tenantId: '', uploaderId: '' })
    search()
  }
  function selectFolder(id?: string) {
    folderFilter.value = id
    search()
  }

  async function createFolder() {
    try {
      const { value } = await ElMessageBox.prompt('输入文件夹名称', '新建文件夹', {
        inputPattern: /\S/,
        inputErrorMessage: '请输入名称'
      })
      await createResourceFolder(value.trim())
      await loadFolders()
      ElMessage.success('文件夹已创建')
    } catch {
      /* 取消输入或请求失败由公共层提示 */
    }
  }
  async function folderCommand(command: string, folder: ResourceFolder) {
    try {
      if (command === 'rename') {
        const { value } = await ElMessageBox.prompt('输入新名称', '重命名文件夹', {
          inputValue: folder.name,
          inputPattern: /\S/,
          inputErrorMessage: '请输入名称'
        })
        await renameResourceFolder(folder.id, value.trim())
      } else {
        await ElMessageBox.confirm(`确定删除空文件夹「${folder.name}」？`, '删除文件夹', {
          type: 'warning'
        })
        await deleteResourceFolder(folder.id)
        if (folderFilter.value === folder.id) folderFilter.value = undefined
      }
      await loadFolders()
      await refreshData()
      ElMessage.success('操作成功')
    } catch {
      /* 取消操作或请求失败由公共层提示 */
    }
  }
  async function onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement
    const files = Array.from(input.files || [])
    input.value = ''
    await uploadFiles(files)
  }
  async function onDrop(event: DragEvent) {
    await uploadFiles(Array.from(event.dataTransfer?.files || []))
  }
  async function retryUpload() {
    const files = [...failedFiles.value]
    failedFiles.value = []
    await uploadFiles(files)
  }
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
          await uploadResources(
            [file],
            folderFilter.value && folderFilter.value !== '0' ? folderFilter.value : undefined,
            uploadVisibility.value,
            (percent) => {
              uploadProgress.value = Math.round(((uploaded + percent / 100) / files.length) * 100)
            }
          )
        } catch {
          failedFiles.value.push(file)
        }
        uploaded++
      }
      if (uploaded > failedFiles.value.length)
        ElMessage.success(`已上传 ${uploaded - failedFiles.value.length} 个文件`)
      await refreshCreate()
    } finally {
      uploading.value = false
    }
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
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer')
        return
      }
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
  function openMove(ids: string[]) {
    moveIds.value = ids
    moveFolderId.value = ''
    moveVisible.value = true
  }
  async function confirmMove() {
    saving.value = true
    try {
      await moveResources(moveIds.value, moveFolderId.value || null)
      moveVisible.value = false
      selected.value = []
      await refreshUpdate()
      ElMessage.success('已移动')
    } finally {
      saving.value = false
    }
  }
  async function remove(ids: string[]) {
    try {
      await ElMessageBox.confirm(
        `删除选中的 ${ids.length} 个资源？文件将从存储中移除，无法恢复。`,
        '删除资源',
        { type: 'warning' }
      )
      await deleteResources(ids)
      selected.value = []
      await refreshRemove()
      ElMessage.success('已删除')
    } catch {
      /* 取消操作或请求失败由公共层提示 */
    }
  }
  async function fileCommand(command: string, file: ResourceFile) {
    if (command === 'download') {
      await download(file)
      return
    }
    if (command === 'usage') {
      showUsages(file)
      return
    }
    if (command === 'copy') {
      await copyUrl(file)
      return
    }
    if (command === 'move') {
      openMove([file.id])
      return
    }
    if (command === 'delete') {
      await remove([file.id])
      return
    }
    if (command === 'visibility') {
      const target = file.visibility === 'PRIVATE' ? 'PUBLIC' : 'PRIVATE'
      try {
        await ElMessageBox.confirm(
          `确定将「${file.originalFileName}」改为${target === 'PUBLIC' ? '公开' : '私有'}？${target === 'PRIVATE' ? '原地址会从源站撤销；若已接入 CDN，仍需清理缓存。' : '新地址将允许匿名访问。'}`,
          '切换访问权限'
        )
        await setResourceVisibility(file.id, target)
        await refreshUpdate()
        ElMessage.success('访问权限已更新')
      } catch {
        /* 取消或公共请求提示 */
      }
      return
    }
    try {
      const { value } = await ElMessageBox.prompt('输入新文件名', '重命名资源', {
        inputValue: file.originalFileName,
        inputPattern: /\S/,
        inputErrorMessage: '请输入名称'
      })
      await renameResource(file.id, value.trim())
      await refreshUpdate()
      ElMessage.success('已重命名')
    } catch {
      /* 取消输入或请求失败由公共层提示 */
    }
  }
  onMounted(loadFolders)
</script>

<style scoped lang="scss">
  .resource-page {
    min-height: 0;
  }

  .hidden-input {
    display: none;
  }

  .resource-layout {
    display: grid;
    grid-template-columns: 210px minmax(0, 1fr);
    min-height: 100%;
    overflow: hidden;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-light);
    border-radius: 12px;
  }

  .folder-panel {
    min-width: 0;
    padding: 20px 12px;
    border-right: 1px solid var(--el-border-color-light);
  }

  .folder-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 8px 18px;
    font-size: 15px;
    font-weight: 700;
    color: var(--el-text-color-primary);
  }

  .folder-add {
    width: 28px;
    height: 28px;
    border: 1px solid var(--el-border-color);
    border-radius: 7px;
  }

  .folder-list {
    display: grid;
    gap: 3px;
  }

  .folder-divider {
    height: 1px;
    margin: 14px 8px;
    background: var(--el-border-color-lighter);
  }

  .folder-row {
    display: flex;
    align-items: center;
    min-width: 0;
    border-radius: 7px;
  }

  .folder-row.active {
    background: var(--el-color-primary-light-9);
  }

  .folder-row :deep(.el-button) {
    width: 28px;
    margin-right: 4px;
    color: var(--el-text-color-placeholder);
  }

  .folder-item {
    display: flex;
    flex: 1;
    gap: 9px;
    align-items: center;
    min-width: 0;
    padding: 10px;
    font-size: 13px;
    color: var(--el-text-color-regular);
    text-align: left;
    cursor: pointer;
    background: transparent;
    border: 0;
    border-radius: 7px;
  }

  .folder-item > :first-child {
    flex: none;
    font-size: 17px;
    color: var(--el-color-primary);
  }

  .folder-asset {
    width: 23px;
    height: 23px;
    object-fit: contain;
  }

  .folder-item:hover,
  .folder-item.active {
    font-weight: 600;
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }

  .folder-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .folder-empty {
    margin: 8px 10px;
    font-size: 12px;
    color: var(--el-text-color-placeholder);
  }

  .workspace-panel {
    min-width: 0;
  }

  .workspace-toolbar {
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
    min-height: 72px;
    padding: 14px 20px;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .workspace-context {
    display: flex;
    gap: 9px;
    align-items: center;
    min-width: 0;
    white-space: nowrap;
  }

  .context-icon {
    display: grid;
    flex: none;
    place-items: center;
    width: 32px;
    height: 32px;
    font-size: 18px;
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    border-radius: 8px;
  }

  .context-icon img {
    width: 30px;
    height: 30px;
    object-fit: contain;
  }

  .context-name {
    overflow: hidden;
    font-weight: 700;
    color: var(--el-text-color-primary);
    text-overflow: ellipsis;
  }

  .context-count {
    font-size: 12px;
    color: var(--el-text-color-placeholder);
  }

  .primary-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    justify-content: flex-end;
  }

  .primary-actions :deep(.el-button) {
    margin: 0;
  }

  .primary-actions :deep(.el-button .art-svg-icon),
  .detail-actions :deep(.el-button .art-svg-icon) {
    margin-right: 5px;
  }

  .visibility-select {
    width: 116px;
  }

  .upload-status {
    display: grid;
    gap: 8px;
    padding: 10px 20px 0;
  }

  .search-form {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    padding: 14px 20px;
    margin: 0;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .search-form :deep(.el-form-item) {
    margin: 0;
  }

  .search-form :deep(.el-button) {
    margin: 0;
  }

  .keyword-field {
    width: min(270px, 100%);
  }

  .filter-field {
    width: 140px;
  }

  .filter-field :deep(.el-select) {
    width: 100%;
  }

  .advanced-filters {
    display: grid;
    gap: 10px;
  }

  .advanced-filters p {
    margin: 0;
    font-size: 12px;
    color: var(--el-text-color-placeholder);
  }

  .content-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 260px;
    min-height: 550px;
  }

  .files-panel {
    min-width: 0;
    padding: 12px 16px 20px;
  }

  .batch-toolbar {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: space-between;
    min-height: 42px;
    margin-bottom: 10px;
  }

  .batch-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }

  .batch-actions :deep(.el-button) {
    margin: 0;
  }

  .selected-count {
    margin-right: 8px;
    font-size: 13px;
    color: var(--el-text-color-secondary);
    white-space: nowrap;
  }

  .resource-table-header {
    flex: none;
  }

  .resource-table-header :deep(#art-table-header) {
    justify-content: flex-end;
  }

  .file-name-cell {
    display: flex;
    gap: 10px;
    align-items: center;
    min-width: 0;
  }

  .thumbnail,
  .file-icon {
    flex: none;
    width: 36px;
    height: 36px;
    border-radius: 6px;
  }

  .thumbnail {
    cursor: pointer;
  }

  .file-icon {
    display: grid;
    place-items: center;
    overflow: hidden;
  }

  .file-icon img {
    width: 36px;
    height: 36px;
    object-fit: contain;
  }

  .name-button {
    overflow: hidden;
    color: var(--el-text-color-primary);
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
    background: transparent;
    border: 0;
  }

  .name-button:hover {
    color: var(--el-color-primary);
  }

  .detail-panel {
    min-width: 0;
    padding: 16px;
    border-left: 1px solid var(--el-border-color-lighter);
  }

  .detail-preview {
    display: grid;
    place-items: center;
    height: 160px;
    overflow: hidden;
    cursor: pointer;
    background: var(--el-fill-color-light);
    border-radius: 8px;
  }

  .detail-preview :deep(.el-image) {
    width: 100%;
    height: 100%;
  }

  .detail-file-icon {
    width: 132px;
    height: 132px;
    object-fit: contain;
  }

  .detail-title-row {
    display: flex;
    gap: 6px;
    align-items: center;
    justify-content: space-between;
    margin-top: 10px;
  }

  .detail-title-row strong {
    overflow: hidden;
    font-size: 14px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .detail-tags {
    display: flex;
    gap: 6px;
    margin-top: 8px;
  }

  .detail-section {
    padding-top: 16px;
    margin-top: 18px;
    border-top: 1px solid var(--el-border-color-lighter);
  }

  .detail-section h3 {
    margin: 0 0 13px;
    font-size: 13px;
    font-weight: 700;
  }

  .detail-section dl {
    display: grid;
    grid-template-columns: 75px minmax(0, 1fr);
    gap: 10px 6px;
    margin: 0;
    font-size: 12px;
  }

  .detail-section dt {
    color: var(--el-text-color-secondary);
  }

  .detail-section dd {
    margin: 0;
    color: var(--el-text-color-regular);
    overflow-wrap: anywhere;
  }

  .detail-actions {
    display: grid;
    gap: 7px;
  }

  .detail-actions :deep(.el-button) {
    justify-content: flex-start;
    width: 100%;
    margin: 0;
  }

  .detail-empty {
    display: grid;
    gap: 10px;
    place-content: center;
    justify-items: center;
    min-height: 320px;
    text-align: center;
  }

  .detail-empty > :first-child {
    width: 150px;
    height: 150px;
    object-fit: contain;
  }

  .detail-empty strong {
    font-size: 14px;
  }

  .detail-empty p {
    max-width: 180px;
    margin: 0;
    font-size: 12px;
    line-height: 1.6;
    color: var(--el-text-color-placeholder);
  }

  .preview-content {
    display: grid;
    place-items: center;
    min-height: 320px;
  }

  .preview-content :deep(.el-image) {
    max-width: 100%;
    max-height: 68vh;
  }

  .preview-content iframe {
    width: 100%;
    height: 68vh;
    border: 0;
  }

  .preview-video {
    max-width: 100%;
    max-height: 68vh;
  }

  .drop-hint {
    padding: 0 20px 15px;
    margin: 0;
    font-size: 12px;
    color: var(--el-text-color-placeholder);
  }

  .usage-hint {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  @media (width <= 1400px) {
    .content-layout {
      grid-template-columns: minmax(0, 1fr) 230px;
    }

    .workspace-toolbar {
      flex-direction: column;
      align-items: flex-start;
    }

    .primary-actions {
      justify-content: flex-start;
    }
  }

  @media (width <= 1100px) {
    .content-layout {
      grid-template-columns: 1fr;
    }

    .detail-panel {
      border-top: 1px solid var(--el-border-color-lighter);
      border-left: 0;
    }
  }

  @media (width <= 760px) {
    .resource-layout {
      grid-template-columns: 1fr;
    }

    .folder-panel {
      padding: 12px;
      border-right: 0;
      border-bottom: 1px solid var(--el-border-color-light);
    }

    .folder-list {
      display: flex;
      overflow-x: auto;
    }

    .folder-list > * {
      flex: none;
    }

    .folder-divider,
    .folder-empty {
      display: none;
    }

    .folder-item {
      white-space: nowrap;
    }

    .batch-toolbar {
      flex-direction: column;
      align-items: flex-start;
    }

    .search-form,
    .workspace-toolbar {
      padding-right: 12px;
      padding-left: 12px;
    }
  }
</style>
