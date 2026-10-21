<template>
  <div class="resource-page">
    <div class="resource-layout">
      <aside class="folder-panel">
        <div class="folder-heading"><span>{{ isPlatform ? '租户资源库' : '可访问的资源库' }}</span></div>
        <nav class="folder-list" aria-label="租户资源库">
          <button v-for="root in rootOptions" :key="root.tenantId" class="folder-item"
            :class="{ active: selectedRootId === root.tenantId }" @click="selectRoot(root.tenantId)">
            <img class="folder-asset" :src="folderBlueIcon" alt="" /><span class="folder-name">{{ !isPlatform && root.tenantId === ownTenantId ? '我的资源' : root.name }}</span>
          </button>
        </nav>
        <div class="folder-divider" />
        <div class="folder-heading">
          <span>文件夹</span>
          <ElButton v-if="canEdit" class="folder-add" text aria-label="新建文件夹" @click="createFolder()">
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
            v-if="isPlatform || (currentRoot?.myPermissions || 0) & 1"
            class="folder-item"
            :class="{ active: folderFilter === '0' }"
            @click="selectFolder('0')"
          >
            <img class="folder-asset" :src="folderGoldIcon" alt="" /><span>未分类</span>
          </button>
          <div class="folder-divider" />
          <div
            v-for="folder in visibleFolders"
            :key="folder.id"
            class="folder-row"
            :class="{ active: folderFilter === folder.id }"
          >
            <button
              class="folder-item"
              :style="{ paddingLeft: `${12 + folder.depth * 18}px` }"
              :class="{ active: folderFilter === folder.id }"
              @click="selectFolder(folder.id)"
            >
              <img class="folder-asset" :src="folderGoldIcon" alt="" /><span class="folder-name">{{
                folder.name
              }}</span>
            </button>
            <ElDropdown v-if="isPlatform || (folder.myPermissions || 0) & 4"
              trigger="click"
              @command="(command: string) => folderCommand(command, folder)"
            >
              <ElButton text size="small" aria-label="文件夹操作"
                ><ArtSvgIcon icon="ri:more-2-fill"
              /></ElButton>
              <template #dropdown>
                <ElDropdownMenu>
                  <ElDropdownItem v-if="isPlatform" command="access">配置权限</ElDropdownItem>
                  <ElDropdownItem v-if="isPlatform || (folder.myPermissions || 0) & 4" command="create-child">新建子文件夹</ElDropdownItem>
                  <ElDropdownItem v-if="isPlatform || (folder.myPermissions || 0) & 4" command="rename">重命名</ElDropdownItem>
                  <ElDropdownItem v-if="isPlatform || (folder.myPermissions || 0) & 4" command="delete">删除</ElDropdownItem>
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
            <span v-if="capacityText" class="context-count">{{ capacityText }}</span>
            <span v-if="!isPlatform && currentRoot" class="context-count">{{ permissionLabel(currentPermissions) || '仅开放指定文件夹' }}</span>
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
            <ElButton v-if="isPlatform" @click="storageConfigVisible = true"
              ><ArtSvgIcon icon="ri:settings-3-line" />存储配置</ElButton
            >
            <ElButton v-if="isPlatform" @click="openRootAccess"
              ><ArtSvgIcon icon="ri:shield-keyhole-line" />根目录权限</ElButton
            >
            <ElButton v-if="canEdit" @click="createFolder()"
              ><ArtSvgIcon icon="ri:folder-add-line" />新建文件夹</ElButton
            >
            <ElButton v-if="canUpload" type="primary" :loading="uploading" @click="fileInput?.click()">
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

        <div class="content-layout">
          <div class="file-area">
            <ArtForm class="search-form" inline size="small" @submit.prevent="search">
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
              <ElFormItem v-if="userStore.isSuperAdmin" v-show="filtersExpanded" class="id-field">
                <ElInput v-model="filters.uploaderId" clearable placeholder="上传者 ID" />
              </ElFormItem>
              <ElButton class="expand-button" @click="filtersExpanded = !filtersExpanded">
                {{ filtersExpanded ? '收起' : '展开' }}筛选
                <span v-if="!filtersExpanded && hiddenFilterCount"
                  >（{{ hiddenFilterCount }}）</span
                >
                <ArtSvgIcon
                  :icon="filtersExpanded ? 'ri:arrow-up-s-line' : 'ri:arrow-down-s-line'"
                />
              </ElButton>
              <ElButton type="primary" native-type="submit">搜索</ElButton>
              <ElButton @click="resetFilters">重置</ElButton>
            </ArtForm>

            <section class="files-panel" aria-label="资源文件列表">
              <div class="batch-toolbar">
                <div class="batch-actions">
                  <span class="selected-count">已选择 {{ selected.length }} 项</span>
                  <ElButton v-if="isPlatform || selected.some(canEditFile)"
                    :disabled="!selected.length || !selected.every(canEditFile)"
                    @click="openMove(selected.map((item) => item.id))"
                    >批量移动</ElButton
                  >
                  <ElButton v-if="isPlatform || selected.some(canEditFile)"
                    :disabled="!selected.length || !selected.every(canEditFile)"
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

              <div class="table-frame">
                <ArtTable
                  row-key="id"
                  :data="rows"
                  :columns="columns"
                  :loading="loading"
                  :pagination="pagination"
                  :pagination-options="{ size: 'small' }"
                  :show-table-header="false"
                  height="100%"
                  size="small"
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
                </ArtTable>
              </div>
            </section>
          </div>

          <aside class="detail-panel" aria-label="文件详情">
            <template v-if="activeFile">
              <div class="detail-preview" @click="preview(activeFile)">
                <ElImage
                  v-if="isImage(activeFile) && detailImageUrl"
                  :src="detailImageUrl"
                  fit="cover"
                />
                <img v-else class="detail-file-icon" :src="fileIcon(activeFile)" alt="" />
              </div>
              <div class="detail-section">
                <h3>文件信息</h3>
                <dl>
                  <dt>文件名称</dt><dd>{{ activeFile.originalFileName }}</dd> <dt>文件大小</dt
                  ><dd>{{ formatSize(activeFile.size) }}</dd> <dt>文件类型</dt
                  ><dd>{{ activeFile.contentType || '-' }}</dd> <dt>上传时间</dt
                  ><dd>{{ formatDate(activeFile.createdAt) }}</dd> <dt>存储方式</dt
                  ><dd>{{ storageLabels[activeFile.storageType] || '-' }}</dd> <dt>所在文件夹</dt
                  ><dd>{{ folderName(activeFile.folderId) }}</dd> <dt>商户 ID</dt
                  ><dd>{{
                    activeFile.tenantId === '0' ? '平台' : activeFile.tenantId || '历史资源'
                  }}</dd>
                  <dt>上传者 ID</dt><dd>{{ activeFile.uploaderId || '未知' }}</dd> <dt>访问权限</dt
                  ><dd>{{ activeFile.visibility === 'PRIVATE' ? '私有' : '公开' }}</dd>
                  <template v-if="!isPlatform">
                    <dt>可用操作</dt><dd>{{ permissionLabel(filePermissions(activeFile)) || '无' }}</dd>
                  </template>
                </dl>
              </div>
            </template>
            <div v-else class="detail-empty">
              <img :src="emptyFilesIcon" alt="" />
              <strong>选择一个文件</strong>
              <p>点击列表中的文件，查看图片与文件信息。</p>
            </div>
          </aside>
        </div>
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
            <ElOption v-if="isPlatform || (currentRoot?.myPermissions || 0) & 4" label="未分类" value="" />
            <ElOption
              v-for="folder in folders.filter((item) => isPlatform || (item.myPermissions || 0) & 4)"
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

    <ElDialog v-model="rootAccessVisible" :title="`资源库权限 · ${folderAccessTarget?.name || currentRoot?.name || ''}`" width="620px">
      <p class="root-access-hint">当前目录的权限作用于未分类资源及继承它的子目录；子目录可单独覆盖。公开/私有访问设置仍单独生效。</p>
      <ArtForm label-width="100px">
        <ElFormItem label="开放范围">
          <ElSelect v-model="rootAccessForm.mode" style="width: 100%">
            <ElOption v-if="folderAccessTarget" label="继承上级目录" value="INHERIT" />
            <ElOption label="私密（仅归属方）" value="PRIVATE" />
            <ElOption label="全部租户" value="ALL" />
            <ElOption label="指定租户" value="SELECTED" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem v-if="rootAccessForm.mode === 'ALL'" label="开放操作">
          <ElCheckboxGroup v-model="rootAccessForm.permissions">
            <ElCheckbox v-for="item in permissionOptions" :key="item.value" :value="item.value">{{ item.label }}</ElCheckbox>
          </ElCheckboxGroup>
        </ElFormItem>
        <ElFormItem v-if="rootAccessForm.mode === 'SELECTED'" label="授权租户">
          <ElSelect v-model="rootAccessForm.tenants" multiple filterable style="width: 100%" placeholder="请选择租户">
            <ElOption v-for="root in tenantRootOptions" :key="root.tenantId" :value="root.tenantId" :label="root.name" />
          </ElSelect>
        </ElFormItem>
        <div v-if="rootAccessForm.mode === 'SELECTED'" class="grant-list">
          <div v-for="tenantId in rootAccessForm.tenants" :key="tenantId" class="grant-row">
            <strong>{{ tenantRootOptions.find((root) => root.tenantId === tenantId)?.name || tenantId }}</strong>
            <ElCheckboxGroup v-model="rootGrantPermissions[tenantId]">
              <ElCheckbox v-for="item in permissionOptions" :key="item.value" :value="item.value">{{ item.label }}</ElCheckbox>
            </ElCheckboxGroup>
          </div>
        </div>
      </ArtForm>
      <template #footer>
        <ElButton @click="rootAccessVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="saveRootAccess">保存权限</ElButton>
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
  import { computed, h, onMounted, reactive, ref, watch } from 'vue'
  import { ElDropdown, ElDropdownItem, ElDropdownMenu, ElMessage, ElMessageBox } from 'element-plus'
  import { Search } from '@element-plus/icons-vue'
  import { useTable } from '@/hooks/core/useTable'
  import { useUserStore } from '@/store/modules/user'
  import { getMyEntitlements } from '@/api/saas'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
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
    listResourceRoots,
    configureResourceRoot,
    getResourceFolderAccess,
    configureResourceFolder,
    listResourceFolders,
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
    type ResourceRoot
  } from '@/api/resource-library'
  import { createNestedResourceFolder, type NestedResourceFolder } from '@/api/resource-folders'

  defineOptions({ name: 'PlatformResources' })

  const userStore = useUserStore()
  const isPlatform = computed(() => userStore.isSuperAdmin && !userStore.activeTenant)
  const ownTenantId = computed(() => String(userStore.activeTenant?.id || userStore.info.tenantId || '0'))
  const selectedRootId = ref(isPlatform.value ? '0' : ownTenantId.value)
  const tenantRoots = ref<ResourceRoot[]>([])
  const rootOptions = computed<ResourceRoot[]>(() => tenantRoots.value)
  const tenantRootOptions = computed(() => tenantRoots.value.filter((root) =>
    root.tenantId !== '0' && root.tenantId !== selectedRootId.value))
  const currentRoot = computed(() => rootOptions.value.find((root) => root.tenantId === selectedRootId.value))
  const currentPermissions = computed(() => folderFilter.value && folderFilter.value !== '0'
    ? folders.value.find((folder) => folder.id === folderFilter.value)?.myPermissions || 0
    : currentRoot.value?.myPermissions || 0)
  const canEdit = computed(() => Boolean(currentPermissions.value & 4))
  const canUpload = computed(() => Boolean(currentPermissions.value & 8))
  const filePermissions = (file: ResourceFile) => file.folderId
    ? folders.value.find((folder) => folder.id === file.folderId)?.myPermissions || 0
    : currentRoot.value?.myPermissions || 0
  const canEditFile = (file: ResourceFile) => Boolean(filePermissions(file) & 4)
  const permissionLabel = (bits: number) => [
    bits & 1 && '查看', bits & 2 && '选用', bits & 4 && '编辑', bits & 8 && '上传'
  ].filter(Boolean).join(' · ')
  const rootAccessVisible = ref(false)
  const permissionOptions = [
    { label: '查看', value: 'view', bit: 1 },
    { label: '选用资源', value: 'select', bit: 2 },
    { label: '编辑', value: 'edit', bit: 4 },
    { label: '上传', value: 'upload', bit: 8 }
  ]
  const folderAccessTarget = ref<NestedResourceFolder>()
  const rootAccessForm = reactive({ mode: 'PRIVATE' as ResourceRoot['mode'] | 'INHERIT', permissions: [] as string[], tenants: [] as string[] })
  const rootGrantPermissions = reactive<Record<string, string[]>>({})
  watch(() => rootAccessForm.tenants, (ids) => {
    for (const id of ids) rootGrantPermissions[id] ||= []
  }, { deep: true })
  const toKeys = (bits: number) => permissionOptions.filter((item) => (bits & item.bit) !== 0).map((item) => item.value)
  const toBits = (keys: string[]) => {
    const bits = permissionOptions.reduce((sum, item) => sum | (keys.includes(item.value) ? item.bit : 0), 0)
    return bits & (2 | 4) ? bits | 1 : bits
  }
  async function loadRoots() {
    tenantRoots.value = await listResourceRoots()
    if (!rootOptions.value.some((root) => root.tenantId === selectedRootId.value))
      selectedRootId.value = rootOptions.value[0]?.tenantId || '0'
  }
  async function selectRoot(id: string) {
    selectedRootId.value = id
    folderFilter.value = undefined
    selected.value = []
    await loadFolders()
    search()
    loadCapacity()
  }
  function openRootAccess() {
    const root = currentRoot.value
    if (!root || !isPlatform.value) return
    folderAccessTarget.value = undefined
    rootAccessForm.mode = root.mode
    rootAccessForm.permissions = toKeys(root.permissions)
    rootAccessForm.tenants = root.grants.map((grant) => grant.tenantId)
    for (const grant of root.grants) rootGrantPermissions[grant.tenantId] = toKeys(grant.permissions)
    rootAccessVisible.value = true
  }
  async function openFolderAccess(folder: NestedResourceFolder) {
    if (!isPlatform.value) return
    const access = await getResourceFolderAccess(folder.id)
    folderAccessTarget.value = folder
    rootAccessForm.mode = access.mode
    rootAccessForm.permissions = toKeys(access.permissions)
    rootAccessForm.tenants = access.grants.map((grant) => grant.tenantId)
    for (const grant of access.grants) rootGrantPermissions[grant.tenantId] = toKeys(grant.permissions)
    rootAccessVisible.value = true
  }
  async function saveRootAccess() {
    if (!currentRoot.value) return
    saving.value = true
    try {
      const data = {
        mode: rootAccessForm.mode,
        permissions: toBits(rootAccessForm.permissions),
        grants: rootAccessForm.tenants.map((tenantId) => ({ tenantId, permissions: toBits(rootGrantPermissions[tenantId] || []) }))
      }
      if (folderAccessTarget.value) await configureResourceFolder(folderAccessTarget.value.id, data)
      else await configureResourceRoot(currentRoot.value.tenantId, { ...data, mode: data.mode as ResourceRoot['mode'] })
      await loadRoots()
      await loadFolders()
      search()
      rootAccessVisible.value = false
      ElMessage.success('目录权限已保存')
    } finally { saving.value = false }
  }
  const capacityText = ref('')
  async function loadCapacity() {
    if (selectedRootId.value !== ownTenantId.value || (userStore.isSuperAdmin && !userStore.activeTenant)) {
      capacityText.value = ''
      return
    }
    try {
      const item = (await getMyEntitlements()).features.resource_storage_bytes
      capacityText.value = item?.enabled
        ? `已用 ${formatSize(item.used || 0)} / ${item.unlimited ? '不限量' : formatSize(item.limit || 0)}`
        : '资源库容量未分配'
    } catch {
      capacityText.value = ''
    }
  }

  const folders = ref<NestedResourceFolder[]>([])
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
  const folderFilter = ref<string>()
  const filtersExpanded = ref(false)
  const filters = reactive({
    keyword: '',
    type: '' as '' | 'image' | 'file',
    visibility: '' as '' | 'PUBLIC' | 'PRIVATE',
    uploaderId: ''
  })
  const hiddenFilterCount = computed(() =>
    userStore.isSuperAdmin
      ? Number(Boolean(filters.uploaderId.trim()))
      : 0
  )
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
  const detailImageUrl = ref('')
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
          prop: 'uploaderId',
          label: '上传者 ID',
          width: 100,
          formatter: (row: ResourceFile) => row.uploaderId || '未知'
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
          width: 60,
          fixed: 'right',
          align: 'center',
          formatter: (row: ResourceFile) =>
            h(
              'div',
              {
                style: { display: 'flex', justifyContent: 'center' },
                onClick: (event: MouseEvent) => event.stopPropagation()
              },
              [
                h(
                  ElDropdown,
                  {
                    trigger: 'hover',
                    placement: 'bottom-end',
                    onCommand: (command: string) => fileCommand(command, row)
                  },
                  {
                    default: () =>
                      h(ArtButtonTable, {
                        type: 'more',
                        label: '文件操作',
                        buttonBgColor: 'var(--el-color-primary-light-9)',
                        iconColor: 'var(--el-color-primary)'
                      }),
                    dropdown: () =>
                      h(ElDropdownMenu, null, {
                        default: () => [
                          h(ElDropdownItem, { command: 'preview' }, () => '预览'),
                          h(ElDropdownItem, { command: 'download' }, () => '下载'),
                          ...((isPlatform.value || selectedRootId.value === ownTenantId.value)
                            ? [h(ElDropdownItem, { command: 'usage' }, () => '查看引用')] : []),
                          ...(row.visibility === 'PRIVATE'
                            ? []
                            : [h(ElDropdownItem, { command: 'copy' }, () => '复制链接')]),
                          ...(canEditFile(row) ? [
                            h(ElDropdownItem, { command: 'rename' }, () => '重命名'),
                            h(ElDropdownItem, { command: 'move' }, () => '移动到文件夹'),
                            h(ElDropdownItem, { command: 'visibility' }, () => '切换公开/私有'),
                            h(ElDropdownItem, { command: 'delete', divided: true }, () => '删除')
                          ] : [])
                        ]
                      })
                  }
                )
              ]
            )
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
      ? currentRoot.value?.name || '全部资源'
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

  watch(
    activeFile,
    async (file, _previous, onCleanup) => {
      detailImageUrl.value = ''
      if (!file || !isImage(file)) return
      if (file.visibility !== 'PRIVATE') {
        detailImageUrl.value = file.url || ''
        return
      }

      let cancelled = false
      let blobUrl = ''
      onCleanup(() => {
        cancelled = true
        if (blobUrl) URL.revokeObjectURL(blobUrl)
      })
      try {
        const signedUrl = await getResourceAccessUrl(file.id)
        if (cancelled) return
        if (signedUrl) {
          detailImageUrl.value = signedUrl
          return
        }
        blobUrl = URL.createObjectURL(await downloadResource(file.id))
        if (cancelled) URL.revokeObjectURL(blobUrl)
        else detailImageUrl.value = blobUrl
      } catch {
        // 无法加载缩略图时展示文件类型图标。
      }
    },
    { immediate: true }
  )

  async function loadFolders() {
    const tenantId = selectedRootId.value
    const result = await listResourceFolders(tenantId)
    if (selectedRootId.value === tenantId) folders.value = result
  }
  function search() {
    selected.value = []
    replaceSearchParams({
      keyword: filters.keyword || undefined,
      type: filters.type || undefined,
      visibility: filters.visibility || undefined,
      tenantId: selectedRootId.value,
      uploaderId: userStore.isSuperAdmin ? filters.uploaderId || undefined : undefined,
      folderId: folderFilter.value
    })
    getData()
  }
  function resetFilters() {
    Object.assign(filters, { keyword: '', type: '', visibility: '', uploaderId: '' })
    search()
  }
  function selectFolder(id?: string) {
    folderFilter.value = id
    search()
  }

  async function createFolder(parentId?: string) {
    if (parentId ? !((folders.value.find((folder) => folder.id === parentId)?.myPermissions || 0) & 4) : !canEdit.value) return
    try {
      const { value } = await ElMessageBox.prompt('输入文件夹名称', '新建文件夹', {
        inputPattern: /\S/,
        inputErrorMessage: '请输入名称'
      })
      await createNestedResourceFolder(
        value.trim(),
        typeof parentId === 'string'
          ? parentId
          : folderFilter.value && folderFilter.value !== '0'
            ? folderFilter.value
            : undefined,
        selectedRootId.value
      )
      await loadFolders()
      ElMessage.success('文件夹已创建')
    } catch {
      /* 取消输入或请求失败由公共层提示 */
    }
  }
  async function folderCommand(command: string, folder: NestedResourceFolder) {
    try {
      if (command === 'access') { await openFolderAccess(folder); return }
      if (command === 'create-child') {
        await createFolder(folder.id)
        return
      } else if (command === 'rename') {
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
    if (!canUpload.value) return
    await uploadFiles(Array.from(event.dataTransfer?.files || []))
  }
  async function retryUpload() {
    const files = [...failedFiles.value]
    failedFiles.value = []
    await uploadFiles(files)
  }
  async function uploadFiles(files: File[]) {
    if (!files.length || uploading.value || !canUpload.value) return
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
            },
            selectedRootId.value
          )
        } catch {
          failedFiles.value.push(file)
        }
        uploaded++
      }
      if (uploaded > failedFiles.value.length)
        ElMessage.success(`已上传 ${uploaded - failedFiles.value.length} 个文件`)
      await refreshCreate()
      await loadCapacity()
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
    const targets = ids.map((id) => rows.value.find((row) => row.id === id))
    if (!ids.length || targets.some((file) => !file || !canEditFile(file))) return
    moveIds.value = ids
    moveFolderId.value = (currentRoot.value?.myPermissions || 0) & 4
      ? '' : rows.value.find((row) => row.id === ids[0])?.folderId || ''
    moveVisible.value = true
  }
  async function confirmMove() {
    if (!moveFolderId.value && !((currentRoot.value?.myPermissions || 0) & 4)) return
    if (moveFolderId.value && !((folders.value.find((folder) => folder.id === moveFolderId.value)?.myPermissions || 0) & 4)) return
    saving.value = true
    try {
      await moveResources(moveIds.value, moveFolderId.value || null, selectedRootId.value)
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
    if (command === 'preview') {
      await preview(file)
      return
    }
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
    if (!canEditFile(file)) return
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
  onMounted(async () => {
    await loadRoots()
    await loadFolders()
    search()
    loadCapacity()
  })
</script>

<style scoped lang="scss">
  .resource-page {
    height: var(--art-full-height);
    min-height: 0;
  }

  .hidden-input {
    display: none;
  }

  .resource-layout {
    display: grid;
    grid-template-columns: 196px minmax(0, 1fr);
    height: 100%;
    min-height: 0;
    overflow: hidden;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-light);
    border-radius: 12px;
  }

  .folder-panel {
    min-width: 0;
    padding: 14px 9px;
    border-right: 1px solid var(--el-border-color-light);
  }

  .folder-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 8px 12px;
    font-size: 14px;
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
    max-height: 220px;
    overflow-y: auto;
  }

  .grant-list {
    margin-left: 100px;
    max-height: 260px;
    overflow-y: auto;
  }

  .root-access-hint {
    margin: 0 0 16px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }

  .grant-row {
    padding: 10px 0;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .grant-row strong {
    display: block;
    margin-bottom: 6px;
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
    padding: 7px;
    font-size: 12px;
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
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }

  .workspace-toolbar {
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
    min-height: 56px;
    padding: 9px 14px;
    overflow-x: auto;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .workspace-context {
    display: flex;
    flex: none;
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
    flex: none;
    flex-wrap: nowrap;
    gap: 8px;
    align-items: center;
    justify-content: flex-end;
  }

  .primary-actions :deep(.el-button) {
    margin: 0;
  }

  .primary-actions :deep(.el-button .art-svg-icon) {
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
    padding: 10px 12px;
    margin: 0;
    overflow-x: auto;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .search-form :deep(.el-form) {
    display: flex;
    flex-wrap: nowrap;
    gap: 6px;
    align-items: center;
    width: max-content;
    min-width: 100%;
  }

  .search-form :deep(.el-form-item) {
    margin: 0;
  }

  .search-form :deep(.el-button) {
    flex: none;
    margin: 0;
  }

  .keyword-field {
    flex: 0 0 190px;
  }

  .filter-field {
    flex: 0 0 118px;
    min-width: 118px;
  }

  .filter-field :deep(.el-select) {
    width: 100%;
  }

  .id-field {
    flex: 0 0 104px;
  }

  .expand-button :deep(.art-svg-icon) {
    margin-left: 4px;
  }

  .content-layout {
    display: grid;
    flex: 1;
    grid-template-columns: minmax(0, 1fr) 250px;
    min-height: 0;
  }

  .file-area {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }

  .files-panel {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    padding: 8px 12px 12px;
  }

  .batch-toolbar {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: space-between;
    min-height: 36px;
    margin-bottom: 6px;
  }

  .table-frame {
    flex: 1;
    min-height: 0;
  }

  .table-frame :deep(.art-table) {
    height: 100% !important;
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
    width: 30px;
    height: 30px;
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
    width: 30px;
    height: 30px;
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
    display: flex;
    flex-direction: column;
    align-self: stretch;
    min-width: 0;
    min-height: 0;
    padding: 12px;
    overflow: hidden;
    border-left: 1px solid var(--el-border-color-lighter);
  }

  .detail-preview {
    display: grid;
    flex: none;
    place-items: center;
    height: 125px;
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
    width: 105px;
    height: 105px;
    object-fit: contain;
  }

  .detail-section {
    flex: 1;
    min-height: 0;
    padding-top: 12px;
    padding-right: 4px;
    margin-top: 12px;
    overflow-y: auto;
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

  .usage-hint {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  @media (width <= 1400px) {
    .content-layout {
      grid-template-columns: minmax(0, 1fr) 228px;
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
    .resource-page,
    .resource-layout {
      height: auto;
    }

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
