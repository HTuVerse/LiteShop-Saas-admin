<template>
  <ElCard shadow="never">
    <div class="toolbar"
      ><ElInput
        v-model="keyword"
        placeholder="角色名称 / 编码"
        clearable
        style="width: 260px"
      /><ElSelect v-model="status" clearable placeholder="全部状态" style="width: 150px"
        ><ElOption label="启用" :value="1" /><ElOption label="禁用" :value="0" /></ElSelect
      ><ElButton @click="refreshData">刷新</ElButton
      ><ElButton v-auth="'system:role:add'" type="primary" @click="edit()">新增角色</ElButton></div
    >
    <ArtTable :data="filtered" v-loading="loading" row-key="id" :columns="tableColumns"
      ><template #tableColumnsSlot4="{ row }"
        ><ElTag :type="isEnabled(row) ? 'success' : 'info'">{{
          isEnabled(row) ? '启用' : '禁用'
        }}</ElTag></template
      >
    </ArtTable>
    <RoleEditDialog
      v-model="visible"
      :dialog-type="selected ? 'edit' : 'add'"
      :role-data="selected"
      @success="refreshData"
    />
    <RolePermissionDialog v-model="permissionVisible" :role-data="selected" />
  </ElCard>
</template>
<script setup lang="ts">
  import { useTable } from '@/hooks/core/useTable'
  import { computed, h, ref } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { fetchGetRoleList } from '@/api/system-manage'
  import request from '@/utils/http'
  import { useUserStore } from '@/store/modules/user'
  import RoleEditDialog from './modules/role-edit-dialog.vue'
  import RolePermissionDialog from './modules/role-permission-dialog.vue'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  type Role = Api.SystemManage.RoleListItem
  const session = useUserStore(),
    keyword = ref(''),
    status = ref<number>(),
    visible = ref(false),
    permissionVisible = ref(false),
    selected = ref<Role>()
  const isEnabled = (row: Role) => ['正常', '1'].includes(String(row.status))
  const filtered = computed(() =>
    rows.value.filter(
      (row) =>
        (session.isSuperAdmin || row.roleCode !== 'SUPER_ADMIN') &&
        (!keyword.value ||
          (row.roleName + ' ' + row.roleCode)
            .toLowerCase()
            .includes(keyword.value.toLowerCase())) &&
        (status.value === undefined || status.value === (isEnabled(row) ? 1 : 0))
    )
  )
  const openPermissions = (row: Role) => {
    selected.value = row
    permissionVisible.value = true
  }
  function edit(row?: Role) {
    selected.value = row
    visible.value = true
  }
  async function remove(row: Role) {
    try {
      await ElMessageBox.confirm('确认删除角色“' + row.roleName + '”？', '删除角色')
      await request.del({ url: '/sys-role/' + row.id })
      ElMessage.success('角色已删除')
      await refreshRemove()
    } catch {}
  }

  const {
    data: rows,
    columns: tableColumns,
    loading,
    refreshData,
    refreshRemove
  } = useTable({
    core: {
      apiFn: fetchGetRoleList,
      columnsFactory: () => [
        { prop: 'roleName', label: '角色名称' },
        { prop: 'roleCode', label: '角色编码' },
        { prop: 'description', label: '描述', minWidth: 150 },
        {
          prop: 'tableColumnsColumn4',
          label: '状态',
          width: 90,
          useSlot: true,
          slotName: 'tableColumnsSlot4'
        },
        {
          prop: 'operation',
          label: '操作',
          width: 150,
          fixed: 'right',
          align: 'center',
          formatter: (row: Role) =>
            h('div', { class: 'flex items-center justify-center' }, [
              h(ArtButtonTable, {
                auth: 'system:role:edit',
                type: 'edit',
                label: '编辑角色',
                onClick: () => edit(row)
              }),
              h(ArtButtonTable, {
                auth: 'system:role:assign',
                icon: 'ri:shield-keyhole-line',
                iconClass: 'bg-theme/12 text-theme',
                label: '分配权限',
                onClick: () => openPermissions(row)
              }),
              h(ArtButtonTable, {
                auth: 'system:role:delete',
                type: 'delete',
                label: '删除角色',
                onClick: () => remove(row)
              })
            ])
        }
      ]
    }
  })
</script>
<style scoped>
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 20px;
  }
</style>
