<!-- 菜品分类管理页面 -->
<template>
  <div class="dish-category-page art-full-height">
    <!-- 搜索栏 -->
    <CategorySearch
      :model-value="searchForm"
      @update:model-value="(value) => Object.assign(searchForm, value)"
      @search="handleSearch"
      @reset="resetSearchParamsHandler"
    />

    <ElCard class="art-table-card" shadow="never">
      <!-- 表格头部 -->
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElSpace wrap>
            <ElButton
              v-auth="'restaurant:category:add'"
              v-ripple
              type="success"
              @click="showDialog('add')"
              >新增分类</ElButton
            >
          </ElSpace>
        </template>
      </ArtTableHeader>

      <!-- 表格 -->
      <ArtTable
        rowKey="id"
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />

      <!-- 分类弹窗 -->
      <CategoryDialog
        v-model:visible="dialogVisible"
        :type="dialogType"
        :category-data="currentCategoryData"
        :category-list="categoryListForDialog"
        :category-total="categoryTotal"
        :loading-more="loadingMoreCategories"
        @load-more="loadMoreCategories"
        @submit="handleDialogSubmit"
        @add-success="refreshCreate"
        @edit-success="refreshUpdate"
      />
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ElButton, ElCard, ElMessage, ElMessageBox, ElSpace, ElTag } from 'element-plus'
  import { reactive, ref, h, nextTick } from 'vue'
  import CategorySearch from './modules/category-search.vue'
  import CategoryDialog from './modules/category-dialog.vue'
  import { fetchGetCategoryPage, fetchDeleteCategory } from '@/api/dish-manage'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import { useTable } from '@/hooks/core/useTable'
  import { BooleanEnumMap, getEnumNumber } from '@utils/enum'

  defineOptions({ name: 'DishCategory' })

  type CategoryListItem = Api.Category.CategoryListItem
  type DialogType = 'add' | 'edit'

  // 弹窗相关
  const dialogType = ref<DialogType>('add')
  const dialogVisible = ref(false)
  const currentCategoryData = ref<Partial<CategoryListItem>>({})

  // 搜索表单
  const searchForm = reactive<Api.Category.CategorySearchParams>({
    categoryName: '',
    storeId: undefined,
    isShow: undefined,
    parentId: undefined,
    level: undefined
  })

  // 弹窗用分类列表（分页 50 条，超过懒加载）
  const categoryListForDialog = ref<CategoryListItem[]>([])
  const categoryTotal = ref(0)
  const categoryPage = ref(1)
  const loadingMoreCategories = ref(false)

  const {
    data,
    columns,
    columnChecks,
    loading,
    getData,
    pagination,
    refreshData,
    refreshCreate,
    refreshUpdate,
    refreshRemove,
    handleSizeChange,
    handleCurrentChange
  } = useTable({
    core: {
      apiFn: fetchGetCategoryPage,
      apiParams: {
        currentPage: 1,
        pageSize: 10,
        searchKey: searchForm.categoryName,
        isShow: searchForm.isShow,
        level: searchForm.level
      },
      paginationKey: {
        current: 'currentPage',
        size: 'pageSize'
      },
      columnsFactory: () => [
        { type: 'index', width: 60, label: '序号' },
        {
          prop: 'id',
          label: 'ID',
          width: 80,
          sortable: true
        },
        {
          prop: 'categoryName',
          label: '分类名称',
          minWidth: 150,
          align: 'left'
        },
        {
          prop: 'categoryDesc',
          label: '分类描述',
          minWidth: 200
        },
        {
          prop: 'categoryIcon',
          label: '分类图标',
          width: 100,
          align: 'center',
          formatter: (row: CategoryListItem) => (row.categoryIcon ? row.categoryIcon : '-')
        },
        {
          prop: 'sortOrder',
          label: '排序',
          width: 80,
          align: 'center'
        },
        {
          prop: 'level',
          label: '层级',
          width: 80,
          align: 'center',
          formatter: (row: CategoryListItem) => {
            const levelMap: Record<number, string> = { 1: '一级', 2: '二级' }
            return levelMap[row.level || 1] || '-'
          }
        },
        {
          prop: 'isShow',
          label: '显示状态',
          width: 100,
          align: 'center',
          formatter: (row: CategoryListItem) => {
            const isShowNum = getEnumNumber(row.isShow, BooleanEnumMap)
            const type = isShowNum === 1 ? 'success' : 'info'
            return h(ElTag, { type }, { default: () => (isShowNum === 1 ? '显示' : '隐藏') })
          }
        },
        {
          prop: 'createdAt',
          label: '创建时间',
          width: 180,
          formatter: (row: CategoryListItem) =>
            row.createdAt ? row.createdAt.substring(0, 19).replace('T', ' ') : ''
        },
        {
          prop: 'updatedAt',
          label: '更新时间',
          width: 180,
          formatter: (row: CategoryListItem) =>
            row.updatedAt ? row.updatedAt.substring(0, 19).replace('T', ' ') : ''
        },
        {
          prop: 'operation',
          label: '操作',
          width: 150,
          fixed: 'right',
          formatter: (row: CategoryListItem) =>
            h('div', [
              h(ArtButtonTable, {
                auth: 'restaurant:category:edit',
                type: 'edit',
                onClick: () => showDialog('edit', row)
              }),
              h(ArtButtonTable, {
                auth: 'restaurant:category:delete',
                type: 'delete',
                onClick: () => deleteCategory(row)
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
    getData({
      searchKey: searchForm.categoryName || undefined,
      isShow: searchForm.isShow,
      level: searchForm.level
    })
  }

  /**
   * 重置搜索（清空表单并回到第一页拉取）
   */
  const resetSearchParamsHandler = () => {
    searchForm.categoryName = ''
    searchForm.storeId = undefined
    searchForm.isShow = undefined
    searchForm.parentId = undefined
    searchForm.level = undefined
    getData()
  }

  /**
   * 显示分类弹窗
   */
  const showDialog = (type: DialogType, row?: CategoryListItem): void => {
    dialogType.value = type
    currentCategoryData.value = row
      ? { ...row, isShow: getEnumNumber(row.isShow, BooleanEnumMap) }
      : {}
    fetchGetCategoryPage({ currentPage: 1, pageSize: 50 })
      .then((res) => {
        categoryListForDialog.value = res?.records || []
        categoryTotal.value = res?.total ?? 0
        categoryPage.value = 1
      })
      .catch(() => {
        categoryListForDialog.value = []
        categoryTotal.value = 0
        categoryPage.value = 1
      })
    nextTick(() => {
      dialogVisible.value = true
    })
  }

  /**
   * 加载更多分类（弹窗内父级下拉懒加载）
   */
  const loadMoreCategories = async () => {
    if (loadingMoreCategories.value) return
    loadingMoreCategories.value = true
    fetchGetCategoryPage({ currentPage: categoryPage.value + 1, pageSize: 50 })
      .then((res) => {
        categoryListForDialog.value = categoryListForDialog.value.concat(res?.records || [])
        categoryPage.value += 1
      })
      .finally(() => {
        loadingMoreCategories.value = false
      })
  }

  /**
   * 弹窗提交后关闭并刷新
   */
  const handleDialogSubmit = () => {
    dialogVisible.value = false
    currentCategoryData.value = {}
  }

  /**
   * 删除分类
   */
  const deleteCategory = (row: CategoryListItem): void => {
    ElMessageBox.confirm('确定要删除该分类吗？删除前请确保该分类下没有菜品', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(async () => {
        await fetchDeleteCategory(row.id)
        ElMessage.success('删除成功')
        refreshRemove()
      })
      .catch((err) => {
        if (err !== 'cancel') ElMessage.error(err?.message || '删除失败')
        else ElMessage.info('已取消删除')
      })
  }
</script>

<style lang="scss" scoped></style>
