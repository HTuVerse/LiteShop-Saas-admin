<template>
  <div class="art-full-height">
    <div class="tree-container">
      <div class="left-sidebar">
        <template v-if="selectedDish">
          <ElCard class="art-table-card" shadow="never" style="margin-top: 0">
            <DishCard
              @delete-spec="handleDeleteSpec"
              @edit-spec="handleEditSpecValue"
              :dish-data="selectedDish"
            />
          </ElCard>
        </template>
        <template v-else>
          <ElCard class="art-table-card" shadow="never" style="margin-top: 0">
            <div class="empty-dish-card">
              <el-icon :size="48"><Select /></el-icon>
              <p>请从右侧表格中选择一个菜品查看详情</p>
            </div>
          </ElCard>
        </template>
      </div>

      <div class="right-content art-full-height">
        <DishSearch
          @search="handleSearch"
          @reset="resetSearchParam"
          :model-value="searchForm"
          @update:model-value="(value) => Object.assign(searchForm, value)"
        />

        <ElCard class="art-table-card" shadow="never">
          <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
            <template #left>
              <ElSpace wrap>
                <ElButton @click="showButtons = !showButtons" v-ripple type="primary" plain
                  >{{ showButtons ? '收起' : '展开' }}按钮组</ElButton
                >
                <ElButton
                  v-auth="'restaurant:dish:add'"
                  v-show="showButtons"
                  v-ripple
                  type="success"
                  @click="showDialog('add')"
                  >添加菜品</ElButton
                >
                <ElButton
                  v-auth="'restaurant:dish:delete'"
                  v-show="showButtons"
                  v-ripple
                  type="danger"
                  @click="batchDelete"
                  >批量删除</ElButton
                >
              </ElSpace>
            </template>
          </ArtTableHeader>

          <ArtTable
            rowKey="id"
            :loading="loading"
            :data="data"
            :columns="columns"
            :pagination="pagination"
            @pagination:size-change="handleSizeChange"
            @pagination:current-change="handleCurrentChange"
            @selection-change="handleSelectionChange"
            @row-click="handleRowClick"
          />
        </ElCard>
      </div>
    </div>

    <!-- 菜品弹窗 -->
    <DishDialog
      v-model:visible="dialogVisible"
      :type="dialogType"
      :dish-data="currentDishData"
      @submit="handleDialogSubmit"
      @addSuccess="refreshData"
      @editSuccess="refreshData"
    />

    <!-- 菜品规格弹窗 -->
    <DishSpecDialog
      v-model:visible="specDialogVisible"
      :type="specDialogType"
      :dish-id="currentSpecDishId"
      :spec-data="currentSpecData"
      @addSuccess="refreshDishDetail"
      @editSuccess="refreshDishDetail"
    />
  </div>
</template>

<script setup lang="ts">
  import { useTable } from '@/hooks/core/useTable'
  import { ElButton, ElCard, ElMessage, ElMessageBox, ElSpace } from 'element-plus'
  import { ref } from 'vue'
  import DishSearch from './modules/dish-search.vue'
  import DishSpecDialog from './modules/dish-spec-dialog.vue'
  import request from '@utils/http'
  import DishDialog from './modules/dish-dialog.vue'
  import DishCard from './modules/dish-card.vue'
  import { Select } from '@element-plus/icons-vue'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'

  defineOptions({ name: 'DishManage' })

  const showButtons = ref(false)
  const selectedRows = ref<any[]>([])

  // 选中的菜品
  const selectedDish = ref<any>(null)

  // 搜索表单
  const searchForm = reactive({
    dishName: '',
    categoryId: '',
    storeId: '',
    isRecommend: '',
    isHot: '',
    isNew: '',
    saleStatus: '',
    sceneType: ''
  })

  // 菜品弹窗相关
  const dialogType = ref<string>('add')
  const dialogVisible = ref(false)
  const currentDishData = ref<any>({})

  // 规格弹窗相关
  const specDialogType = ref<string>('addSpec')
  const specDialogVisible = ref(false)
  const currentSpecData = ref<any>(null)
  const currentSpecDishId = ref<number | undefined>(undefined)

  const fetchDishList = (params: any) => {
    return request.get({
      url: '/dish/pageList',
      data: null,
      params: params
    })
  }

  const {
    data,
    columns,
    columnChecks,
    loading,
    getData,
    pagination,
    refreshData,
    resetSearchParams,
    handleSizeChange,
    handleCurrentChange
  } = useTable({
    core: {
      apiFn: fetchDishList,
      apiParams: {
        currentPage: 1,
        pageSize: 10,
        dishName: searchForm.dishName,
        categoryId: searchForm.categoryId,
        storeId: searchForm.storeId,
        isRecommend: searchForm.isRecommend,
        isHot: searchForm.isHot,
        isNew: searchForm.isNew,
        saleStatus: searchForm.saleStatus,
        sceneType: searchForm.sceneType
      },
      paginationKey: {
        current: 'currentPage',
        size: 'pageSize'
      },
      columnsFactory: () => [
        {
          type: 'selection',
          width: 55,
          align: 'center'
        },
        {
          prop: 'id',
          label: 'ID',
          width: 80,
          sortable: true
        },
        {
          prop: 'dishName',
          label: '菜品名称',
          minWidth: 120,
          align: 'center'
        },
        {
          prop: 'dishDesc',
          label: '描述',
          minWidth: 150
        },
        {
          prop: 'categoryName',
          label: '分类',
          align: 'center',
          width: 100
        },
        {
          prop: 'price',
          label: '活动价格',
          align: 'center',
          width: 80,
          formatter: (row: any) => (row.price ? `¥${row.price}` : '-')
        },
        {
          prop: 'originalPrice',
          label: '原价',
          align: 'center',
          width: 80,
          formatter: (row: any) => `¥${row.originalPrice}`
        },
        {
          prop: 'costPrice',
          label: '成本',
          align: 'center',
          width: 80,
          formatter: (row: any) => `¥${row.costPrice}`
        },
        {
          prop: 'unit',
          label: '单位',
          align: 'center',
          width: 80
        },
        {
          prop: 'stock',
          label: '库存',
          align: 'center',
          width: 80
        },
        {
          prop: 'salesCount',
          label: '销量',
          align: 'center',
          width: 80,
          sortable: true
        },
        {
          prop: 'viewCount',
          label: '浏览量',
          align: 'center',
          width: 80
        },
        {
          prop: 'isRecommend',
          label: '推荐',
          align: 'center',
          width: 80
        },
        {
          prop: 'isHot',
          label: '热门',
          align: 'center',
          width: 80
        },
        {
          prop: 'isNew',
          label: '新品',
          align: 'center',
          width: 80
        },
        {
          prop: 'sceneType',
          label: '场景',
          align: 'center',
          width: 80
        },
        {
          prop: 'saleStatus',
          label: '状态',
          align: 'center',
          width: 80
        },
        {
          prop: 'sortOrder',
          label: '排序',
          align: 'center',
          width: 80
        },
        {
          prop: 'cookingTime',
          label: '制作时间(分钟)',
          align: 'center',
          width: 120
        },
        {
          prop: 'createdAt',
          label: '创建时间',
          width: 180,
          formatter: (row: any) =>
            row.createdAt ? row.createdAt.substring(0, 19).replace('T', ' ') : ''
        },
        {
          prop: 'updatedAt',
          label: '更新时间',
          width: 180,
          formatter: (row: any) =>
            row.updatedAt ? row.updatedAt.substring(0, 19).replace('T', ' ') : ''
        },
        {
          prop: 'operation',
          label: '操作',
          fixed: 'right',
          width: 120,
          formatter: (row: any) =>
            h('div', { style: 'display: flex; gap: 5px;flex-wrap: wrap; align-items: center;' }, [
              h(ArtButtonTable, {
                auth: 'restaurant:dish:edit',
                type: 'edit',
                onClick: () => showDialog('edit', row)
              }),
              h(ArtButtonTable, {
                auth: 'restaurant:dish:delete',
                type: 'delete',
                onClick: () => deleteDish(row.id)
              }),
              h(ArtButtonTable, {
                auth: 'restaurant:dish:spec',
                style: 'margin-top: 5px;',
                type: 'add',
                onClick: () => showDialog('addSpec', row)
              })
            ])
        }
      ]
    }
  })

  const handleSearch = () => {
    getData(searchForm)
  }

  const resetSearchParam = () => {
    resetSearchParams()
  }

  // 处理表格选择变化
  const handleSelectionChange = (selection: any[]) => {
    selectedRows.value = selection
  }

  // 查看详情
  // const viewDetail = (row: any) => {
  //   ElMessage.info(`查看菜品详情：${row.dishName}`)
  //   // 实际项目中应该调用 /dish/detail/${row.id} 接口
  // }

  // 显示菜品弹窗
  const showDialog = (type: string, row?: any): void => {
    console.log('打开弹窗:', { type, row })
    if (type === 'add' || type === 'edit') {
      dialogType.value = type
      currentDishData.value = row || {}
      nextTick(() => {
        dialogVisible.value = true
      })
    }

    // 如果是添加规格
    if (type === 'addSpec') {
      specDialogType.value = 'addSpec'
      currentSpecDishId.value = row?.id
      currentSpecData.value = null
      nextTick(() => {
        specDialogVisible.value = true
      })
      return
    }

    // 如果是编辑规格
    if (type === 'editSpec') {
      specDialogType.value = 'editSpec'
      currentSpecDishId.value = row.dishId
      currentSpecData.value = row
      nextTick(() => {
        specDialogVisible.value = true
      })
      return
    }
  }

  // 处理编辑规格值
  const handleEditSpecValue = (spec: any) => {
    // 设置当前编辑的规格
    showDialog('editSpec', spec)
  }

  // 处理弹窗提交事件
  const handleDialogSubmit = () => {
    try {
      dialogVisible.value = false
      currentDishData.value = {}
    } catch (error: any) {
      ElMessage.error('提交失败:' + error.message)
    }
  }

  // 刷新菜品详情
  const refreshDishDetail = async () => {
    // 保存当前选中的菜品ID
    const currentDishId = selectedDish.value?.id
    // 刷新表格数据
    await refreshData()
    // 如果有选中的菜品，则从刷新后的数据中查找并更新
    if (currentDishId) {
      // 从更新后的数据中找到当前选中的菜品
      const updatedDish = data.value.find((item: any) => item.id === currentDishId)
      if (updatedDish) {
        // 使用完整的更新后的行数据更新详情卡片
        handleRowClick(updatedDish)
      }
    }
  }

  // 删除菜品
  const deleteDish = (id: number) => {
    ElMessageBox.confirm('确定要删除该菜品吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(() => {
        // 实际项目中应该调用 /dish/delete/${id} 接口
        request
          .del({
            url: '/dish/delete/' + id
          })
          .then(() => {
            ElMessage.success('删除成功')
            refreshData()
          })
          .catch((error) => {
            ElMessage.error(error.message)
          })
      })
      .catch(() => {
        ElMessage.info('已取消删除')
      })
  }

  // 批量删除
  const batchDelete = () => {
    if (selectedRows.value.length === 0) {
      ElMessage.warning('请至少选择一条记录')
      return
    }
    const ids = selectedRows.value.map((row) => row.id)
    ElMessageBox.confirm(`确定要删除选中的 ${selectedRows.value.length} 条记录吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(() => {
        request
          .del({
            url: '/dish/batchDelete',
            data: ids
          })
          .then(() => {
            ElMessage.success('批量删除成功')
            refreshData()
          })
          .catch((error) => {
            ElMessage.error(error.message)
          })
        refreshData()
      })
      .catch(() => {
        ElMessage.info('已取消删除')
      })
  }

  // 处理删除规格
  const handleDeleteSpec = (spec: any) => {
    ElMessageBox.confirm(`确定要删除规格"${spec.specName}"吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(() => {
        request
          .del({
            url: '/dish/spec/delete/' + spec.id
          })
          .then(() => {
            ElMessage.success('删除规格成功')
            refreshDishDetail()
          })
          .catch((error) => {
            ElMessage.error(error.message || '删除失败')
          })
      })
      .catch(() => {
        ElMessage.info('已取消删除')
      })
  }

  // 处理表格行点击事件
  const handleRowClick = (row: any) => {
    selectedDish.value = row
  }
</script>

<style lang="scss" scoped>
  .tree-container {
    box-sizing: border-box;
    display: flex;
    gap: 16px;
    height: 100%;

    .left-sidebar {
      flex-shrink: 0;
      width: 350px;
      height: 100%;
    }

    .right-content {
      flex-grow: 1;
      min-width: 0;
      height: 100%;
    }

    .art-table-card {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
  }

  @media screen and (width <= 800px) {
    .tree-container {
      display: block;
      gap: 0;
      height: auto;

      .left-sidebar {
        width: 100%;
        height: auto;
        margin-bottom: 20px;
      }
    }
  }

  .empty-dish-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 20px;
    color: var(--el-text-color-secondary);

    p {
      margin-top: 16px;
      font-size: 14px;
    }
  }
</style>
