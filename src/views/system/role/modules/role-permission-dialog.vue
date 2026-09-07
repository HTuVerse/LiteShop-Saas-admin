<template>
  <ElDialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    title="角色权限分配"
    width="min(780px, 94vw)"
    align-center
    :close-on-click-modal="false"
  >
    <p class="note"
      >菜单控制页面访问，操作权限控制按钮及对应接口。勾选菜单不会自动授予操作权限；选择操作时，保存会同时保留所属菜单和上级目录。</p
    >
    <ElScrollbar height="55vh" v-loading="loading"
      ><ElTree
        ref="tree"
        :data="nodes"
        node-key="id"
        show-checkbox
        check-strictly
        default-expand-all
        :props="{ children: 'children', label: labelOf }"
      >
        <template #default="{ data }">
          <span class="permission-row">
            <ElTag
              size="small"
              :type="permissionTypeCode(data.permissionType) === 1 ? 'info' : 'warning'"
            >
              {{
                permissionTypeCode(data.permissionType) === 1
                  ? '菜单'
                  : permissionTypeCode(data.permissionType) === 3
                    ? '接口'
                    : '操作'
              }}
            </ElTag>
            <span>{{ labelOf(data) }}</span>
            <code>{{ data.permissionCode }}</code>
          </span>
        </template>
      </ElTree></ElScrollbar
    >
    <template #footer
      ><ElButton :disabled="loading || saving" @click="selectAll">全选</ElButton
      ><ElButton :disabled="loading || saving" @click="tree?.setCheckedKeys([])">清空</ElButton
      ><ElButton
        v-auth="'system:role:assign'"
        type="primary"
        :disabled="loading"
        :loading="saving"
        @click="save"
        >保存权限</ElButton
      ></template
    >
  </ElDialog>
</template>
<script setup lang="ts">
  import { nextTick, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import { refreshBackendMenus } from '@/router/guards/beforeEach'
  import { ElMessage, ElTree } from 'element-plus'
  import request from '@/utils/http'
  import type { Id } from '@/types/backend'
  import { permissionTypeCode } from '@/utils/permission'
  interface PermissionNode {
    id: Id
    isAssigned?: boolean
    permissionName?: string
    permissionCode?: string
    permissionType?: string | number
    name?: string
    meta?: { title?: string }
    children?: PermissionNode[]
  }
  const props = defineProps<{ modelValue: boolean; roleData?: Api.SystemManage.RoleListItem }>()
  const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
    (e: 'success'): void
  }>()
  const nodes = ref<PermissionNode[]>([]),
    tree = ref<InstanceType<typeof ElTree>>(),
    loading = ref(false),
    saving = ref(false)
  const router = useRouter()
  let version = 0
  const labelOf = (node: Record<string, any>) =>
    node.meta?.title || node.permissionName || node.name || String(node.id)
  function flatten(list: PermissionNode[]): PermissionNode[] {
    return list.flatMap((node) => [node, ...flatten(node.children || [])])
  }
  watch(
    () => [props.modelValue, props.roleData?.id],
    async () => {
      const current = ++version
      if (!props.modelValue || !props.roleData?.id) return
      loading.value = true
      nodes.value = []
      try {
        const result = await request.get<PermissionNode[]>({
          url: '/sys-role-permission/listMenuTreeByRole',
          params: { roleId: props.roleData.id }
        })
        if (current !== version) return
        nodes.value = result
        await nextTick()
        tree.value?.setCheckedKeys(
          flatten(result)
            .filter((node) => node.isAssigned)
            .map((node) => node.id)
        )
      } catch {
      } finally {
        if (current === version) loading.value = false
      }
    }
  )
  function selectAll() {
    tree.value?.setCheckedKeys(flatten(nodes.value).map((node) => node.id))
  }
  async function save() {
    if (loading.value || saving.value || !tree.value || !props.roleData?.id) return
    saving.value = true
    const selected = new Set(tree.value.getCheckedKeys().map(String)),
      ids: Id[] = []
    function visit(list: PermissionNode[]): boolean {
      let any = false
      for (const node of list) {
        const child = visit(node.children || [])
        if (selected.has(String(node.id)) || child) {
          ids.push(node.id)
          any = true
        }
      }
      return any
    }
    visit(nodes.value)
    try {
      await request.post({
        url: '/sys-role-permission/assign',
        params: { roleId: props.roleData.id },
        data: ids
      })
      ElMessage.success('权限已保存')
      await refreshBackendMenus(router)
      emit('success')
      emit('update:modelValue', false)
    } catch {
    } finally {
      saving.value = false
    }
  }
</script>
<style scoped>
  .permission-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .permission-row code {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .note {
    margin-bottom: 16px;
    font-size: 13px;
    line-height: 1.8;
    color: var(--el-text-color-secondary);
  }
</style>
