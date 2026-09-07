<!-- 抽奖活动管理页面 -->
<template>
  <div class="lottery-page art-full-height">
    <!-- 搜索栏 -->
    <ActivitySearch
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
              v-auth="'marketing:lottery:add'"
              type="primary"
              v-ripple
              @click="showActivityDialog('add')"
              >新增活动</ElButton
            >
            <ElButton type="success" v-ripple @click="showPrizeManageDialog">奖品库管理</ElButton>
          </ElSpace>
        </template>
      </ArtTableHeader>

      <!-- 表格 -->
      <ArtTable :loading="loading" :data="filteredData" :columns="columns" />

      <!-- 活动编辑弹窗 -->
      <ActivityDialog
        v-model:visible="activityDialogVisible"
        :type="dialogType"
        :activity-data="currentActivityData"
        @submit="handleActivitySubmit"
        @success="refreshData"
      />

      <!-- 奖品库管理弹窗 -->
      <PrizeManageDialog v-model:visible="prizeManageDialogVisible" @success="refreshData" />

      <!-- 活动奖品配置弹窗 -->
      <ActivityPrizeDialog
        v-model:visible="activityPrizeDialogVisible"
        :activity-data="currentActivityData"
        @success="refreshData"
      />

      <!-- 用户抽奖机会管理弹窗 -->
      <UserChanceDialog
        v-model:visible="userChanceDialogVisible"
        :activity-data="currentActivityData"
        @success="refreshData"
      />

      <!-- 抽奖记录查看弹窗 -->
      <RecordDialog v-model:visible="recordDialogVisible" :activity-data="currentActivityData" />
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, computed, onMounted, h } from 'vue'
  import {
    ElCard,
    ElButton,
    ElSpace,
    ElMessage,
    ElMessageBox,
    ElTag,
    ElImage,
    ElProgress
  } from 'element-plus'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import ActivitySearch from './modules/activity-search.vue'
  import ActivityDialog from './modules/activity-dialog.vue'
  import PrizeManageDialog from './modules/prize-manage-dialog.vue'
  import ActivityPrizeDialog from './modules/activity-prize-dialog.vue'
  import UserChanceDialog from './modules/user-chance-dialog.vue'
  import RecordDialog from './modules/record-dialog.vue'
  import {
    fetchGetActivityList,
    fetchDeleteActivity,
    fetchToggleActivityStatus
  } from '@/api/lottery-manage'
  import type { DialogType } from '@/types'
  import { BooleanEnumMap, convertListToNumber } from '@/utils/enum'
  import { useTable } from '@/hooks/core/useTable'

  defineOptions({ name: 'LotteryActivity' })

  // 表格数据
  const data = ref<Api.Lottery.ActivityListItem[]>([])
  const loading = ref(false)

  // 搜索表单
  const searchForm = reactive({
    name: '',
    status: undefined as number | undefined
  })

  // 弹窗相关
  const dialogType = ref<DialogType>('add')
  const activityDialogVisible = ref(false)
  const prizeManageDialogVisible = ref(false)
  const activityPrizeDialogVisible = ref(false)
  const userChanceDialogVisible = ref(false)
  const recordDialogVisible = ref(false)
  const currentActivityData = ref<Partial<Api.Lottery.ActivityListItem>>({})

  // 活动状态配置
  const ACTIVITY_STATUS_CONFIG = {
    0: { type: 'danger' as const, text: '已关闭' },
    1: { type: 'success' as const, text: '进行中' }
  }

  // 过滤后的数据
  const filteredData = computed(() => {
    let result = data.value || []

    if (searchForm.name) {
      result = result.filter((item) => item.name?.includes(searchForm.name))
    }

    if (searchForm.status !== undefined && searchForm.status !== null) {
      result = result.filter((item) => item.status === searchForm.status)
    }

    return result
  })

  // 表格列配置
  const { columns, columnChecks } = useTable({
    core: {
      apiFn: async (): Promise<Api.Lottery.ActivityListItem[]> => [],
      immediate: false,
      columnsFactory: () => [
        {
          prop: 'id',
          label: 'ID',
          width: 80,
          sortable: true
        },
        {
          prop: 'imgUrl',
          label: '活动图片',
          width: 100,
          align: 'center',
          formatter: (row: Api.Lottery.ActivityListItem) => {
            return row.imgUrl
              ? h(ElImage, {
                  src: row.imgUrl,
                  style: 'width: 60px; height: 60px; border-radius: 4px;',
                  fit: 'cover',
                  previewSrcList: [row.imgUrl],
                  previewTeleported: true
                })
              : h('span', { style: 'color: #909399' }, '-')
          }
        },
        {
          prop: 'name',
          label: '活动名称',
          minWidth: 150
        },
        {
          prop: 'description',
          label: '活动描述',
          minWidth: 200,
          formatter: (row: Api.Lottery.ActivityListItem) => row.description || '-'
        },
        {
          prop: 'tag',
          label: '活动标签',
          width: 120,
          formatter: (row: Api.Lottery.ActivityListItem) => {
            return row.tag
              ? h(ElTag, { type: 'warning', size: 'small' }, { default: () => row.tag })
              : '-'
          }
        },
        {
          prop: 'status',
          label: '状态',
          width: 100,
          align: 'center',
          formatter: (row: Api.Lottery.ActivityListItem) => {
            const config = ACTIVITY_STATUS_CONFIG[
              row.status as keyof typeof ACTIVITY_STATUS_CONFIG
            ] || { type: 'info', text: '未知' }
            return h(ElTag, { type: config.type }, { default: () => config.text })
          }
        },
        {
          prop: 'timeRange',
          label: '活动时间',
          width: 180,
          formatter: (row: Api.Lottery.ActivityListItem) => {
            const start = row.startTime
              ? row.startTime.substring(0, 16).replace('T', ' ')
              : '未设置'
            const end = row.endTime ? row.endTime.substring(0, 16).replace('T', ' ') : '未设置'
            return h('div', { style: 'font-size: 12px; line-height: 1.5;' }, [
              h('div', {}, `开始: ${start}`),
              h('div', {}, `结束: ${end}`)
            ])
          }
        },
        {
          prop: 'createTime',
          label: '创建时间',
          width: 160,
          sortable: true,
          formatter: (row: Api.Lottery.ActivityListItem) => {
            return row.createTime ? row.createTime.substring(0, 19).replace('T', ' ') : '-'
          }
        },
        {
          prop: 'operation',
          label: '操作',
          width: 200,
          fixed: 'right',
          formatter: (row: Api.Lottery.ActivityListItem) => {
            return h('div', { class: 'flex flex-wrap gap-1' }, [
              h(ArtButtonTable, {
                auth: 'marketing:lottery:edit',
                type: 'edit',
                onClick: () => showActivityDialog('edit', row)
              }),
              h(ArtButtonTable, {
                icon: 'ri:gift-line',
                iconColor: '#e6a23c',
                buttonBgColor: '#fdf6ec',
                onClick: () => showActivityPrizeDialog(row)
              }),
              h(ArtButtonTable, {
                icon: 'ri:user-add-line',
                iconColor: '#67c23a',
                buttonBgColor: '#f0f9eb',
                onClick: () => showUserChanceDialog(row)
              }),
              h(ArtButtonTable, {
                icon: 'ri:file-list-3-line',
                iconColor: '#409eff',
                buttonBgColor: '#ecf5ff',
                onClick: () => showRecordDialog(row)
              }),
              h(ArtButtonTable, {
                auth: 'marketing:lottery:delete',
                type: 'delete',
                onClick: () => deleteActivity(row)
              })
            ])
          }
        }
      ]
    }
  })

  // 获取活动列表
  const fetchData = async () => {
    loading.value = true
    try {
      const result = await fetchGetActivityList()
      // 后端 LotteryActivity.status 使用 BooleanEnum，返回中文“是/否”
      // 统一转换为数值 0/1，便于筛选和展示
      data.value = convertListToNumber(result || [], {
        status: BooleanEnumMap
      }) as Api.Lottery.ActivityListItem[]
    } catch (error: any) {
      ElMessage.error(error.message || '获取活动列表失败')
    } finally {
      loading.value = false
    }
  }

  // 搜索
  const handleSearch = () => {
    // 数据已通过 computed 自动过滤
  }

  // 重置搜索
  const resetSearchParams = () => {
    searchForm.name = ''
    searchForm.status = undefined
  }

  // 刷新数据
  const refreshData = () => {
    fetchData()
  }

  // 显示活动编辑弹窗
  const showActivityDialog = (type: DialogType, row?: Api.Lottery.ActivityListItem) => {
    dialogType.value = type
    currentActivityData.value = row ? { ...row } : {}
    activityDialogVisible.value = true
  }

  // 显示奖品库管理弹窗
  const showPrizeManageDialog = () => {
    prizeManageDialogVisible.value = true
  }

  // 显示活动奖品配置弹窗
  const showActivityPrizeDialog = (row: Api.Lottery.ActivityListItem) => {
    currentActivityData.value = { ...row }
    activityPrizeDialogVisible.value = true
  }

  // 显示用户抽奖机会管理弹窗
  const showUserChanceDialog = (row: Api.Lottery.ActivityListItem) => {
    currentActivityData.value = { ...row }
    userChanceDialogVisible.value = true
  }

  // 显示抽奖记录弹窗
  const showRecordDialog = (row: Api.Lottery.ActivityListItem) => {
    currentActivityData.value = { ...row }
    recordDialogVisible.value = true
  }

  // 删除活动
  const deleteActivity = (row: Api.Lottery.ActivityListItem) => {
    ElMessageBox.confirm(`确定要删除活动「${row.name}」吗？删除后无法恢复！`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(async () => {
        try {
          await fetchDeleteActivity(row.id!)
          ElMessage.success('删除成功')
          refreshData()
        } catch (error: any) {
          ElMessage.error(error.message || '删除失败')
        }
      })
      .catch(() => {
        ElMessage.info('已取消删除')
      })
  }

  // 切换活动状态
  const toggleActivityStatus = async (row: Api.Lottery.ActivityListItem) => {
    try {
      await fetchToggleActivityStatus(row.id!)
      ElMessage.success('状态更新成功')
      refreshData()
    } catch (error: any) {
      ElMessage.error(error.message || '状态更新失败')
    }
  }

  // 处理活动弹窗提交
  const handleActivitySubmit = () => {
    activityDialogVisible.value = false
    currentActivityData.value = {}
  }

  // 组件挂载时获取数据
  onMounted(() => {
    fetchData()
  })
</script>

<style lang="scss" scoped>
  .lottery-page {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .art-table-card {
    display: flex;
    flex: 1;
    flex-direction: column;
    overflow: hidden;

    :deep(.el-card__body) {
      display: flex;
      flex: 1;
      flex-direction: column;
      overflow: hidden;
    }
  }
</style>
