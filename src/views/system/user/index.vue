<!-- 用户管理页面 -->
<!-- art-full-height 自动计算出页面剩余高度 -->
<!-- art-table-card 一个符合系统样式的 class，同时自动撑满剩余高度 -->
<!-- 更多 useTable 使用示例请移步至 功能示例 下面的高级表格示例或者查看官方文档 -->
<!-- useTable 文档：https://www.artd.pro/docs/zh/guide/hooks/use-table.html -->
<template>
  <div class="user-page art-full-height">
    <!-- 搜索栏 -->
    <UserSearch
      :model-value="searchForm"
      @update:model-value="(value) => Object.assign(searchForm, value)"
      @search="handleSearch"
      @reset="resetSearchParams"
    ></UserSearch>

    <ElCard class="art-table-card" shadow="never">
      <!-- 表格头部 -->
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElSpace wrap>
            <ElButton v-auth="'system:user:add'" @click="showDialog('add')" v-ripple
              >新增用户</ElButton
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
        @selection-change="handleSelectionChange"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      >
      </ArtTable>

      <!-- 用户弹窗 -->
      <UserDialog
        v-model:visible="dialogVisible"
        :type="dialogType"
        :user-data="currentUserData"
        @submit="handleDialogSubmit"
        @addSuccess="refreshCreate"
        @editSuccess="refreshUpdate"
      />

      <UserRecharge
        v-model:visible="rechargeDialogVisible"
        :user-data="currentUserData"
        :type="dialogType"
        @submit="handleDialogSubmit"
        @rechargeSuccess="refreshUpdate"
      />
      <UserAccountRecordsDialog
        v-model:visible="accountRecordsVisible"
        :kind="accountRecordsKind"
        :user-data="accountRecordsUser"
      />
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import { useTable } from '@/hooks/core/useTable'
  import { fetchGetUserList } from '@/api/system-manage'
  import UserSearch from './modules/user-search.vue'
  import UserDialog from './modules/user-dialog.vue'
  import UserRecharge from '@views/system/user/modules/user-recharge.vue'
  import UserAccountRecordsDialog from './modules/user-account-records-dialog.vue'
  import type { UserAccountRecordKind } from '@/api/user-account-records'
  import { ElTag, ElMessageBox, ElImage, ElTooltip } from 'element-plus'
  import { DialogType } from '@/types'
  import request from '@/utils/http'
  import { resolveUserAvatar } from '@/utils/user-avatar'

  defineOptions({ name: 'User' })

  type UserListItem = Api.SystemManage.UserListItem

  // 弹窗相关
  const dialogType = ref<DialogType>('add')
  const dialogVisible = ref(false)
  const currentUserData = ref<Partial<UserListItem>>({})

  const rechargeDialogVisible = ref(false)
  const accountRecordsVisible = ref(false)
  const accountRecordsKind = ref<UserAccountRecordKind>('experience')
  const accountRecordsUser = ref<UserListItem>()
  const openAccountRecords = (row: UserListItem, kind: UserAccountRecordKind) => {
    accountRecordsUser.value = row
    accountRecordsKind.value = kind
    accountRecordsVisible.value = true
  }
  const accountTagEvents = (row: UserListItem, kind: UserAccountRecordKind) => ({
    role: 'button',
    tabindex: 0,
    style: { cursor: 'pointer' },
    onClick: (event: MouseEvent) => {
      event.stopPropagation()
      openAccountRecords(row, kind)
    },
    onKeydown: (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      event.stopPropagation()
      openAccountRecords(row, kind)
    }
  })
  // 选中行
  const selectedRows = ref<UserListItem[]>([])

  // 搜索表单
  const searchForm = reactive({
    keyWord: '',
    level: ''
  })

  // 用户状态配置
  const USER_STATUS_CONFIG = {
    正常: { type: 'success' as const, text: '正常' },
    未知: { type: 'info' as const, text: '未知' },
    禁用: { type: 'danger' as const, text: '禁用' },
    注销: { type: 'danger' as const, text: '注销' }
  } as const

  // 用户性别配置
  const USER_GENDER_CONFIG = {
    男: { type: 'primary' as const, text: '男' },
    女: { type: 'warning' as const, text: '女' },
    保密: { type: 'info' as const, text: '保密' }
  } as const

  /**
   * 获取用户状态配置
   */
  const getUserStatusConfig = (status: string) => {
    return (
      USER_STATUS_CONFIG[status as keyof typeof USER_STATUS_CONFIG] || {
        type: 'info' as const,
        text: '未知'
      }
    )
  }

  /**
   * 获取性别状态配置
   */
  const getUserGenderConfig = (status: string) => {
    return (
      USER_GENDER_CONFIG[status as keyof typeof USER_GENDER_CONFIG] || {
        type: 'info' as const,
        text: '保密'
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
      apiFn: fetchGetUserList,
      apiParams: {
        currentPage: 1,
        pageSize: 8,
        keyWord: searchForm.keyWord,
        level: searchForm.level
      },
      paginationKey: {
        current: 'currentPage',
        size: 'pageSize'
      },
      // 排除 apiParams 中的属性
      excludeParams: ['daterange'],
      columnsFactory: () => [
        /*
    { type: 'selection' }, // 勾选列
*/
        { type: 'index', width: 60, label: '序号' }, // 序号
        {
          prop: 'userInfo',
          label: '用户名',
          width: 280,
          // visible: false, // 默认是否显示列
          formatter: (row) => {
            const avatar = resolveUserAvatar(row.avatar, row.gender)
            return h('div', { class: 'user flex-c' }, [
              h(
                ElImage,
                {
                  class: 'size-9.5 rounded-md',
                  src: avatar,
                  previewSrcList: [avatar],
                  // 图片预览是否插入至 body 元素上，用于解决表格内部图片预览样式异常
                  previewTeleported: true,
                  fit: 'cover'
                },
                {
                  error: () =>
                    h(
                      'div',
                      {
                        class: 'size-9.5 rounded-md flex items-center justify-center bg-gray-100',
                        style: 'color: #909399;'
                      },
                      [h('i', { class: 'i-ep:picture text-2xl' })]
                    )
                }
              ),
              h('div', { class: 'ml-2' }, [
                h('p', { class: 'user-name' }, row.username),
                h('p', { class: 'email' }, row.email)
              ])
            ])
          }
        },
        {
          prop: 'gender',
          label: '性别',
          sortable: true,
          // checked: false, // 隐藏列
          formatter: (row: any) => {
            const statusConfig = getUserGenderConfig(row.gender)
            return h(ElTag, { type: statusConfig.type }, { default: () => statusConfig.text })
          }
        },
        {
          prop: 'phone',
          label: '手机号',
          align: 'center',
          formatter: (row: any) => (row.phone ? row.phone : '-')
        },
        {
          prop: 'status',
          label: '状态',
          formatter: (row: any) => {
            const statusConfig = getUserStatusConfig(row.status)
            return h(ElTag, { type: statusConfig.type }, { default: () => statusConfig.text })
          }
        },
        {
          prop: 'level',
          label: '等级/经验',
          width: 130,
          formatter: (row: UserListItem) => {
            return h(
              ElTag,
              { type: 'success', ...accountTagEvents(row, 'experience') },
              {
                default: () => h('p', {}, row.levelName + '/' + row.exp)
              }
            )
          }
        },
        {
          prop: 'surplusMoney',
          label: '余额',
          width: 100,
          formatter: (row: UserListItem) => {
            return h(
              ElTooltip,
              {
                content: `用户余额：${row.surplusMoney ?? '-'}`,
                placement: 'top'
              },
              {
                default: () =>
                  h(
                    ElTag,
                    { type: 'warning', ...accountTagEvents(row, 'balance') },
                    {
                      default: () => h('p', {}, row.surplusMoney)
                    }
                  )
              }
            )
          }
        },
        {
          prop: 'points',
          label: '积分',
          formatter: (row: UserListItem) => {
            return h(
              ElTag,
              { type: 'info', ...accountTagEvents(row, 'points') },
              {
                default: () => h('p', {}, row.points)
              }
            )
          }
        },
        {
          prop: 'birthday',
          label: '生日',
          sortable: true,
          align: 'center',
          formatter: (row: any) => (row.birthday ? row.birthday : '-')
        },
        {
          prop: 'createTime',
          label: '创建日期',
          sortable: true
        },
        {
          prop: 'operation',
          label: '操作',
          width: 120,
          fixed: 'right', // 固定列
          formatter: (row: any) =>
            h('div', [
              h(ArtButtonTable, {
                auth: 'system:user:edit',
                type: 'edit',
                onClick: () => showDialog('edit', row)
              }),
              h(ArtButtonTable, {
                auth: 'system:user:delete',
                type: 'delete',
                onClick: () => deleteUser(row)
              }),
              h(ArtButtonTable, {
                auth: 'system:user:recharge',
                style: 'margin-top: 5px;',
                icon: 'ri:bank-card-fill',
                iconColor: '#a364ff',
                buttonBgColor: '#D6C6E1',
                onClick: () => showDialog('recharge', row)
              }),
              h(ArtButtonTable, {
                auth: 'system:user:reset-password',
                style: 'margin-top: 5px;',
                icon: 'ri:lock-password-line',
                iconColor: '#ff6b6b',
                buttonBgColor: '#ffe3e3',
                onClick: () => resetPassword(row)
              })
            ])
        }
      ]
    },
    // 数据处理
    transform: {
      // 数据转换器
      dataTransformer: (records: any) => {
        // 类型守卫检查
        console.log(records)
        if (!Array.isArray(records)) {
          console.warn('数据转换器: 期望数组类型，实际收到:', typeof records)
          return []
        }

        // 直接返回后端数据，不再替换头像
        return records
      }
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
   * @param params 参数
   */
  const handleSearch = () => {
    // 处理日期区间参数，把 daterange 转换为 startTime 和 endTime
    // const { daterange, ...filtersParams } = params
    // const [startTime, endTime] = Array.isArray(daterange) ? daterange : [null, null]
    // 搜索参数赋值
    // Object.assign(searchParams,searchForm.value)
    getData(searchForm)
  }

  /**
   * 显示用户弹窗
   */
  const showDialog = (type: DialogType, row?: UserListItem): void => {
    console.log('打开弹窗:', { type, row })
    if (type === 'add' || type === 'edit') {
      dialogType.value = type
      currentUserData.value = row || {}
      nextTick(() => {
        dialogVisible.value = true
      })
    }
    if (type === 'recharge') {
      dialogType.value = type
      currentUserData.value = row || {}
      nextTick(() => {
        rechargeDialogVisible.value = true
      })
    }
  }

  /**
   * 删除用户
   */
  const deleteUser = (row: UserListItem): void => {
    ElMessageBox.confirm(`确定要注销该用户吗？`, '注销用户', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'error'
    })
      .then(() => {
        request
          .del({
            url: `/user/${row.id}`
          })
          .then(() => {
            ElMessage.success('注销成功')
            refreshRemove()
          })
          .catch((error) => {
            ElMessage.error(error.message)
          })
      })
      .catch(() => {
        ElMessage.info('取消注销')
      })
  }

  /**
   * 重置用户密码
   */
  const resetPassword = (row: UserListItem): void => {
    ElMessageBox.prompt(
      `重置用户 "${row.username}" 的密码，留空则使用默认密码：123456`,
      '重置密码',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPlaceholder: '请输入新密码（留空使用默认密码123456）',
        inputType: 'password',
        inputPattern: /^.{0}$|^.{6,}$/,
        inputErrorMessage: '密码长度至少6位',
        distinguishCancelAndClose: true
      }
    )
      .then(({ value }) => {
        const newPassword = value?.trim() || ''
        const params: any = {
          userId: row.id
        }

        // 如果输入了新密码，则添加到参数中
        if (newPassword) {
          params.newPassword = newPassword
        }

        request
          .post({
            url: '/user/admin/resetPassword',
            data: null,
            params: params,
            returnFullResponse: true
          })
          .then((res: any) => {
            if (res.code == '200') {
              ElMessage.success(res.msg || '密码重置成功')
            }
          })
          .catch((error) => {
            ElMessage.error(error.msg || '密码重置失败')
          })
      })
      .catch(() => {
        ElMessage.info('已取消重置')
      })
  }

  /**
   * 处理弹窗提交事件
   */
  const handleDialogSubmit = () => {
    try {
      if (dialogType.value === 'add' || dialogType.value === 'edit') {
        dialogVisible.value = false
        currentUserData.value = {}
      }
      if (dialogType.value === 'recharge') {
        rechargeDialogVisible.value = false
        currentUserData.value = {}
      }
    } catch (error) {
      ElMessage.error('提交失败:' + error)
    }
  }

  /**
   * 处理表格行选择变化
   */
  const handleSelectionChange = (selection: UserListItem[]): void => {
    selectedRows.value = selection
    console.log('选中行数据:', selectedRows.value)
  }
</script>
