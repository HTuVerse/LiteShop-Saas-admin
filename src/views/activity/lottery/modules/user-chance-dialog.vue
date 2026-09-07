<!-- 用户抽奖机会管理弹窗 -->
<template>
  <ElDialog
    v-model="dialogVisible"
    :title="`用户抽奖机会管理 - ${activityData?.name || ''}`"
    width="900px"
    align-center
    destroy-on-close
  >
    <div class="user-chance">
      <!-- 操作栏 -->
      <div class="flex justify-between mb-4">
        <div class="flex gap-2">
          <ElButton v-auth="'marketing:lottery:chance'" type="primary" @click="showAddChanceDialog"
            >发放单用户</ElButton
          >
          <ElButton v-auth="'marketing:lottery:chance'" type="success" @click="showBatchDialog"
            >批量发放</ElButton
          >
        </div>
        <ElInput v-model="searchKeyword" placeholder="搜索用户ID" style="width: 200px" clearable>
          <template #prefix>
            <i class="i-ep:search" />
          </template>
        </ElInput>
      </div>

      <!-- 用户抽奖机会列表 -->
      <ArtTable
        :data="displayedUserChances"
        v-loading="loading"
        max-height="350px"
        :columns="tableColumns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      >
        <template #tableColumnsSlot3="{ row }">
          <ElTag :type="row.chances > 0 ? 'success' : 'info'" size="large">
            {{ row.chances }}
          </ElTag>
        </template>
        <template #tableColumnsSlot4="{ row }">
          {{ row.createTime ? row.createTime.substring(0, 19).replace('T', ' ') : '-' }}
        </template>
        <template #tableColumnsSlot5="{ row }">
          {{ row.updateTime ? row.updateTime.substring(0, 19).replace('T', ' ') : '-' }}
        </template>
      </ArtTable>

      <!-- 统计信息 -->
      <div class="mt-4 flex gap-4">
        <ElTag type="info">总用户数: {{ pagination.total }}</ElTag>
        <ElTag type="success">当前页总次数: {{ currentPageTotalChances }}</ElTag>
      </div>
    </div>

    <!-- 单用户发放弹窗 -->
    <ElDialog
      v-model="addChanceDialogVisible"
      title="发放抽奖次数"
      width="450px"
      align-center
      append-to-body
      destroy-on-close
    >
      <ArtForm ref="addFormRef" :model="addFormData" :rules="addRules" label-width="100px">
        <ElFormItem label="用户ID" prop="userId">
          <ElInput
            v-model.trim="addFormData.userId"
            inputmode="numeric"
            maxlength="19"
            placeholder="请输入用户ID"
          />
        </ElFormItem>
        <ElFormItem label="发放次数" prop="chances">
          <ElInputNumber
            v-model="addFormData.chances"
            :min="1"
            :max="1000"
            placeholder="请输入发放次数"
            style="width: 100%"
          />
        </ElFormItem>
      </ArtForm>

      <template #footer>
        <ElButton @click="addChanceDialogVisible = false">取消</ElButton>
        <ElButton
          v-auth="'marketing:lottery:chance'"
          type="primary"
          :loading="addLoading"
          @click="handleAddChance"
          >发放</ElButton
        >
      </template>
    </ElDialog>

    <!-- 批量发放弹窗 -->
    <ElDialog
      v-model="batchDialogVisible"
      title="批量发放抽奖次数"
      width="500px"
      align-center
      append-to-body
      destroy-on-close
    >
      <ArtForm ref="batchFormRef" :model="batchFormData" :rules="batchRules" label-width="100px">
        <ElFormItem label="发放范围" prop="allUsers">
          <ElRadioGroup v-model="batchFormData.allUsers">
            <ElRadio :value="true">全体用户</ElRadio>
            <ElRadio :value="false">指定用户</ElRadio>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem v-if="!batchFormData.allUsers" label="用户ID" prop="userIds">
          <ElInput
            v-model="batchFormData.userIdsStr"
            type="textarea"
            :rows="3"
            placeholder="请输入用户ID，多个用逗号分隔，如: 1,2,3"
          />
        </ElFormItem>
        <ElFormItem label="发放次数" prop="chances">
          <ElInputNumber
            v-model="batchFormData.chances"
            :min="1"
            :max="1000"
            placeholder="请输入发放次数"
            style="width: 100%"
          />
        </ElFormItem>
      </ArtForm>

      <template #footer>
        <ElButton @click="batchDialogVisible = false">取消</ElButton>
        <ElButton
          v-auth="'marketing:lottery:chance'"
          type="success"
          :loading="batchLoading"
          @click="handleBatchChance"
          >批量发放</ElButton
        >
      </template>
    </ElDialog>

    <!-- 调整次数弹窗 -->
    <ElDialog
      v-model="changeDialogVisible"
      :title="changeType === 'increase' ? '增加抽奖次数' : '减少抽奖次数'"
      width="400px"
      align-center
      append-to-body
      destroy-on-close
    >
      <ArtForm ref="changeFormRef" :model="changeFormData" :rules="changeRules" label-width="100px">
        <ElFormItem label="用户ID">
          <ElInput :value="currentUser?.userId" disabled />
        </ElFormItem>
        <ElFormItem label="当前次数">
          <ElInput :value="currentUser?.chances" disabled />
        </ElFormItem>
        <ElFormItem :label="changeType === 'increase' ? '增加次数' : '减少次数'" prop="amount">
          <ElInputNumber
            v-model="changeFormData.amount"
            :min="1"
            :max="changeType === 'decrease' ? currentUser?.chances || 1 : 1000"
            placeholder="请输入次数"
            style="width: 100%"
          />
        </ElFormItem>
      </ArtForm>

      <template #footer>
        <ElButton @click="changeDialogVisible = false">取消</ElButton>
        <ElButton
          v-auth="'marketing:lottery:chance'"
          :type="changeType === 'increase' ? 'primary' : 'warning'"
          :loading="changeLoading"
          @click="handleChangeChance"
        >
          确定
        </ElButton>
      </template>
    </ElDialog>

    <template #footer>
      <ElButton @click="dialogVisible = false">关闭</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { useTable } from '@/hooks/core/useTable'
  import { h, ref, reactive, computed, watch } from 'vue'
  import type { FormInstance, FormRules } from 'element-plus'
  import {
    ElDialog,
    ElButton,
    ElInput,
    ElTag,
    ElFormItem,
    ElInputNumber,
    ElRadioGroup,
    ElRadio,
    ElMessage
  } from 'element-plus'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import {
    fetchGetActivityUserChances,
    fetchIncreaseUserChances,
    fetchDecreaseUserChances,
    fetchBatchIncreaseChances
  } from '@/api/lottery-manage'

  interface Props {
    visible: boolean
    activityData?: Partial<Api.Lottery.ActivityListItem>
  }

  interface Emits {
    (e: 'update:visible', value: boolean): void
    (e: 'success'): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  // 对话框显示控制
  const dialogVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
  })

  const searchKeyword = ref('')
  const displayedUserChances = computed(() => {
    const keyword = searchKeyword.value.trim()
    return keyword
      ? userChances.value.filter((item) => String(item.userId).includes(keyword))
      : userChances.value
  })

  // 当前页总次数
  const currentPageTotalChances = computed(() => {
    return userChances.value.reduce((sum, item) => sum + (item.chances || 0), 0)
  })

  // 单用户发放弹窗
  const addChanceDialogVisible = ref(false)
  const addFormRef = ref<FormInstance>()
  const addLoading = ref(false)
  const addFormData = reactive({
    userId: '',
    chances: 10
  })

  const addRules: FormRules = {
    userId: [
      { required: true, pattern: /^[1-9]\d{0,18}$/, message: '请输入有效用户ID', trigger: 'blur' }
    ],
    chances: [{ required: true, message: '请输入发放次数', trigger: 'blur' }]
  }

  // 批量发放弹窗
  const batchDialogVisible = ref(false)
  const batchFormRef = ref<FormInstance>()
  const batchLoading = ref(false)
  const batchFormData = reactive({
    allUsers: true,
    userIdsStr: '',
    chances: 10
  })

  const batchRules: FormRules = {
    chances: [{ required: true, message: '请输入发放次数', trigger: 'blur' }]
  }

  // 调整次数弹窗
  const changeDialogVisible = ref(false)
  const changeType = ref<'increase' | 'decrease'>('increase')
  const changeFormRef = ref<FormInstance>()
  const changeLoading = ref(false)
  const currentUser = ref<Api.Lottery.UserActivityChance | null>(null)
  const changeFormData = reactive({
    amount: 1
  })

  const changeRules: FormRules = {
    amount: [{ required: true, message: '请输入次数', trigger: 'blur' }]
  }

  // 显示单用户发放弹窗
  const showAddChanceDialog = () => {
    addFormData.userId = ''
    addFormData.chances = 10
    addChanceDialogVisible.value = true
  }

  // 显示批量发放弹窗
  const showBatchDialog = () => {
    batchFormData.allUsers = true
    batchFormData.userIdsStr = ''
    batchFormData.chances = 10
    batchDialogVisible.value = true
  }

  // 单用户发放
  const handleAddChance = async () => {
    try {
      if (!addFormRef.value) return

      const valid = await addFormRef.value.validate()
      if (!valid) return

      addLoading.value = true

      await fetchIncreaseUserChances(
        addFormData.userId!,
        props.activityData?.id!,
        addFormData.chances
      )

      ElMessage.success('发放成功')
      addChanceDialogVisible.value = false
      await refreshCreate()
      emit('success')
    } catch (error: any) {
      ElMessage.error(error.message || '发放失败')
    } finally {
      addLoading.value = false
    }
  }

  // 批量发放
  const handleBatchChance = async () => {
    try {
      if (!batchFormRef.value) return

      const valid = await batchFormRef.value.validate()
      if (!valid) return

      // 非全体用户时验证用户ID列表
      let userIds: (number | string)[] | undefined
      if (!batchFormData.allUsers) {
        if (!batchFormData.userIdsStr.trim()) {
          ElMessage.warning('请输入用户ID')
          return
        }
        userIds = batchFormData.userIdsStr
          .split(',')
          .map((id) => id.trim())
          .filter((id) => /^[1-9]\d*$/.test(id))

        if (userIds.length === 0) {
          ElMessage.warning('请输入有效的用户ID')
          return
        }
      }

      batchLoading.value = true

      await fetchBatchIncreaseChances(
        props.activityData?.id!,
        batchFormData.chances,
        batchFormData.allUsers,
        userIds
      )

      ElMessage.success(
        batchFormData.allUsers
          ? '已向全体用户发放抽奖次数'
          : `已向 ${userIds?.length} 位用户发放抽奖次数`
      )
      batchDialogVisible.value = false
      await refreshCreate()
      emit('success')
    } catch (error: any) {
      ElMessage.error(error.message || '批量发放失败')
    } finally {
      batchLoading.value = false
    }
  }

  // 显示调整次数弹窗
  const showChangeDialog = (row: Api.Lottery.UserActivityChance, type: 'increase' | 'decrease') => {
    currentUser.value = row
    changeType.value = type
    changeFormData.amount = 1
    changeDialogVisible.value = true
  }

  // 调整次数
  const handleChangeChance = async () => {
    try {
      if (!changeFormRef.value) return

      const valid = await changeFormRef.value.validate()
      if (!valid) return

      changeLoading.value = true

      if (changeType.value === 'increase') {
        await fetchIncreaseUserChances(
          currentUser.value?.userId!,
          props.activityData?.id!,
          changeFormData.amount
        )
        ElMessage.success('增加成功')
      } else {
        await fetchDecreaseUserChances(
          currentUser.value?.userId!,
          props.activityData?.id!,
          changeFormData.amount
        )
        ElMessage.success('减少成功')
      }

      changeDialogVisible.value = false
      await refreshUpdate()
    } catch (error: any) {
      ElMessage.error(error.message || '操作失败')
    } finally {
      changeLoading.value = false
    }
  }

  // 监听对话框显示
  watch(
    () => props.visible,
    (visible) => {
      if (visible) {
        searchKeyword.value = ''
        replaceSearchParams({ activityId: props.activityData?.id })
        void getData()
      }
    },
    { immediate: true }
  )

  const fetchUserChancePage = (params: {
    activityId?: number
    currentPage?: number
    pageSize?: number
  }) =>
    params.activityId
      ? fetchGetActivityUserChances(
          params.activityId,
          params.currentPage || 1,
          params.pageSize || 10
        )
      : Promise.resolve({ records: [], total: 0, current: 1, size: 10, pages: 0 })

  const {
    data: userChances,
    columns: tableColumns,
    loading,
    pagination,
    getData,
    replaceSearchParams,
    handleSizeChange,
    handleCurrentChange,
    refreshCreate,
    refreshUpdate
  } = useTable({
    core: {
      apiFn: fetchUserChancePage,
      apiParams: { currentPage: 1, pageSize: 10 },
      paginationKey: { current: 'currentPage', size: 'pageSize' },
      immediate: false,
      columnsFactory: () => [
        { prop: 'userId', label: '用户ID', width: 100 },
        { prop: 'activityId', label: '活动ID', width: 100 },
        {
          prop: 'chances',
          label: '剩余次数',
          width: 120,
          align: 'center',
          useSlot: true,
          slotName: 'tableColumnsSlot3'
        },
        {
          prop: 'createTime',
          label: '创建时间',
          width: 180,
          useSlot: true,
          slotName: 'tableColumnsSlot4'
        },
        {
          prop: 'updateTime',
          label: '更新时间',
          width: 180,
          useSlot: true,
          slotName: 'tableColumnsSlot5'
        },
        {
          prop: 'operation',
          label: '操作',
          width: 100,
          fixed: 'right',
          formatter: (row: Api.Lottery.UserActivityChance) =>
            h('div', { class: 'flex items-center' }, [
              h(ArtButtonTable, {
                auth: 'marketing:lottery:chance',
                icon: 'ri:add-circle-line',
                iconColor: '#67c23a',
                buttonBgColor: '#f0f9eb',
                label: '增加抽奖次数',
                onClick: () => showChangeDialog(row, 'increase')
              }),
              h(ArtButtonTable, {
                auth: 'marketing:lottery:chance',
                icon: 'ri:indeterminate-circle-line',
                iconColor: '#e6a23c',
                buttonBgColor: '#fdf6ec',
                label: '减少抽奖次数',
                onClick: () => showChangeDialog(row, 'decrease')
              })
            ])
        }
      ]
    }
  })
</script>

<style lang="scss" scoped>
  .user-chance {
    min-height: 300px;
  }
</style>
