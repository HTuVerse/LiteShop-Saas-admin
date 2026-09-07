<!-- 打印模板管理页面 -->
<!-- art-full-height 自动计算出页面剩余高度 -->
<!-- art-table-card 符合系统样式的表格卡片，自动撑满剩余高度 -->
<template>
  <div class="template-page art-full-height">
    <!-- 搜索栏 -->
    <TemplateSearch
      :model-value="searchForm"
      @update:model-value="(value) => Object.assign(searchForm, value)"
      @search="handleSearch"
      @reset="handleReset"
    />

    <ElCard class="art-table-card" shadow="never">
      <!-- 表格头部 -->
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElSpace wrap>
            <ElButton v-auth="'operations:templates:add'" @click="showDialog('add')" v-ripple
              >新增模板</ElButton
            >
          </ElSpace>
        </template>
      </ArtTableHeader>

      <!-- 表格 -->
      <ArtTable
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />

      <!-- 编辑模板弹窗 -->
      <TemplateEditDialog
        v-model:visible="dialogVisible"
        :dialog-type="dialogType"
        :template-data="currentTemplate"
        :initial-store-id="searchForm.storeId"
        @submit="handleDialogSubmit"
        @addSuccess="refreshCreate"
        @editSuccess="refreshUpdate"
      />
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { useTable } from '@/hooks/core/useTable'
  import { ElTag, ElMessageBox, ElMessage, ElTooltip } from 'element-plus'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import { DialogType } from '@/types'
  import {
    getTemplatePage,
    deleteTemplate,
    setDefaultTemplate,
    updateTemplateEnabled,
    copyTemplate
  } from '@/api/print-template'
  import TemplateSearch from './modules/template-search.vue'
  import TemplateEditDialog from './modules/TemplateEditDialog.vue'
  import { getEnumNumber, StatusTextMap } from '../utils/enumConverter'
  import type { Id } from '@/types/backend'

  defineOptions({ name: 'PrintTemplate' })

  // 搜索表单
  const searchForm = reactive({
    storeId: undefined as Id | undefined,
    enabled: undefined as number | undefined
  })

  // 弹窗相关
  const dialogType = ref<DialogType>('add')
  const dialogVisible = ref(false)
  const currentTemplate = ref<any>(null)

  // 状态配置（兼容数字和文字）
  const ENABLED_CONFIG = {
    0: { type: 'danger' as const, text: '禁用' },
    1: { type: 'success' as const, text: '正常' },
    禁用: { type: 'danger' as const, text: '禁用' },
    正常: { type: 'success' as const, text: '正常' }
  }

  const getEnabledConfig = (enabled: number | string) => {
    return (
      ENABLED_CONFIG[enabled as keyof typeof ENABLED_CONFIG] || {
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
    core: {
      apiFn: getTemplatePage,
      apiParams: {
        currentPage: 1,
        pageSize: 10,
        storeId: searchForm.storeId,
        enabled: searchForm.enabled
      },
      paginationKey: {
        current: 'currentPage',
        size: 'pageSize'
      },
      columnsFactory: () => [
        { type: 'index', width: 60, label: '序号' },
        { prop: 'templateName', label: '模板名称', width: 150 },
        { prop: 'paperWidth', label: '纸张宽度', width: 100 },
        {
          prop: 'isDefault',
          label: '默认模板',
          width: 100,
          formatter: (row: any) => {
            const isDefault = getEnumNumber(row.isDefault, { 是: 1, 否: 0 }) ?? row.isDefault
            return h(
              ElTag,
              { type: isDefault === 1 ? 'success' : 'info' },
              { default: () => (isDefault === 1 ? '是' : '否') }
            )
          }
        },
        {
          prop: 'enabled',
          label: '启用状态',
          width: 100,
          formatter: (row: any) => {
            const config = getEnabledConfig(row.enabled)
            return h(ElTag, { type: config.type }, { default: () => config.text })
          }
        },
        { prop: 'printCopies', label: '打印联数', width: 100 },
        { prop: 'remark', label: '备注', width: 150 },
        { prop: 'updatedAt', label: '更新时间', width: 160 },
        {
          prop: 'operation',
          label: '操作',
          width: 200,
          fixed: 'right',
          formatter: (row: any) => {
            const isDefault =
              (getEnumNumber(row.isDefault, { 是: 1, 否: 0 }) ?? row.isDefault) === 1
            const isEnabled = (getEnumNumber(row.enabled, StatusTextMap) ?? row.enabled) === 1
            return h('div', { class: 'flex flex-wrap gap-1' }, [
              h(
                ElTooltip,
                { content: '设为默认', placement: 'top' },
                {
                  default: () =>
                    h(ArtButtonTable, {
                      auth: 'operations:templates:default',
                      icon: 'ri:star-line',
                      iconColor: '#67c23a',
                      buttonBgColor: '#f0f9eb',
                      onClick: () => handleSetDefault(row)
                    })
                }
              ),
              h(
                ElTooltip,
                { content: isEnabled ? '禁用' : '启用', placement: 'top' },
                {
                  default: () =>
                    h(ArtButtonTable, {
                      auth: 'operations:templates:status',
                      icon: isEnabled ? 'ion:ban' : 'majesticons:unlock-open-line',
                      iconColor: isEnabled ? '#e6a23c' : '#67c23a',
                      buttonBgColor: isEnabled ? '#fdf6ec' : '#f0f9eb',
                      onClick: () => handleToggleEnabled(row)
                    })
                }
              ),
              h(
                ElTooltip,
                { content: '复制', placement: 'top' },
                {
                  default: () =>
                    h(ArtButtonTable, {
                      auth: 'operations:templates:add',
                      icon: 'ri:file-copy-line',
                      iconColor: '#909399',
                      buttonBgColor: '#f4f4f5',
                      onClick: () => handleCopy(row)
                    })
                }
              ),
              h(
                ElTooltip,
                { content: '编辑', placement: 'top' },
                {
                  default: () =>
                    h(ArtButtonTable, {
                      auth: 'operations:templates:edit',
                      type: 'edit',
                      onClick: () => showDialog('edit', row)
                    })
                }
              ),
              h(
                ElTooltip,
                { content: '删除', placement: 'top' },
                {
                  default: () =>
                    h(ArtButtonTable, {
                      auth: 'operations:templates:delete',
                      type: 'delete',
                      onClick: () => handleDelete(row)
                    })
                }
              )
            ])
          }
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
   * 重置搜索
   */
  const handleReset = () => {
    searchForm.storeId = undefined
    searchForm.enabled = undefined
    resetSearchParams()
  }

  /**
   * 搜索处理
   */
  const handleSearch = () => {
    const params: any = { currentPage: 1 }
    if (searchForm.storeId !== undefined && String(searchForm.storeId) !== '') {
      params.storeId = searchForm.storeId
    }
    if (searchForm.enabled !== undefined) {
      params.enabled = searchForm.enabled
    }
    getData(params)
  }

  /**
   * 显示编辑弹窗
   */
  const showDialog = (type: DialogType, row?: any): void => {
    dialogType.value = type
    currentTemplate.value = row ? { ...row } : null
    nextTick(() => {
      dialogVisible.value = true
    })
  }

  /**
   * 处理弹窗提交事件
   */
  const handleDialogSubmit = () => {
    dialogVisible.value = false
    currentTemplate.value = null
  }

  /**
   * 删除模板
   */
  const handleDelete = (row: any) => {
    const isDefault = getEnumNumber(row.isDefault, { 是: 1, 否: 0 }) ?? row.isDefault
    if (isDefault === 1) {
      ElMessage.warning('默认模板不能删除')
      return
    }
    ElMessageBox.confirm('确定要删除该模板吗？', '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(async () => {
        await deleteTemplate(row.id)
        ElMessage.success('删除成功')
        refreshRemove()
      })
      .catch(() => {
        ElMessage.info('已取消删除')
      })
  }

  /**
   * 设置默认模板
   */
  const handleSetDefault = async (row: any) => {
    const isDefault = (getEnumNumber(row.isDefault, { 是: 1, 否: 0 }) ?? row.isDefault) === 1
    if (isDefault) {
      ElMessage.warning('已是默认模板')
      return
    }
    try {
      await ElMessageBox.confirm('确定要设置为默认模板吗？', '操作确认', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      setDefaultTemplate(row.id)
        .then(() => {
          ElMessage.success('设置成功')
          refreshData()
        })
        .catch((e) => {
          ElMessage.error(e?.message || '设置失败')
        })
    } catch (error: any) {
      if (error !== 'cancel') {
        console.error('设置默认模板失败', error)
      }
    }
  }

  /**
   * 切换启用状态
   */
  const handleToggleEnabled = async (row: any) => {
    const currentEnabled = getEnumNumber(row.enabled, StatusTextMap) ?? row.enabled
    const enabled = currentEnabled === 1 ? 0 : 1
    const text = enabled === 1 ? '启用' : '禁用'
    try {
      await ElMessageBox.confirm(`确定要${text}该模板吗？`, '操作确认', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      await updateTemplateEnabled({ id: row.id, enabled })
      ElMessage.success(`${text}成功`)
      refreshUpdate()
    } catch (error: any) {
      if (error !== 'cancel') {
        console.error('切换状态失败', error)
      }
    }
  }

  /**
   * 复制模板
   */
  const handleCopy = async (row: any) => {
    try {
      const { value } = await ElMessageBox.prompt('请输入新模板名称', '复制模板', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPattern: /\S+/,
        inputErrorMessage: '模板名称不能为空'
      })
      await copyTemplate({ id: row.id, newTemplateName: value })
      ElMessage.success('复制成功')
      refreshCreate()
    } catch (error: any) {
      if (error !== 'cancel') {
        console.error('复制模板失败', error)
      }
    }
  }
</script>

<style scoped lang="scss">
  .template-page {
    display: flex;
    flex-direction: column;
  }
</style>
