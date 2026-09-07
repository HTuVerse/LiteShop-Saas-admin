<!-- 菜单管理页面 -->
<template>
  <div class="menu-page art-full-height">
    <!-- 搜索栏 -->
    <ArtSearchBar
      :model-value="formFilters"
      @update:model-value="(value) => Object.assign(formFilters, value)"
      :items="formItems"
      :showExpand="false"
      @reset="handleReset"
      @search="handleSearch"
    />

    <ElCard class="art-table-card" shadow="never">
      <!-- 表格头部 -->
      <ArtTableHeader
        :showZebra="false"
        :loading="loading"
        v-model:columns="columnChecks"
        @refresh="handleRefresh"
      >
        <template #left>
          <ElSpace :size="12" wrap alignment="center">
            <ArtIconPicker browse />
            <ElButton @click="handleAddMenu" v-ripple> 添加菜单 </ElButton>
            <ElButton @click="toggleExpand" v-ripple>
              {{ isExpanded ? '收起' : '展开' }}
            </ElButton>
            <ElButton :disabled="loading || saving" @click="hierarchyVisible = true" v-ripple
              >调整层级 / 排序</ElButton
            >
          </ElSpace>
        </template>
      </ArtTableHeader>

      <ArtTable
        ref="tableRef"
        rowKey="id"
        :loading="loading"
        :columns="columns"
        :data="filteredTableData"
        :stripe="false"
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
        :default-expand-all="false"
      />

      <!-- 菜单弹窗 -->
      <MenuDialog
        v-model:visible="dialogVisible"
        :type="dialogType"
        :editData="editData"
        :lockType="lockMenuType"
        :saving="saving"
        :permissions="permissions"
        @submit="handleSubmit"
      />
      <MenuHierarchyDialog
        v-model:visible="hierarchyVisible"
        :permissions="permissions"
        :saving="saving"
        @submit="handleHierarchySubmit"
      />
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { resolveMenuScope, menuScopeLabels, componentPath } from '@/router/backend-menu'
  import { formatMenuTitle } from '@/utils/router'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import { useTable } from '@/hooks/core/useTable'
  import type { AppRouteRecord } from '@/types/router'
  import MenuDialog from './modules/menu-dialog.vue'
  import MenuHierarchyDialog from './modules/menu-hierarchy-dialog.vue'
  import { refreshBackendMenus } from '@/router/guards/beforeEach'
  import type { HierarchyChange } from '@/utils/permission-hierarchy'
  import {
    fetchGetPermissionTree,
    fetchAddPermission,
    fetchUpdatePermission,
    fetchDeletePermission,
    fetchUpdatePermissionHierarchy
  } from '@/api/system-manage'
  import { ElTag, ElMessage, ElMessageBox } from 'element-plus'
  import {
    normalizePermissionTree,
    permissionStatusCode,
    permissionTypeCode,
    type PermissionNode
  } from '@/utils/permission'

  defineOptions({ name: 'Menus' })

  // 状态管理
  const loading = ref(false)
  const saving = ref(false)
  const permissions = ref<PermissionNode[]>([])
  const hierarchyVisible = ref(false)
  const router = useRouter()
  const isExpanded = ref(false)
  const tableRef = ref()

  // 弹窗相关
  const dialogVisible = ref(false)
  const dialogType = ref<'menu' | 'button'>('menu')
  const editData = ref<AppRouteRecord | any>(null)
  const lockMenuType = ref(false)

  // 搜索相关
  const initialSearchState = {
    name: '',
    route: ''
  }

  const formFilters = reactive({ ...initialSearchState })
  const appliedFilters = reactive({ ...initialSearchState })

  const formItems = computed(() => [
    {
      label: '菜单名称',
      key: 'name',
      type: 'input',
      props: { clearable: true }
    },
    {
      label: '路由地址',
      key: 'route',
      type: 'input',
      props: { clearable: true }
    }
  ])

  onMounted(() => {
    getMenuList()
  })

  /**
   * 获取菜单列表数据
   */
  const getMenuList = async (): Promise<void> => {
    loading.value = true

    try {
      const list = await fetchGetPermissionTree()
      // Preserve the original route-shaped table while keeping real permission IDs.
      const toRows = (nodes: PermissionNode[]): AppRouteRecord[] =>
        nodes.map((node) => ({
          ...node,
          path: node.routerAddress,
          component: node.componentAddress,
          meta: {
            ...node.meta,
            title: node.permissionName,
            isAuthButton: node.permissionType !== 1,
            authMark: node.permissionCode
          },
          children: toRows(node.children || [])
        }))
      permissions.value = normalizePermissionTree(list)
      tableData.value = toRows(permissions.value)
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '获取菜单失败')
      throw error instanceof Error ? error : new Error('获取菜单失败')
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取菜单类型标签颜色
   * @param row 菜单行数据
   * @returns 标签颜色类型
   */
  const getMenuTypeTag = (
    row: AppRouteRecord
  ): 'primary' | 'success' | 'warning' | 'info' | 'danger' => {
    if (permissionTypeCode((row as any).permissionType) === 3) return 'warning'
    if (row.meta?.isAuthButton) return 'danger'
    if (['Layout', '/index/index'].includes(row.component as string)) return 'info'
    if (row.meta?.link && row.meta?.isIframe) return 'success'
    if (row.path) return 'primary'
    if (row.meta?.link) return 'warning'
    return 'info'
  }

  /**
   * 获取菜单类型文本
   * @param row 菜单行数据
   * @returns 菜单类型文本
   */
  const getMenuTypeText = (row: any): string => {
    if (permissionTypeCode(row.permissionType) === 3) return 'API'
    if (row.meta?.isAuthButton) return '按钮'
    if (['Layout', '/index/index'].includes(row.component)) return '目录'
    if (row.meta?.link && row.meta?.isIframe) return '内嵌'
    if (row.path) return '菜单'
    if (row.meta?.link) return '外链'
    return '未知'
  }

  // 表格列配置
  const { columnChecks, columns } = useTable({
    core: {
      apiFn: async (): Promise<AppRouteRecord[]> => [],
      immediate: false,
      columnsFactory: () => [
        {
          prop: 'meta.title',
          label: '菜单名称',
          minWidth: 120,
          formatter: (row: AppRouteRecord) => formatMenuTitle(row.meta?.title)
        },
        {
          prop: 'type',
          label: '菜单类型',
          formatter: (row) => {
            return h(ElTag, { type: getMenuTypeTag(row) }, () => getMenuTypeText(row))
          }
        },
        {
          prop: 'menuScope',
          label: '显示范围',
          minWidth: 125,
          formatter: (row: any) =>
            row.meta?.isAuthButton
              ? '随所属页面'
              : componentPath(row.component) === '/index/index'
              ? '随子菜单'
              : menuScopeLabels[resolveMenuScope(row)]
        },
        {
          prop: 'path',
          label: '路由',
          formatter: (row) => {
            if (row.meta?.isAuthButton) return ''
            return row.meta?.link || row.path || ''
          }
        },
        {
          prop: 'date',
          label: '编辑时间',
          formatter: (row: any) => {
            return row.updateTime
          }
        },
        {
          prop: 'status',
          label: '状态',
          formatter: (row: any) => {
            const enabled = permissionStatusCode(row.status) === 1
            return h(ElTag, { type: enabled ? 'success' : 'info' }, () =>
              enabled ? '启用' : '禁用'
            )
          }
        },
        {
          prop: 'operation',
          label: '操作',
          width: 180,
          align: 'right',
          formatter: (row: AppRouteRecord) => {
            const buttonStyle = { style: 'text-align: right' }

            if (row.meta?.isAuthButton) {
              return h('div', buttonStyle, [
                h(ArtButtonTable, {
                  type: 'edit',
                  onClick: () => handleEditAuth(row)
                }),
                h(ArtButtonTable, {
                  type: 'delete',
                  onClick: () => handleDeleteAuth(row)
                })
              ])
            }

            return h('div', buttonStyle, [
              h(ArtButtonTable, {
                type: 'add',
                onClick: () => handleAddAuth(row),
                title: '新增权限'
              }),
              h(ArtButtonTable, {
                type: 'edit',
                onClick: () => handleEditMenu(row)
              }),
              h(ArtButtonTable, {
                type: 'delete',
                onClick: () => handleDeleteMenu(row)
              })
            ])
          }
        }
      ]
    }
  })

  // 数据相关
  const tableData = ref<AppRouteRecord[]>([])

  /**
   * 重置搜索条件
   */
  const handleReset = (): void => {
    Object.assign(formFilters, { ...initialSearchState })
    Object.assign(appliedFilters, { ...initialSearchState })
    getMenuList()
  }

  /**
   * 执行搜索
   */
  const handleSearch = (): void => {
    Object.assign(appliedFilters, { ...formFilters })
    getMenuList()
  }

  /**
   * 刷新菜单列表
   */
  const handleRefresh = (): void => {
    getMenuList()
  }

  /**
   * 深度克隆对象
   * @param obj 要克隆的对象
   * @returns 克隆后的对象
   */
  const deepClone = <T>(obj: T): T => {
    if (obj === null || typeof obj !== 'object') return obj
    if (obj instanceof Date) return new Date(obj) as T
    if (Array.isArray(obj)) return obj.map((item) => deepClone(item)) as T

    const cloned = {} as T
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = deepClone(obj[key])
      }
    }
    return cloned
  }

  /**
   * 搜索菜单
   * @param items 菜单项数组
   * @returns 搜索结果数组
   */
  const searchMenu = (items: AppRouteRecord[]): AppRouteRecord[] => {
    const results: AppRouteRecord[] = []

    for (const item of items) {
      const searchName = appliedFilters.name?.toLowerCase().trim() || ''
      const searchRoute = appliedFilters.route?.toLowerCase().trim() || ''
      const menuTitle = formatMenuTitle(item.meta?.title || '').toLowerCase()
      const menuPath = (item.path || '').toLowerCase()
      const nameMatch = !searchName || menuTitle.includes(searchName)
      const routeMatch = !searchRoute || menuPath.includes(searchRoute)

      if (item.children?.length) {
        const matchedChildren = searchMenu(item.children)
        if (matchedChildren.length > 0) {
          const clonedItem = deepClone(item)
          clonedItem.children = matchedChildren
          results.push(clonedItem)
          continue
        }
      }

      if (nameMatch && routeMatch) {
        results.push(deepClone(item))
      }
    }

    return results
  }

  // 过滤后的表格数据
  const filteredTableData = computed(() => {
    const searchedData = searchMenu(tableData.value)
    return searchedData
  })

  /**
   * 添加菜单
   */
  const handleAddMenu = (): void => {
    dialogType.value = 'menu'
    editData.value = null
    lockMenuType.value = true
    dialogVisible.value = true
  }

  /**
   * 添加权限按钮
   * @param parentRow 父菜单行数据
   */
  const handleAddAuth = (parentRow?: AppRouteRecord): void => {
    dialogType.value =
      parentRow && !['Layout', '/index/index'].includes(parentRow.component as string)
        ? 'button'
        : 'menu'
    editData.value = parentRow ? { parentId: parentRow.id } : null
    lockMenuType.value = false
    dialogVisible.value = true
  }

  /**
   * 编辑菜单
   * @param row 菜单行数据
   */
  const handleEditMenu = (row: AppRouteRecord): void => {
    dialogType.value = 'menu'
    editData.value = row
    lockMenuType.value = true
    dialogVisible.value = true
  }

  /**
   * 编辑权限按钮
   * @param row 权限行数据
   */
  const handleEditAuth = (row: AppRouteRecord): void => {
    dialogType.value = 'button'
    editData.value = row
    lockMenuType.value = false
    dialogVisible.value = true
  }

  /**
   * 提交表单数据
   * @param formData 表单数据
   * @param isEdit 是否为编辑模式
   */
  const handleSubmit = async (
    formData: Api.SystemManage.PermissionFormData,
    isEdit: boolean
  ): Promise<void> => {
    if (saving.value) return
    saving.value = true
    try {
      loading.value = true

      if (isEdit) {
        await fetchUpdatePermission(formData)
        ElMessage.success('编辑成功')
      } else {
        await fetchAddPermission(formData)
        ElMessage.success('新增成功')
      }

      dialogVisible.value = false
      await getMenuList()
      await syncSidebar()
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '操作失败')
    } finally {
      loading.value = false
      saving.value = false
    }
  }

  /**
   * 删除菜单
   * @param row 菜单行数据
   */
  const handleDeleteMenu = async (row: AppRouteRecord): Promise<void> => {
    try {
      await ElMessageBox.confirm(
        `确定要删除菜单"${formatMenuTitle(row.meta?.title || '')}"吗？删除后无法恢复`,
        '提示',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )

      loading.value = true
      if (row.id == null) return
      await fetchDeletePermission(row.id)
      ElMessage.success('删除成功')
      await getMenuList()
      await syncSidebar()
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(error instanceof Error ? error.message : '删除失败')
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * 删除权限按钮
   * @param row 权限行数据
   */
  const handleDeleteAuth = async (row: AppRouteRecord): Promise<void> => {
    try {
      await ElMessageBox.confirm(
        `确定要删除权限"${formatMenuTitle(row.meta?.title || '')}"吗？删除后无法恢复`,
        '提示',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )

      loading.value = true
      if (row.id == null) return
      await fetchDeletePermission(row.id)
      ElMessage.success('删除成功')
      await getMenuList()
      await syncSidebar()
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(error instanceof Error ? error.message : '删除失败')
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * 切换展开/收起所有菜单
   */
  const toggleExpand = (): void => {
    isExpanded.value = !isExpanded.value
    nextTick(() => {
      if (tableRef.value?.elTableRef && filteredTableData.value) {
        const processRows = (rows: AppRouteRecord[]) => {
          rows.forEach((row) => {
            if (row.children?.length) {
              tableRef.value.elTableRef.toggleRowExpansion(row, isExpanded.value)
              processRows(row.children)
            }
          })
        }
        processRows(filteredTableData.value)
      }
    })
  }

  const syncSidebar = async () => {
    try {
      await refreshBackendMenus(router)
    } catch {
      ElMessage.warning('数据已保存，侧栏刷新失败，请刷新页面重新加载')
    }
  }

  const handleHierarchySubmit = async (data: HierarchyChange) => {
    if (saving.value) return
    saving.value = true
    try {
      await fetchUpdatePermissionHierarchy(data)
      hierarchyVisible.value = false
      ElMessage.success('菜单层级与排序已保存')
      await getMenuList()
      await syncSidebar()
    } catch (error) {
      ElMessage.error(
        error instanceof Error ? error.message : '保存失败，调整已保留，可重试或关闭后刷新'
      )
    } finally {
      saving.value = false
    }
  }
</script>
