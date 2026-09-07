<!-- 轮播图管理页面 -->
<template>
  <div class="banner-page art-full-height">
    <!-- 搜索栏 -->
    <BannerSearch
      :model-value="searchForm"
      @update:model-value="(value) => Object.assign(searchForm, value)"
      @search="handleSearch"
      @reset="resetSearch"
    />

    <ElCard class="art-table-card" shadow="never">
      <!-- 表格头部 -->
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="fetchData">
        <template #left>
          <ElSpace wrap>
            <ElButton
              v-auth="'config:banner:add'"
              type="primary"
              @click="showDialog('add')"
              v-ripple
            >
              <i class="i-ep:plus mr-1"></i>
              新增轮播图
            </ElButton>
            <ElButton
              v-auth="'config:banner:delete'"
              type="danger"
              :disabled="selectedRows.length === 0"
              @click="batchDelete"
              v-ripple
            >
              <i class="i-ep:delete mr-1"></i>
              批量删除
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

      <!-- 轮播图弹窗 -->
      <BannerDialog
        v-model:visible="dialogVisible"
        :type="dialogType"
        :banner-data="currentBannerData"
        @submit="handleDialogSubmit"
        @addSuccess="fetchData"
        @editSuccess="fetchData"
      />
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { useAuth } from '@/hooks/core/useAuth'
  const { hasAuth } = useAuth()
  import { ElMessage, ElMessageBox, ElTag, ElImage, ElSwitch, ElInputNumber } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import {
    fetchGetBannerList,
    fetchDeleteBanner,
    fetchUpdateBannerStatus,
    fetchUpdateBannerSort,
    fetchBatchDeleteBanner
  } from '@/api/config-manage'
  import BannerSearch from './modules/banner-search.vue'
  import BannerDialog from './modules/banner-dialog.vue'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'

  defineOptions({ name: 'BannerManage' })

  type Banner = Api.Config.Banner

  // 弹窗相关
  const dialogType = ref<'add' | 'edit'>('add')
  const dialogVisible = ref(false)
  const currentBannerData = ref<Partial<Banner>>({})

  // 选中行
  const selectedRows = ref<Banner[]>([])

  // 搜索表单
  const searchForm = reactive<Api.Config.BannerSearchParams>({
    position: undefined,
    status: undefined
  })

  // 轮播图位置配置
  const POSITION_CONFIG = {
    首页轮播图: { type: 'primary' as const, text: '首页' },
    点餐页轮播图: { type: 'success' as const, text: '点餐页' },
    个人中心轮播图: { type: 'warning' as const, text: '个人中心' },
    活动页轮播图: { type: 'danger' as const, text: '活动页' }
  } as const

  // 跳转类型配置
  const LINK_TYPE_CONFIG = {
    1: { text: '小程序页面', type: 'primary' as const },
    2: { text: 'H5链接', type: 'warning' as const },
    3: { text: '不跳转', type: 'info' as const }
  } as const

  /**
   * 获取位置配置
   */
  const getPositionConfig = (position?: Api.Config.BannerPositionDesc) => {
    if (!position) return { type: 'info' as const, text: '未知' }
    return POSITION_CONFIG[position] || { type: 'info' as const, text: '未知' }
  }

  /**
   * 获取跳转类型配置
   */
  const getLinkTypeConfig = (linkType?: Api.Config.LinkType) => {
    if (!linkType) return { type: 'info' as const, text: '-' }
    return LINK_TYPE_CONFIG[linkType] || { type: 'info' as const, text: '-' }
  }

  const {
    columns,
    columnChecks,
    data,
    loading,
    pagination,
    getData,
    handleSizeChange,
    handleCurrentChange
  } = useTable({
    core: {
      apiFn: async (params: any) => {
        const res = await fetchGetBannerList(params)
        // 返回符合 useTable 期望的格式
        return {
          records: res || [],
          current: 1,
          size: 100,
          total: res?.length || 0
        }
      },
      apiParams: {
        currentPage: 1,
        pageSize: 100,
        position: searchForm.position,
        status: searchForm.status
      },
      paginationKey: {
        current: 'currentPage',
        size: 'pageSize'
      },
      columnsFactory: () => [
        { type: 'selection', width: 50 },
        { type: 'index', width: 60, label: '序号' },
        {
          prop: 'imageUrl',
          label: '轮播图',
          width: 140,
          formatter: (row: Banner) => {
            return h(
              ElImage,
              {
                class: 'w-28 h-16 rounded',
                src: row.imageUrl,
                fit: 'cover',
                previewSrcList: [row.imageUrl],
                previewTeleported: true
              },
              {
                error: () =>
                  h(
                    'div',
                    {
                      class: 'w-28 h-16 rounded flex items-center justify-center bg-gray-100',
                      style: 'color: #909399;'
                    },
                    [h('i', { class: 'i-ep:picture text-2xl' })]
                  )
              }
            )
          }
        },
        {
          prop: 'title',
          label: '标题',
          width: 150,
          formatter: (row: Banner) => row.title || '-'
        },
        {
          prop: 'position',
          label: '位置',
          width: 110,
          formatter: (row: Banner) => {
            const config = getPositionConfig(row.position)
            return h(ElTag, { type: config.type, size: 'small' }, { default: () => config.text })
          }
        },
        {
          prop: 'linkType',
          label: '跳转类型',
          width: 110,
          formatter: (row: Banner) => {
            const config = getLinkTypeConfig(row.linkType)
            return h(ElTag, { type: config.type, size: 'small' }, { default: () => config.text })
          }
        },
        {
          prop: 'linkUrl',
          label: '跳转链接',
          minWidth: 200,
          formatter: (row: Banner) => row.linkUrl || '-'
        },
        {
          prop: 'sortOrder',
          label: '排序',
          width: 120,
          formatter: (row: Banner) => {
            return h(ElInputNumber, {
              disabled: !hasAuth('config:banner:edit'),
              modelValue: row.sortOrder,
              size: 'small',
              min: 0,
              max: 999,
              controls: false,
              style: 'width: 80px',
              onChange: (val: number | undefined) => handleSortChange(row, val ?? 0)
            })
          }
        },
        {
          prop: 'status',
          label: '状态',
          width: 90,
          formatter: (row: Banner) => {
            return h(ElSwitch, {
              disabled: !hasAuth('config:banner:status'),
              modelValue: row.status === '是',
              activeText: '',
              inactiveText: '',
              onChange: (val: string | number | boolean) => handleStatusChange(row, Boolean(val))
            })
          }
        },
        {
          prop: 'createdAt',
          label: '创建时间',
          width: 170
        },
        {
          prop: 'operation',
          label: '操作',
          width: 120,
          fixed: 'right',
          formatter: (row: Banner) =>
            h('div', { style: 'display: flex; gap: 5px;' }, [
              h(ArtButtonTable, {
                auth: 'config:banner:edit',
                type: 'edit',
                onClick: () => showDialog('edit', row)
              }),
              h(ArtButtonTable, {
                auth: 'config:banner:delete',
                type: 'delete',
                onClick: () => deleteBanner(row)
              })
            ])
        }
      ]
    },
    hooks: {
      onError: (error) => {
        ElMessage.error(error.message || '数据加载失败')
      }
    }
  })

  /**
   * 获取数据
   */
  const fetchData = () => {
    getData(searchForm)
  }

  /**
   * 搜索处理
   */
  const handleSearch = () => {
    fetchData()
  }

  /**
   * 重置搜索
   */
  const resetSearch = () => {
    searchForm.position = undefined
    searchForm.status = undefined
    fetchData()
  }

  /**
   * 显示弹窗
   */
  const showDialog = (type: 'add' | 'edit', row?: Banner): void => {
    dialogType.value = type
    currentBannerData.value = row || {}
    nextTick(() => {
      dialogVisible.value = true
    })
  }

  /**
   * 删除轮播图
   */
  const deleteBanner = (row: Banner): void => {
    ElMessageBox.confirm(`确定要删除该轮播图吗？`, '删除轮播图', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(async () => {
        try {
          await fetchDeleteBanner(row.id)
          ElMessage.success('删除成功')
          fetchData()
        } catch (error: any) {
          ElMessage.error(error.message || '删除失败')
        }
      })
      .catch(() => {
        ElMessage.info('已取消删除')
      })
  }

  /**
   * 批量删除
   */
  const batchDelete = (): void => {
    if (selectedRows.value.length === 0) {
      ElMessage.warning('请先选择要删除的轮播图')
      return
    }
    ElMessageBox.confirm(`确定要删除选中的 ${selectedRows.value.length} 条轮播图吗？`, '批量删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(async () => {
        try {
          const ids = selectedRows.value.map((item) => item.id)
          await fetchBatchDeleteBanner(ids)
          ElMessage.success('批量删除成功')
          selectedRows.value = []
          fetchData()
        } catch (error: any) {
          ElMessage.error(error.message || '批量删除失败')
        }
      })
      .catch(() => {
        ElMessage.info('已取消删除')
      })
  }

  /**
   * 状态变更
   */
  const handleStatusChange = async (row: Banner, val: boolean): Promise<void> => {
    try {
      await fetchUpdateBannerStatus(row.id, val ? 1 : 0)
      ElMessage.success('状态更新成功')
      fetchData()
    } catch (error: any) {
      ElMessage.error(error.message || '状态更新失败')
    }
  }

  /**
   * 排序变更
   */
  const handleSortChange = async (row: Banner, val: number): Promise<void> => {
    try {
      await fetchUpdateBannerSort(row.id, val)
      ElMessage.success('排序更新成功')
      fetchData()
    } catch (error: any) {
      ElMessage.error(error.message || '排序更新失败')
    }
  }

  /**
   * 弹窗提交
   */
  const handleDialogSubmit = () => {
    dialogVisible.value = false
    currentBannerData.value = {}
  }

  /**
   * 选择变化
   */
  const handleSelectionChange = (selection: Banner[]): void => {
    selectedRows.value = selection
  }
</script>

<style lang="scss" scoped>
  .banner-page {
    :deep(.el-card) {
      border-radius: 8px;
    }
  }
</style>
