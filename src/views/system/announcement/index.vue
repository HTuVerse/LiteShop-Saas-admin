<template>
  <div class="announcement-admin art-full-height">
    <AnnouncementSearch
      :model-value="searchForm"
      @update:model-value="(value) => Object.assign(searchForm, value)"
      @search="handleSearch"
      @reset="resetSearch"
    />
    <ElAlert
      :title="
        platformMode
          ? '当前发布的是全平台公告，所有已登录商户均可看到。'
          : '当前只能管理和发布所在商户的公告。'
      "
      type="info"
      :closable="false"
      show-icon
      class="scope-tip"
    />
    <ElCard class="art-table-card" shadow="never">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElButton v-auth="'message:announcement:add'" type="primary" @click="openEditor()">
            <ArtSvgIcon icon="ri:add-line" />新增公告
          </ElButton>
        </template>
      </ArtTableHeader>
      <ArtTable
        row-key="id"
        :loading="loading"
        :data="rows"
        :columns="columns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      >
        <template #level="{ row }">
          <ElTag :type="levelInfo(row.level).type">{{ levelInfo(row.level).label }}</ElTag>
        </template>
        <template #scope="{ row }">{{ scopeLabel(row) }}</template>
        <template #status="{ row }">
          <ElTag :type="statusInfo(row.status).type" effect="plain">{{
            statusInfo(row.status).label
          }}</ElTag>
        </template>
        <template #publishTime="{ row }">{{ row.publishTime || '—' }}</template>
        <template #expireTime="{ row }">{{ row.expireTime || '长期有效' }}</template>
        <template #attachments="{ row }">
          <span class="attachment-count"
            ><ArtSvgIcon icon="ri:attachment-2" />{{ row.attachments?.length || 0 }}</span
          >
        </template>
        <template #operation="{ row }">
          <div class="table-actions">
            <ArtButtonTable
              v-if="row.status === 'DRAFT'"
              auth="message:announcement:edit"
              type="edit"
              label="编辑公告"
              @click="openEditor(row)"
            />
            <ArtButtonTable
              v-if="row.status !== 'PUBLISHED'"
              auth="message:announcement:publish"
              icon="ri:send-plane-fill"
              icon-class="bg-success/12 text-success"
              label="发布公告"
              @click="publishRow(row)"
            />
            <ArtButtonTable
              v-if="row.status === 'PUBLISHED'"
              auth="message:announcement:withdraw"
              icon="ri:arrow-go-back-line"
              icon-class="bg-warning/12 text-warning"
              label="撤回公告"
              @click="withdrawRow(row)"
            />
            <ArtButtonTable
              v-if="row.status === 'DRAFT'"
              auth="message:announcement:delete"
              type="delete"
              label="删除草稿"
              @click="deleteRow(row)"
            />
            <ArtButtonTable type="view" label="查看详情" @click="preview(row)" />
          </div>
        </template>
      </ArtTable>
    </ElCard>

    <ElDialog
      v-model="editorVisible"
      :title="editingId ? '编辑公告' : '新增公告'"
      width="min(920px, calc(100vw - 28px))"
      destroy-on-close
      align-center
    >
      <div class="editor-scroll">
        <ArtForm ref="formRef" :model="form" :rules="rules" label-width="92px">
          <ElFormItem label="发布范围" prop="scopeType">
            <ElTag v-if="platformMode" type="primary">全平台</ElTag>
            <ElRadioGroup v-else v-model="form.scopeType">
              <ElRadioButton value="TENANT">整个商户</ElRadioButton>
              <ElRadioButton value="STORE">指定门店</ElRadioButton>
            </ElRadioGroup>
          </ElFormItem>
          <ElFormItem
            v-if="!platformMode && form.scopeType === 'STORE'"
            label="目标门店"
            prop="storeIds"
          >
            <ElSelect
              v-model="form.storeIds"
              multiple
              filterable
              collapse-tags
              collapse-tags-tooltip
              placeholder="请选择门店"
              class="full-width"
            >
              <ElOption
                v-for="store in stores"
                :key="String(store.id)"
                :label="store.storeName"
                :value="store.id"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="公告标题" prop="title">
            <ElInput
              v-model="form.title"
              maxlength="200"
              show-word-limit
              placeholder="请输入公告标题"
            />
          </ElFormItem>
          <div class="form-row">
            <ElFormItem label="公告级别" prop="level">
              <ElRadioGroup v-model="form.level">
                <ElRadio value="NORMAL">普通</ElRadio>
                <ElRadio value="IMPORTANT">重要</ElRadio>
                <ElRadio value="URGENT">紧急</ElRadio>
              </ElRadioGroup>
            </ElFormItem>
            <ElFormItem label="过期时间" prop="expireTime">
              <ElDatePicker
                v-model="form.expireTime"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                placeholder="不填写则长期有效"
                class="full-width"
              />
            </ElFormItem>
          </div>
          <ElFormItem label="公告内容" prop="content">
            <ArtWangEditor
              v-model="form.content"
              height="300px"
              placeholder="请输入公告正文，可使用标题、列表、表格和图片"
              :upload-config="editorUploadConfig"
            />
          </ElFormItem>
          <ElFormItem label="附件">
            <div class="attachment-upload">
              <ElUpload
                v-model:file-list="attachmentFiles"
                :http-request="uploadAttachmentRequest"
                :before-upload="beforeAttachmentUpload"
                :on-success="handleAttachmentSuccess"
                :on-remove="handleAttachmentRemove"
                :on-exceed="handleAttachmentExceed"
                :limit="5"
                accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
              >
                <ElButton plain><ArtSvgIcon icon="ri:attachment-2" />选择附件</ElButton>
                <template #tip>
                  <div class="upload-tip"
                    >最多 5 个，单个不超过 20MB，支持图片、Office、PDF、文本和压缩包。</div
                  >
                </template>
              </ElUpload>
            </div>
          </ElFormItem>
        </ArtForm>
      </div>
      <template #footer>
        <ElButton @click="editorVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="save">保存草稿</ElButton>
      </template>
    </ElDialog>

    <ElDialog
      v-model="previewVisible"
      title="公告详情"
      width="min(860px, calc(100vw - 28px))"
      append-to-body
    >
      <AnnouncementDetailPanel :announcement="selected" />
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, reactive, ref } from 'vue'
  import {
    ElMessage,
    ElMessageBox,
    type FormRules,
    type UploadFile,
    type UploadProps,
    type UploadRequestOptions
  } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import ArtWangEditor from '@/components/core/forms/art-wang-editor/index.vue'
  import AnnouncementDetailPanel from '@/components/business/announcement-detail/index.vue'
  import AnnouncementSearch from './modules/announcement-search.vue'
  import { fetchGetStoreList } from '@/api/dish-manage'
  import { uploadAttachment, type UploadedFile } from '@/api/upload'
  import {
    createAnnouncement,
    deleteAnnouncement,
    getAnnouncementPage,
    publishAnnouncement,
    updateAnnouncement,
    withdrawAnnouncement,
    type Announcement,
    type AnnouncementForm,
    type AnnouncementLevel,
    type AnnouncementStatus
  } from '@/api/announcement'
  import { useUserStore } from '@/store/modules/user'

  defineOptions({ name: 'AnnouncementManagement' })

  const session = useUserStore()
  const platformMode = computed(() => session.isSuperAdmin && !session.activeTenant)
  const saving = ref(false)
  const editorVisible = ref(false)
  const previewVisible = ref(false)
  const editingId = ref<Announcement['id']>()
  const selected = ref<Announcement>()
  const stores = ref<Api.Store.StoreListItem[]>([])
  const formRef = ref()
  const attachmentFiles = ref<UploadFile[]>([])
  const searchForm = reactive({ status: '' as AnnouncementStatus | '', keyword: '' })
  const emptyForm = (): AnnouncementForm => ({
    title: '',
    content: '',
    level: 'NORMAL',
    scopeType: platformMode.value ? 'PLATFORM' : 'TENANT',
    storeIds: [],
    attachments: [],
    expireTime: null
  })
  const form = reactive<AnnouncementForm>(emptyForm())
  const editorUploadConfig = {
    server: '/file-upload/upload/image',
    isCustomUpload: true,
    maxFileSize: 3 * 1024 * 1024,
    maxNumberOfFiles: 10
  }
  const levelMeta: Record<
    AnnouncementLevel,
    { label: string; type: 'primary' | 'warning' | 'danger' }
  > = {
    NORMAL: { label: '普通', type: 'primary' },
    IMPORTANT: { label: '重要', type: 'warning' },
    URGENT: { label: '紧急', type: 'danger' }
  }
  const statusMeta: Record<
    AnnouncementStatus,
    { label: string; type: 'info' | 'success' | 'warning' }
  > = {
    DRAFT: { label: '草稿', type: 'info' },
    PUBLISHED: { label: '已发布', type: 'success' },
    WITHDRAWN: { label: '已撤回', type: 'warning' }
  }
  const levelInfo = (value: unknown) => levelMeta[value as AnnouncementLevel] || levelMeta.NORMAL
  const statusInfo = (value: unknown) => statusMeta[value as AnnouncementStatus] || statusMeta.DRAFT

  const {
    data: rows,
    columns,
    columnChecks,
    loading,
    getData,
    pagination,
    refreshData,
    handleSizeChange,
    handleCurrentChange
  } = useTable({
    core: {
      apiFn: (params: any) => getAnnouncementPage(params),
      apiParams: { currentPage: 1, pageSize: 10, status: '', keyword: '' },
      paginationKey: { current: 'currentPage', size: 'pageSize' },
      columnsFactory: () => [
        { prop: 'title', label: '标题', minWidth: 220, showOverflowTooltip: true },
        {
          prop: 'publisherName',
          label: '发布人',
          width: 120,
          showOverflowTooltip: true
        },
        {
          prop: 'level',
          label: '级别',
          width: 90,
          align: 'center',
          useSlot: true,
          slotName: 'level'
        },
        {
          prop: 'scope',
          label: '范围',
          width: 120,
          align: 'center',
          useSlot: true,
          slotName: 'scope'
        },
        {
          prop: 'status',
          label: '状态',
          width: 100,
          align: 'center',
          useSlot: true,
          slotName: 'status'
        },
        {
          prop: 'attachments',
          label: '附件',
          width: 80,
          align: 'center',
          useSlot: true,
          slotName: 'attachments'
        },
        {
          prop: 'publishTime',
          label: '发布时间',
          width: 170,
          useSlot: true,
          slotName: 'publishTime'
        },
        {
          prop: 'expireTime',
          label: '过期时间',
          width: 170,
          useSlot: true,
          slotName: 'expireTime'
        },
        {
          prop: 'operation',
          label: '操作',
          width: 224,
          fixed: 'right',
          useSlot: true,
          slotName: 'operation'
        }
      ]
    }
  })

  const contentIsEmpty = (value: string) =>
    !/<(img|video|audio)\b/i.test(value) &&
    value
      .replace(/&nbsp;/gi, '')
      .replace(/<br\s*\/?>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim() === ''
  const rules: FormRules = {
    title: [{ required: true, message: '请输入公告标题', trigger: 'blur' }],
    scopeType: [{ required: true, message: '请选择发布范围', trigger: 'change' }],
    storeIds: [
      {
        validator: (_rule, value, callback) =>
          form.scopeType !== 'STORE' || value?.length
            ? callback()
            : callback(new Error('请选择目标门店')),
        trigger: 'change'
      }
    ],
    content: [
      {
        validator: (_rule, value, callback) =>
          value && !contentIsEmpty(value) ? callback() : callback(new Error('请输入公告内容')),
        trigger: 'change'
      }
    ]
  }

  const handleSearch = () => void getData({ ...searchForm })
  const resetSearch = () => {
    searchForm.status = ''
    searchForm.keyword = ''
    void getData({ ...searchForm })
  }

  function openEditor(row?: Announcement) {
    editingId.value = row?.id
    Object.assign(
      form,
      row
        ? {
            title: row.title,
            content: row.content,
            level: row.level,
            scopeType: row.scopeType,
            storeIds: [...row.storeIds],
            attachments: (row.attachments || []).map((item) => ({ ...item })),
            expireTime: row.expireTime || null
          }
        : emptyForm()
    )
    attachmentFiles.value = (row?.attachments || []).map((item, index) => ({
      uid: -(index + 1),
      name: item.fileName,
      url: item.fileUrl,
      size: item.fileSize,
      status: 'success'
    }))
    editorVisible.value = true
  }

  async function save() {
    try {
      await formRef.value?.validate()
      saving.value = true
      const payload: AnnouncementForm = {
        ...form,
        storeIds: [...form.storeIds],
        attachments: form.attachments.map((item, index) => ({ ...item, sortOrder: index }))
      }
      if (editingId.value) await updateAnnouncement(editingId.value, payload)
      else await createAnnouncement(payload)
      ElMessage.success('草稿已保存')
      editorVisible.value = false
      await refreshData()
    } finally {
      saving.value = false
    }
  }

  async function uploadAttachmentRequest(options: UploadRequestOptions) {
    return uploadAttachment(options.file)
  }
  const beforeAttachmentUpload: UploadProps['beforeUpload'] = (file) => {
    const extension = file.name.split('.').pop()?.toLowerCase() || ''
    const allowed = [
      'jpg',
      'jpeg',
      'png',
      'gif',
      'webp',
      'pdf',
      'doc',
      'docx',
      'xls',
      'xlsx',
      'ppt',
      'pptx',
      'txt',
      'csv',
      'zip',
      'rar'
    ]
    if (!allowed.includes(extension)) {
      ElMessage.warning('该附件格式不受支持')
      return false
    }
    if (file.size > 20 * 1024 * 1024) {
      ElMessage.warning('单个附件不能超过 20MB')
      return false
    }
    return true
  }
  const handleAttachmentSuccess: UploadProps['onSuccess'] = (response: UploadedFile, file) => {
    file.url = response.url
    form.attachments.push({
      fileName: response.originalFileName || file.name,
      fileUrl: response.url,
      fileSize: response.size || file.size || 0,
      contentType: response.contentType
    })
    ElMessage.success('附件上传成功')
  }
  const handleAttachmentRemove: UploadProps['onRemove'] = (file) => {
    const url = file.url || (file.response as UploadedFile | undefined)?.url
    form.attachments = form.attachments.filter((item) => item.fileUrl !== url)
  }
  const handleAttachmentExceed = () => ElMessage.warning('每条公告最多上传 5 个附件')

  async function publishRow(row: Announcement) {
    try {
      await ElMessageBox.confirm(`确认发布公告“${row.title}”？`, '发布公告', { type: 'warning' })
      await publishAnnouncement(row.id)
      ElMessage.success('公告已发布并实时推送')
      await refreshData()
    } catch {
      /* cancelled */
    }
  }
  async function withdrawRow(row: Announcement) {
    try {
      await ElMessageBox.confirm(`确认撤回公告“${row.title}”？`, '撤回公告', { type: 'warning' })
      await withdrawAnnouncement(row.id)
      ElMessage.success('公告已撤回')
      await refreshData()
    } catch {
      /* cancelled */
    }
  }
  async function deleteRow(row: Announcement) {
    try {
      await ElMessageBox.confirm(`确认删除草稿“${row.title}”？`, '删除草稿', { type: 'warning' })
      await deleteAnnouncement(row.id)
      ElMessage.success('草稿已删除')
      await refreshData()
    } catch {
      /* cancelled */
    }
  }
  function preview(row: Announcement) {
    selected.value = row
    previewVisible.value = true
  }
  function scopeLabel(row: Announcement) {
    if (row.scopeType === 'PLATFORM') return '全平台'
    if (row.scopeType === 'STORE') return `${row.storeIds.length} 家门店`
    return '整个商户'
  }
  onMounted(async () => {
    if (!platformMode.value) {
      try {
        stores.value = (await fetchGetStoreList()).records
      } catch {
        stores.value = []
      }
    }
  })
</script>

<style scoped lang="scss">
  .announcement-admin {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .scope-tip {
    flex: 0 0 auto;
  }

  .art-table-card {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  }

  .table-actions {
    display: flex;
    align-items: center;
    white-space: nowrap;
  }

  .attachment-count {
    display: inline-flex;
    gap: 4px;
    align-items: center;
    color: var(--el-text-color-secondary);
  }

  .editor-scroll {
    max-height: 72vh;
    padding-right: 4px;
    overflow-y: auto;
  }

  .full-width,
  .attachment-upload,
  :deep(.editor-wrapper) {
    width: 100%;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 20px;
  }

  .upload-tip {
    margin-top: 7px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  @media (width <= 720px) {
    .form-row {
      grid-template-columns: 1fr;
      gap: 0;
    }
  }
</style>
