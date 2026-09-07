<template>
  <ElDialog
    :model-value="visible"
    title="调整菜单层级与排序"
    width="860px"
    align-center
    :close-on-click-modal="false"
    :close-on-press-escape="!saving"
    :show-close="!saving"
    @update:model-value="close"
  >
    <p class="mb-4 text-sm text-g-600">
      拖到条目上方或下方调整顺序，拖到目录中移动层级；拖到“顶层菜单”中可移出目录。
      页面地址保持不变，点击“保存调整”后生效。
    </p>
    <ElScrollbar height="440px">
      <ElTree
        :key="treeVersion"
        :data="rootNodes"
        node-key="id"
        :props="{ label: 'permissionName', children: 'children' }"
        default-expand-all
        :expand-on-click-node="false"
        :draggable="!saving"
        :allow-drag="allowDrag"
        :allow-drop="allowDrop"
        @node-drop="changed = true"
      >
        <template #default="{ data }">
          <div class="hierarchy-row">
            <ArtSvgIcon
              :icon="
                data.id === '0' || isPermissionDirectory(data)
                  ? 'ri:folder-line'
                  : 'ri:drag-move-2-line'
              "
            />
            <span>{{ data.permissionName }}</span>
            <ElTag
              v-if="data.id !== '0'"
              size="small"
              :type="data.status === 0 ? 'info' : 'primary'"
            >
              {{
                data.status === 0
                  ? '禁用'
                  : data.permissionType === 3
                  ? 'API'
                  : data.permissionType === 2
                  ? '按钮'
                  : isPermissionDirectory(data)
                  ? '目录'
                  : '菜单'
              }}
            </ElTag>
            <span class="hierarchy-path">{{ data.routerAddress || data.permissionCode }}</span>
          </div>
        </template>
      </ElTree>
    </ElScrollbar>
    <template #footer>
      <ElButton :disabled="saving" @click="reset">重置调整</ElButton>
      <ElButton :disabled="saving" @click="close">取 消</ElButton>
      <ElButton type="primary" :loading="saving" :disabled="!changed" @click="submit"
        >保存调整</ElButton
      >
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import type Node from 'element-plus/es/components/tree/src/model/node'
  import type { PermissionNode } from '@/utils/permission'
  import {
    canParentPermission,
    hierarchyEntries,
    isPermissionDirectory,
    type HierarchyChange
  } from '@/utils/permission-hierarchy'

  const props = defineProps<{ visible: boolean; permissions: PermissionNode[]; saving: boolean }>()
  const emit = defineEmits<{
    'update:visible': [boolean]
    submit: [HierarchyChange]
  }>()
  const changed = ref(false)
  const treeVersion = ref(0)
  const rootNodes = ref<PermissionNode[]>([])
  const reset = () => {
    rootNodes.value = [
      {
        id: '0',
        permissionName: '顶层菜单',
        componentAddress: 'Layout',
        permissionType: 1,
        children: JSON.parse(JSON.stringify(props.permissions))
      } as PermissionNode
    ]
    treeVersion.value++
    changed.value = false
  }
  const allowDrag = (node: Node) => node.data.id !== '0'
  const allowDrop = (drag: Node, drop: Node, type: 'prev' | 'inner' | 'next') => {
    if (drop.data.id === '0' && type !== 'inner') return false
    const parent = type === 'inner' ? drop : drop.parent
    if (!parent) return false
    return canParentPermission(
      drag.data as PermissionNode,
      parent.data.id === '0' ? undefined : (parent.data as PermissionNode)
    )
  }
  const close = () => {
    if (!props.saving) emit('update:visible', false)
  }
  const submit = () => {
    if (!changed.value || props.saving) return
    emit('submit', {
      original: hierarchyEntries(props.permissions),
      nodes: hierarchyEntries(rootNodes.value[0].children || [], true)
    })
  }
  watch(
    () => props.visible,
    (visible) => {
      if (visible) reset()
    }
  )
</script>

<style scoped>
  .hierarchy-row {
    display: flex;
    gap: 10px;
    align-items: center;
    width: 100%;
    min-width: 0;
    padding-right: 12px;
  }

  .hierarchy-path {
    max-width: 45%;
    margin-left: auto;
    overflow: hidden;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :deep(.el-tree-node__content) {
    height: 38px;
  }
</style>
