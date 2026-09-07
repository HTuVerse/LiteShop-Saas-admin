<template>
  <div class="art-full-height">
    <ArtSearchBar
      :model-value="search"
      @update:model-value="(value) => Object.assign(search, value)"
      :items="searchItems"
      @search="searchRows"
      @reset="searchRows"
    />
    <ElCard class="art-table-card" shadow="never">
      <ArtTableHeader @refresh="refreshData"
        ><template #left
          ><ElButton v-auth="'system:user-store:assign'" type="primary" @click="openNew"
            >新增授权</ElButton
          ></template
        ></ArtTableHeader
      >
      <ArtTable
        :data="rows"
        :loading="loading"
        row-key="userId"
        :pagination="pagination"
        @pagination:current-change="handleCurrentChange"
        @pagination:size-change="handleSizeChange"
        :columns="tableColumns"
      >
        <template #tableColumnsSlot4="{ row }">
          <ElTag v-if="row.allStores" type="success">全部门店（租户管理员）</ElTag>
          <ElSpace v-else-if="row.storeIds.length" wrap
            ><ElTag v-for="id in row.storeIds" :key="id">{{ storeName(id) }}</ElTag></ElSpace
          >
          <span v-else class="muted">未授权</span>
        </template>
        <template #tableColumnsSlot5="{ row }">{{
          row.defaultStoreId ? storeName(row.defaultStoreId) : '未设置'
        }}</template>
      </ArtTable>
    </ElCard>
    <ElDialog
      v-model="visible"
      title="门店授权"
      width="620px"
      align-center
      :close-on-click-modal="false"
      :close-on-press-escape="!saving"
      :show-close="!saving"
      destroy-on-close
    >
      <ArtForm ref="formRef" :model="form" label-width="100px" :rules="rules">
        <ElFormItem label="授权用户" prop="userId">
          <ElSelect
            v-model="form.userId"
            :disabled="editing || saving"
            filterable
            remote
            :remote-method="searchUsers"
            :loading="searching"
            placeholder="搜索用户名、昵称或完整用户 ID"
            style="width: 100%"
            @change="loadSelected"
          >
            <ElOption
              v-for="user in users"
              :key="user.userId"
              :value="String(user.userId)"
              :label="(user.nickname || user.username) + ' · ' + user.userId"
            />
          </ElSelect>
        </ElFormItem>
        <ElAlert
          v-if="selectedAllStores"
          title="租户管理员拥有当前租户全部门店，无需逐个授权。"
          type="info"
          :closable="false"
        />
        <ElFormItem label="授权门店" prop="storeIds">
          <ElSelect
            v-model="form.storeIds"
            multiple
            filterable
            collapse-tags
            collapse-tags-tooltip
            :max-collapse-tags="4"
            :disabled="saving || selectedAllStores"
            placeholder="选择可访问的门店"
            style="width: 100%"
          >
            <ElOption
              v-for="store in stores"
              :key="store.id"
              :value="String(store.id)"
              :label="store.storeName"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="默认门店"
          ><ElSelect
            v-model="form.defaultStoreId"
            clearable
            filterable
            :disabled="saving || selectedAllStores"
            placeholder="可选"
            style="width: 100%"
            ><ElOption
              v-for="id in form.storeIds"
              :key="id"
              :value="id"
              :label="storeName(id)" /></ElSelect
        ></ElFormItem>
      </ArtForm>
      <template #footer
        ><ElButton :disabled="saving" @click="visible = false">取消</ElButton
        ><ElButton
          v-auth="'system:user-store:assign'"
          type="primary"
          :loading="saving"
          :disabled="selectedAllStores || !form.userId"
          @click="save"
          >保存授权</ElButton
        ></template
      >
    </ElDialog>
  </div>
</template>
<script setup lang="ts">
  import { useTable } from '@/hooks/core/useTable'
  import { computed, h, onMounted, reactive, ref, watch } from 'vue'
  import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
  import { listStoreAuthorizations, assignUserStores, type StoreAuthorization } from '@/api/tenant'
  import { fetchGetStoreList } from '@/api/dish-manage'
  import type { Id } from '@/types/backend'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  const stores = ref<Api.Store.StoreListItem[]>([]),
    users = ref<StoreAuthorization[]>([])
  const search = reactive<{ keyword: string; storeId?: Id; authorized?: boolean }>({
    keyword: '',
    authorized: true
  })
  const searchItems = computed(() => [
    {
      key: 'keyword',
      label: '用户',
      type: 'input',
      props: { placeholder: '用户名 / 昵称 / 手机号 / ID', clearable: true }
    },
    {
      key: 'storeId',
      label: '门店',
      type: 'select',
      props: {
        clearable: true,
        filterable: true,
        options: stores.value.map((s) => ({ label: s.storeName, value: String(s.id) }))
      }
    },
    {
      key: 'authorized',
      label: '授权状态',
      type: 'select',
      props: {
        clearable: true,
        options: [
          { label: '已授权', value: true },
          { label: '未授权', value: false }
        ]
      }
    }
  ])
  const visible = ref(false),
    saving = ref(false),
    searching = ref(false),
    editing = ref(false),
    selectedAllStores = ref(false)
  const formRef = ref<FormInstance>(),
    form = reactive({ userId: '', storeIds: [] as string[], defaultStoreId: '' })
  const rules: FormRules = {
    userId: [{ required: true, message: '请选择用户', trigger: 'change' }]
  }
  let userVersion = 0
  const storeName = (id: Id) =>
    stores.value.find((s) => String(s.id) === String(id))?.storeName || '门店 ' + id
  async function searchRows() {
    replaceSearchParams({
      keyword: search.keyword || undefined,
      storeId: search.storeId,
      authorized: search.authorized
    })
    await getData()
  }
  async function searchUsers(keyword = '') {
    const version = ++userVersion
    searching.value = true
    try {
      const page = await listStoreAuthorizations({ keyword, currentPage: 1, pageSize: 30 })
      if (version === userVersion) users.value = page.records
    } finally {
      if (version === userVersion) searching.value = false
    }
  }
  function setSelected(row: StoreAuthorization) {
    form.userId = String(row.userId)
    form.storeIds = row.storeIds.map(String)
    form.defaultStoreId = row.defaultStoreId ? String(row.defaultStoreId) : ''
    selectedAllStores.value = row.allStores
  }
  function loadSelected() {
    const row = users.value.find((u) => String(u.userId) === form.userId)
    if (row) setSelected(row)
  }
  function openEdit(row: StoreAuthorization) {
    editing.value = true
    users.value = [row]
    setSelected(row)
    visible.value = true
  }
  function openNew() {
    editing.value = false
    Object.assign(form, { userId: '', storeIds: [], defaultStoreId: '' })
    selectedAllStores.value = false
    visible.value = true
    void searchUsers()
  }
  watch(
    () => form.storeIds,
    (ids) => {
      if (!ids.includes(form.defaultStoreId)) form.defaultStoreId = ''
    },
    { deep: true }
  )
  async function save() {
    if (
      saving.value ||
      selectedAllStores.value ||
      !(await formRef.value?.validate().catch(() => false))
    )
      return
    try {
      if (!form.storeIds.length)
        await ElMessageBox.confirm('清空后，门店角色将无法访问任何门店。确认清空？', '清空门店授权')
      saving.value = true
      await assignUserStores(form.userId, form.storeIds, form.defaultStoreId || undefined)
      ElMessage.success('门店授权已保存')
      visible.value = false
      await refreshUpdate()
    } catch {
    } finally {
      saving.value = false
    }
  }
  onMounted(async () => {
    const page = await fetchGetStoreList()
    stores.value = page.records
  })

  const {
    data: rows,
    columns: tableColumns,
    loading,
    pagination,
    getData,
    replaceSearchParams,
    handleSizeChange,
    handleCurrentChange,
    refreshData,
    refreshUpdate
  } = useTable({
    core: {
      apiFn: listStoreAuthorizations,
      apiParams: { currentPage: 1, pageSize: 20, authorized: true },
      paginationKey: { current: 'currentPage', size: 'pageSize' },
      columnsFactory: () => [
        { prop: 'username', label: '用户名', minWidth: 130 },
        { prop: 'nickname', label: '昵称', minWidth: 120 },
        { prop: 'userId', label: '用户 ID', minWidth: 185 },
        {
          prop: 'tableColumnsColumn4',
          label: '已授权门店',
          minWidth: 240,
          useSlot: true,
          slotName: 'tableColumnsSlot4'
        },
        {
          prop: 'tableColumnsColumn5',
          label: '默认门店',
          minWidth: 150,
          useSlot: true,
          slotName: 'tableColumnsSlot5'
        },
        {
          prop: 'operation',
          label: '操作',
          width: 90,
          fixed: 'right',
          align: 'center',
          formatter: (row: StoreAuthorization) =>
            h(ArtButtonTable, {
              auth: 'system:user-store:assign',
              icon: 'ri:key-line',
              iconClass: 'bg-theme/12 text-theme',
              label: row.allStores ? '租户管理员已拥有全部门店权限' : '调整门店授权',
              disabled: row.allStores,
              onClick: () => openEdit(row)
            })
        }
      ]
    }
  })
</script>
<style scoped>
  .muted {
    color: var(--el-text-color-secondary);
  }
</style>
