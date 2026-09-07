<template>
  <div class="table-page art-full-height">
    <!-- 搜索栏 -->
    <TableSearch
      :model-value="searchForm"
      @update:model-value="(value) => Object.assign(searchForm, value)"
      @search="handleSearch"
      @reset="resetSearchParams"
    />

    <ElCard class="art-table-card" shadow="never">
      <!-- 表格头部 -->
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElSpace wrap>
            <ElButton
              v-auth="'restaurant:table:add'"
              @click="showDialog('add')"
              v-ripple
              type="primary"
              >新增餐桌</ElButton
            >
            <ElButton
              @click="batchExportQrcodes"
              v-ripple
              :loading="batchExportLoading"
              type="success"
            >
              批量导出二维码 ZIP
            </ElButton>
            <ElButton
              v-auth="['restaurant:table:clear', 'operations:table-cashier:clear']"
              @click="batchClearSessions"
              v-ripple
              type="warning"
              :disabled="selectedRows.length === 0"
            >
              批量清空会话 ({{ selectedRows.length }})
            </ElButton>
            <ElButton
              v-auth="['restaurant:table:clear', 'operations:table-cashier:clear']"
              @click="clearAllSessions"
              v-ripple
              type="danger"
            >
              一键清空所有会话
            </ElButton>
          </ElSpace>
        </template>
      </ArtTableHeader>

      <!-- 表格 -->
      <ArtTable
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        @selection-change="handleSelectionChange"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />

      <!-- 餐桌弹窗 -->
      <TableDialog
        v-model:visible="dialogVisible"
        :type="dialogType"
        :table-data="currentTableData"
        @submit="handleDialogSubmit"
        @addSuccess="refreshCreate"
        @editSuccess="refreshUpdate"
      />

      <!-- 二维码弹窗 -->
      <TableQrcodeDialog
        v-model:visible="qrcodeDialogVisible"
        :table-data="currentQrcodeTableData"
      />
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage, ElMessageBox, ElTag, ElButton } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import {
    fetchGetTableList,
    fetchUpdateTableStatus,
    fetchDeleteTable,
    fetchClearAllSessions,
    fetchClearSessionsByTables
  } from '@/api/dish-manage'
  import { fetchGetDeployConfig } from '@/api/config-manage'
  import TableSearch from './modules/table-search.vue'
  import TableDialog from './modules/table-dialog.vue'
  import TableQrcodeDialog from './modules/table-qrcode-dialog.vue'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import { generateTableQrcodeDataUrl } from './utils/tableQrcodeImage'
  import JSZip from '@/utils/export/zip'
  import { saveAs } from 'file-saver'

  defineOptions({ name: 'TableManage' })

  type TableListItem = Api.Table.TableListItem

  // 弹窗相关
  const dialogType = ref<'add' | 'edit'>('add')
  const dialogVisible = ref(false)
  const currentTableData = ref<Partial<TableListItem>>({})

  // 二维码弹窗相关
  const qrcodeDialogVisible = ref(false)
  const currentQrcodeTableData = ref<Partial<TableListItem>>({})

  // 选中行
  const selectedRows = ref<TableListItem[]>([])

  // 批量导出二维码
  const batchExportLoading = ref(false)

  // 搜索表单
  const searchForm = reactive<Api.Table.TableSearchParams>({
    storeId: null,
    tableNumber: '',
    tableName: '',
    status: null
  })

  // 餐桌状态配置
  const TABLE_STATUS_CONFIG = {
    空闲: { type: 'success' as const, text: '空闲' },
    使用中: { type: 'primary' as const, text: '使用中' },
    预留: { type: 'warning' as const, text: '预留' },
    停用: { type: 'danger' as const, text: '停用' }
  } as const

  /**
   * 获取餐桌状态配置
   */
  const getTableStatusConfig = (status: Api.Table.TableStatus) => {
    return (
      TABLE_STATUS_CONFIG[status] || {
        type: 'info' as const,
        text: '未知'
      }
    )
  }

  const {
    columns,
    columnChecks,
    data,
    loading,
    pagination,
    getData,
    resetSearchParams,
    handleSizeChange,
    handleCurrentChange,
    refreshData,
    refreshCreate,
    refreshRemove,
    refreshUpdate
  } = useTable({
    // 核心配置
    core: {
      apiFn: fetchGetTableList,
      apiParams: {
        currentPage: 1,
        pageSize: 10,
        storeId: searchForm.storeId,
        tableNumber: searchForm.tableNumber,
        tableName: searchForm.tableName,
        status: searchForm.status
      },
      paginationKey: {
        current: 'currentPage',
        size: 'pageSize'
      },
      columnsFactory: () => [
        { type: 'selection', width: 55 },
        { type: 'index', width: 60, label: '序号' },
        {
          prop: 'tableNumber',
          label: '餐桌编号',
          width: 120
        },
        {
          prop: 'tableName',
          label: '餐桌名称',
          width: 150
        },
        {
          prop: 'storeName',
          label: '所属门店',
          width: 180
        },
        {
          prop: 'seats',
          label: '座位数',
          width: 100,
          formatter: (row: TableListItem) => {
            return h('span', {}, `${row.seats}人`)
          }
        },
        {
          prop: 'location',
          label: '位置描述',
          minWidth: 150,
          formatter: (row: TableListItem) => {
            return h('span', {}, row.location || '-')
          }
        },
        {
          prop: 'status',
          label: '状态',
          width: 100,
          formatter: (row: TableListItem) => {
            const statusConfig = getTableStatusConfig(row.status)
            return h(ElTag, { type: statusConfig.type }, { default: () => statusConfig.text })
          }
        },
        {
          prop: 'createdAt',
          label: '创建时间',
          width: 180,
          sortable: true
        },
        {
          prop: 'operation',
          label: '操作',
          width: 120,
          fixed: 'right',
          formatter: (row: TableListItem) =>
            h('div', { style: 'display: flex; gap: 5px; flex-wrap: wrap; align-items: center;' }, [
              h(ArtButtonTable, {
                type: 'view',
                text: '二维码',
                onClick: () => showQrcodeDialog(row)
              }),
              h(ArtButtonTable, {
                auth: 'restaurant:table:edit',
                type: 'edit',
                onClick: () => showDialog('edit', row)
              }),
              // 清空会话按钮，非"使用中"状态时禁用
              h(ArtButtonTable, {
                auth: ['restaurant:table:clear', 'operations:table-cashier:clear'],
                icon: 'ri:refresh-line',
                iconColor: '#E6A23C',
                buttonBgColor: 'rgba(230, 162, 60, 0.12)',
                disabled: row.status !== '使用中',
                class: row.status !== '使用中' ? 'opacity-40 cursor-not-allowed' : '',
                title: row.status !== '使用中' ? '当前餐桌无进行中的会话' : '清空会话',
                onClick: () => {
                  if (row.status === '使用中') {
                    clearSingleSession(row)
                  }
                }
              }),
              h(ArtButtonTable, {
                auth: 'restaurant:table:delete',
                type: 'delete',
                onClick: () => deleteTable(row)
              })
            ])
        }
      ]
    },
    hooks: {
      onError: (error) => {
        ElMessage.error(error.message || '数据加载失败')
      }
    },
    performance: {
      debounceTime: 300
    }
  })

  /**
   * 搜索处理
   */
  const handleSearch = () => {
    getData(searchForm)
  }

  /**
   * 显示餐桌弹窗
   */
  const showDialog = (type: 'add' | 'edit', row?: TableListItem): void => {
    dialogType.value = type
    currentTableData.value = row || {}
    nextTick(() => {
      dialogVisible.value = true
    })
  }

  /**
   * 显示二维码弹窗
   */
  const showQrcodeDialog = (row: TableListItem): void => {
    currentQrcodeTableData.value = row
    nextTick(() => {
      qrcodeDialogVisible.value = true
    })
  }

  /**
   * 删除餐桌
   */
  const deleteTable = (row: TableListItem): void => {
    ElMessageBox.confirm(`确定要删除餐桌【${row.tableName}】吗？`, '删除餐桌', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'error'
    })
      .then(async () => {
        try {
          await fetchDeleteTable(row.id)
          ElMessage.success('删除成功')
          refreshRemove()
        } catch (error: any) {
          ElMessage.error(error.message || '删除失败')
        }
      })
      .catch(() => {
        ElMessage.info('已取消删除')
      })
  }

  /**
   * 切换餐桌状态
   */
  const toggleTableStatus = (row: TableListItem): void => {
    const targetStatus = row.status === '停用' ? 0 : 3
    const statusText = targetStatus === 0 ? '启用' : '停用'

    ElMessageBox.confirm(`确定要${statusText}餐桌【${row.tableName}】吗？`, `${statusText}餐桌`, {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(async () => {
        try {
          await fetchUpdateTableStatus(row.id, targetStatus)
          ElMessage.success(`${statusText}成功`)
          refreshUpdate()
        } catch (error: any) {
          ElMessage.error(error.message || `${statusText}失败`)
        }
      })
      .catch(() => {
        ElMessage.info(`已取消${statusText}`)
      })
  }

  /**
   * 处理弹窗提交事件
   */
  const handleDialogSubmit = () => {
    dialogVisible.value = false
    currentTableData.value = {}
  }

  /**
   * 处理表格行选择变化
   */
  const handleSelectionChange = (selection: TableListItem[]): void => {
    selectedRows.value = selection
  }

  /**
   * 清空单个餐桌的会话
   */
  const clearSingleSession = (row: TableListItem): void => {
    ElMessageBox.confirm(
      `确定要清空餐桌【${row.tableName}】的会话吗？这将结束当前进行中的会话并恢复餐桌状态为空闲。`,
      '清空会话',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
      .then(async () => {
        try {
          const res = await fetchClearSessionsByTables([row.id])
          ElMessage.success(`清空成功，共清除 ${res.clearedSessionCount} 个会话`)
          refreshData()
        } catch (error: any) {
          ElMessage.error(error.message || '清空会话失败')
        }
      })
      .catch(() => {
        ElMessage.info('已取消操作')
      })
  }

  /**
   * 批量清空选中餐桌的会话
   */
  const batchClearSessions = (): void => {
    if (selectedRows.value.length === 0) {
      ElMessage.warning('请先选择要清空会话的餐桌')
      return
    }

    // 筛选出使用中的餐桌
    const inUseRows = selectedRows.value.filter((row) => row.status === '使用中')
    if (inUseRows.length === 0) {
      ElMessage.warning('选中的餐桌中没有使用中的餐桌')
      return
    }

    const tableNames = inUseRows.map((row) => row.tableName).join('、')
    ElMessageBox.confirm(
      `确定要清空以下餐桌的会话吗？\n【${tableNames}】\n这将结束这些餐桌当前进行中的会话并恢复状态为空闲。`,
      '批量清空会话',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
      .then(async () => {
        try {
          const tableIds = inUseRows.map((row) => row.id)
          const res = await fetchClearSessionsByTables(tableIds)
          ElMessage.success(`批量清空成功，共清除 ${res.clearedSessionCount} 个会话`)
          refreshData()
        } catch (error: any) {
          ElMessage.error(error.message || '批量清空会话失败')
        }
      })
      .catch(() => {
        ElMessage.info('已取消操作')
      })
  }

  /**
   * 一键清空所有会话
   */
  const clearAllSessions = (): void => {
    ElMessageBox.confirm(
      '确定要清空所有餐桌的会话吗？\n这将结束所有进行中的会话并恢复所有餐桌状态为空闲。\n此操作通常用于每日打烊或系统重置。',
      '一键清空所有会话',
      {
        confirmButtonText: '确定清空',
        cancelButtonText: '取消',
        type: 'error',
        confirmButtonClass: 'el-button--danger'
      }
    )
      .then(async () => {
        try {
          // 如果搜索条件中有门店ID，则只清空该门店
          const storeId = searchForm.storeId || undefined
          const res = await fetchClearAllSessions(storeId)
          const message = storeId
            ? `当前门店会话清空成功，共清除 ${res.clearedSessionCount} 个会话`
            : `所有会话清空成功，共清除 ${res.clearedSessionCount} 个会话`
          ElMessage.success(message)
          refreshData()
        } catch (error: any) {
          ElMessage.error(error.message || '清空会话失败')
        }
      })
      .catch(() => {
        ElMessage.info('已取消操作')
      })
  }

  /**
   * 批量导出所有餐桌二维码为 ZIP
   * 使用当前搜索条件获取餐桌列表，按部署配置生成二维码并打包下载
   */
  const batchExportQrcodes = async (): Promise<void> => {
    try {
      batchExportLoading.value = true
      const [deployConfig, listRes] = await Promise.all([
        fetchGetDeployConfig(),
        fetchGetTableList({
          ...searchForm,
          currentPage: 1,
          pageSize: 9999
        })
      ])
      const tables = (listRes as Api.Table.TableListData)?.records ?? []
      if (tables.length === 0) {
        ElMessage.warning('当前没有可导出的餐桌')
        return
      }
      const platformType = deployConfig.qrcodeDefaultPlatform || 'h5'
      const zip = new JSZip()
      let successCount = 0
      for (const table of tables) {
        try {
          const dataUrl = await generateTableQrcodeDataUrl(table, deployConfig, platformType)
          const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '')
          const fileName = `餐桌二维码_${table.tableNumber || table.id}.png`
          zip.file(fileName, base64, { base64: true })
          successCount++
        } catch (e) {
          console.warn(`餐桌 ${table.tableName} 二维码生成跳过:`, e)
        }
      }
      if (successCount === 0) {
        ElMessage.error('没有成功生成任何二维码，请检查部署配置（H5/小程序域名等）')
        return
      }
      const blob = await zip.generateAsync({ type: 'blob' })
      saveAs(blob, `餐桌二维码批量导出_${Date.now()}.zip`)
      ElMessage.success(
        `已导出 ${successCount} 张二维码${
          successCount < tables.length ? `，${tables.length - successCount} 张跳过` : ''
        }`
      )
    } catch (error: any) {
      console.error('批量导出二维码失败:', error)
      ElMessage.error(error?.message || '批量导出失败，请重试')
    } finally {
      batchExportLoading.value = false
    }
  }
</script>

<style lang="scss" scoped>
  .table-page {
    :deep(.el-card) {
      border-radius: 8px;
    }
  }
</style>
