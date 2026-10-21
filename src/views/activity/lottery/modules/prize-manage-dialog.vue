<!-- 奖品库管理弹窗 -->
<template>
  <ElDialog v-model="dialogVisible" title="奖品库管理" width="900px" align-center destroy-on-close>
    <div class="prize-manage">
      <!-- 操作栏 -->
      <div class="flex justify-between mb-4">
        <ElButton v-auth="'marketing:lottery:prize'" type="primary" @click="showPrizeDialog('add')"
          >新增奖品</ElButton
        >
        <ElInput v-model="searchKeyword" placeholder="搜索奖品名称" style="width: 200px" clearable>
          <template #prefix>
            <i class="i-ep:search" />
          </template>
        </ElInput>
      </div>

      <!-- 奖品列表 -->
      <ArtTable
        :data="filteredPrizeList"
        v-loading="loading"
        max-height="400px"
        :columns="tableColumns"
      >
        <template #tableColumnsSlot2="{ row }">
          <ElImage
            v-if="row.imgUrl"
            :src="row.imgUrl"
            style="width: 50px; height: 50px; border-radius: 4px"
            fit="cover"
            :preview-src-list="[row.imgUrl]"
            preview-teleported
          />
          <span v-else style="color: #909399">-</span>
        </template>
        <template #tableColumnsSlot4="{ row }">
          <ElTag :type="getPrizeTypeConfig(row.type).type" size="small">
            {{ getPrizeTypeConfig(row.type).text }}
          </ElTag>
        </template>
        <template #tableColumnsSlot5="{ row }">
          {{ row.probability != null ? `${Number(row.probability).toFixed(2)}%` : '-' }}
        </template>
        <template #tableColumnsSlot6="{ row }">
          <ElSwitch
            v-auth="'marketing:lottery:prize'"
            :model-value="row.enabled === 1"
            @change="() => handleToggleStatus(row)"
          />
        </template>
        <template #tableColumnsSlot7="{ row }">
          {{ row.createTime ? row.createTime.substring(0, 19).replace('T', ' ') : '-' }}
        </template>
      </ArtTable>
    </div>

    <!-- 奖品编辑子弹窗 -->
    <ElDialog
      v-model="prizeDialogVisible"
      :title="prizeDialogType === 'add' ? '新增奖品' : '编辑奖品'"
      width="500px"
      append-to-body
      align-center
      destroy-on-close
    >
      <ArtForm ref="prizeFormRef" :model="prizeFormData" :rules="prizeRules" label-width="100px">
        <ElFormItem label="奖品名称" prop="name">
          <ElInput v-model="prizeFormData.name" placeholder="请输入奖品名称" maxlength="50" />
        </ElFormItem>
        <ElFormItem label="奖品类型" prop="type">
          <ElSelect v-model="prizeFormData.type" placeholder="请选择奖品类型" style="width: 100%">
            <ElOption label="优惠券" :value="0" />
            <ElOption label="积分" :value="1" />
            <ElOption label="实物" :value="2" />
            <ElOption label="谢谢参与" :value="3" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="奖品图片" prop="imgUrl">
          <div class="prize-image-upload">
            <ElUpload
              v-model:file-list="prizeFileList"
              :http-request="uploadRequest"
              :headers="uploadHeaders"
              list-type="picture-card"
              :on-success="handlePrizeUploadSuccess"
              :on-error="handlePrizeUploadError"
              :on-remove="handlePrizeRemove"
              :before-upload="beforePrizeUpload"
              :limit="1"
              :on-exceed="handlePrizeExceed"
              accept="image/*"
            >
              <el-icon><Plus /></el-icon>
            </ElUpload>
            <div class="upload-tip">建议尺寸 200x200，支持 jpg/png 格式，不超过2MB</div>
            <ElButton @click="pickerVisible = true">从资源库选择</ElButton>
          </div>
        </ElFormItem>
        <ElFormItem label="中奖概率" prop="probability">
          <div class="probability-input">
            <ElSlider
              v-model="prizeFormData.probability"
              :min="0"
              :max="100"
              :step="0.1"
              :show-tooltip="true"
              :format-tooltip="(val: number) => `${val}%`"
              style="flex: 1; margin-right: 16px"
            />
            <div class="probability-value">
              <ElInput v-model.number="prizeFormData.probability" style="width: 80px" size="small">
                <template #suffix>%</template>
              </ElInput>
            </div>
          </div>
        </ElFormItem>
        <ElFormItem v-if="prizeFormData.type === 0" label="优惠券ID" prop="couponId">
          <ElInputNumber
            v-model="prizeFormData.couponId"
            :min="1"
            placeholder="请输入优惠券ID"
            style="width: 100%"
          />
        </ElFormItem>
        <ElFormItem v-if="prizeFormData.type === 1" label="积分数量" prop="points">
          <ElInputNumber
            v-model="prizeFormData.points"
            :min="1"
            placeholder="请输入积分数量"
            style="width: 100%"
          />
        </ElFormItem>
        <ElFormItem label="是否启用" prop="enabled">
          <ElRadioGroup v-model="prizeFormData.enabled">
            <ElRadio :value="1">启用</ElRadio>
            <ElRadio :value="0">禁用</ElRadio>
          </ElRadioGroup>
        </ElFormItem>
      </ArtForm>

      <ResourcePicker v-model="pickerVisible" @select="selectResource" />
      <template #footer>
        <ElButton @click="prizeDialogVisible = false">取消</ElButton>
        <ElButton
          v-auth="'marketing:lottery:prize'"
          type="primary"
          :loading="prizeSubmitLoading"
          @click="handlePrizeSubmit"
          >提交</ElButton
        >
      </template>
    </ElDialog>

    <template #footer>
      <ElButton @click="dialogVisible = false">关闭</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { useTable } from '@/hooks/core/useTable'
  import { uploadRequest } from '@/api/upload'
  import ResourcePicker from '@/components/business/ResourcePicker.vue'
  import type { ResourceFile } from '@/api/resource-library'
  import { h, ref, reactive, computed, watch } from 'vue'
  import type { FormInstance, FormRules, UploadFile } from 'element-plus'
  import {
    ElDialog,
    ElButton,
    ElInput,
    ElImage,
    ElTag,
    ElSwitch,
    ElFormItem,
    ElSelect,
    ElOption,
    ElInputNumber,
    ElRadioGroup,
    ElRadio,
    ElMessage,
    ElMessageBox,
    ElUpload,
    ElSlider
  } from 'element-plus'
  import { Plus } from '@element-plus/icons-vue'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import {
    fetchGetPrizeList,
    fetchAddPrize,
    fetchUpdatePrize,
    fetchTogglePrizeStatus,
    fetchDeletePrize
  } from '@/api/lottery-manage'
  import {
    PrizeTypeEnumMap,
    BooleanEnumMap,
    convertListToNumber,
    getEnumNumber,
    getEnumText
  } from '@/utils/enum'
  import { useUserStore } from '@/store/modules/user'

  interface Props {
    visible: boolean
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

  // 上传配置
  const userStore = useUserStore()
  const uploadHeaders = computed(() => ({
    satoken: userStore.accessToken || ''
  }))

  // 奖品图片文件列表
  const prizeFileList = ref<UploadFile[]>([])
  const pickerVisible = ref(false)
  const selectResource = (file: ResourceFile) => {
    if (!file.url) return
    prizeFormData.imgUrl = file.url
    prizeFileList.value = [
      { name: file.originalFileName, url: file.url, uid: -Date.now(), status: 'success' }
    ]
  }

  const searchKeyword = ref('')

  // 奖品类型展示配置（基于数值枚举 0-3）
  const getPrizeTypeConfig = (type: Api.Lottery.PrizeType | string | undefined) => {
    const num = getEnumNumber(type as any, PrizeTypeEnumMap)
    const text = getEnumText(type as any, PrizeTypeEnumMap) || '未知'
    let tagType: 'success' | 'warning' | 'info' | 'danger' = 'info'

    if (num === 0) tagType = 'success'
    else if (num === 1) tagType = 'warning'
    else if (num === 2) tagType = 'info'
    else if (num === 3) tagType = 'danger'

    return { type: tagType, text }
  }

  // 过滤后的奖品列表
  const filteredPrizeList = computed(() => {
    if (!searchKeyword.value) return prizeList.value
    return prizeList.value.filter((item) => item.name?.includes(searchKeyword.value))
  })

  // 奖品编辑弹窗
  const prizeDialogVisible = ref(false)
  const prizeDialogType = ref<'add' | 'edit'>('add')
  const prizeFormRef = ref<FormInstance>()
  const prizeSubmitLoading = ref(false)

  // 奖品表单数据（内部使用数值枚举）
  const prizeFormData = reactive({
    id: undefined as number | undefined,
    name: '',
    type: 0 as Api.Lottery.PrizeType,
    imgUrl: '',
    probability: 10, // 默认10%
    couponId: undefined as number | undefined,
    points: undefined as number | undefined,
    enabled: 1
  })

  // 奖品表单验证规则
  const prizeRules: FormRules = {
    name: [{ required: true, message: '请输入奖品名称', trigger: 'blur' }],
    type: [{ required: true, message: '请选择奖品类型', trigger: 'change' }],
    probability: [{ required: true, message: '请输入中奖概率', trigger: 'blur' }]
  }

  // 显示奖品编辑弹窗
  const showPrizeDialog = (type: 'add' | 'edit', row?: Api.Lottery.PrizeListItem) => {
    prizeDialogType.value = type

    if (type === 'edit' && row) {
      Object.assign(prizeFormData, {
        id: row.id,
        name: row.name || '',
        type: (row.type ?? 0) as Api.Lottery.PrizeType,
        imgUrl: row.imgUrl || '',
        probability: row.probability ?? 10,
        couponId: row.couponId,
        points: row.points,
        enabled: row.enabled ?? 1
      })
      // 回填图片
      if (row.imgUrl) {
        prizeFileList.value = [
          {
            name: 'prize',
            url: row.imgUrl
          } as UploadFile
        ]
      } else {
        prizeFileList.value = []
      }
    } else {
      Object.assign(prizeFormData, {
        id: undefined,
        name: '',
        type: 0 as Api.Lottery.PrizeType,
        imgUrl: '',
        probability: 10, // 默认10%
        couponId: undefined,
        points: undefined,
        enabled: 1
      })
      prizeFileList.value = []
    }

    prizeDialogVisible.value = true
  }

  // 奖品图片上传前校验
  const beforePrizeUpload = (file: File) => {
    const isImage = file.type.startsWith('image/')
    const isLt2M = file.size / 1024 / 1024 < 2

    if (!isImage) {
      ElMessage.error('只能上传图片文件!')
      return false
    }
    if (!isLt2M) {
      ElMessage.error('图片大小不能超过 2MB!')
      return false
    }
    return true
  }

  // 奖品图片上传成功
  const handlePrizeUploadSuccess = (response: any, uploadFile: any) => {
    if ((response.code === '200' || response.code === 200) && response.data) {
      // 更新图片列表中的URL
      const fileIndex = prizeFileList.value.findIndex((file) => file.uid === uploadFile.uid)
      if (fileIndex !== -1) {
        prizeFileList.value[fileIndex].url = response.data.url
      }
      prizeFormData.imgUrl = response.data.url
      ElMessage.success('上传成功')
    } else {
      ElMessage.error(response.msg || response.message || '上传失败')
    }
  }

  // 奖品图片上传失败
  const handlePrizeUploadError = (error: Error) => {
    ElMessage.error('上传失败: ' + error.message)
  }

  // 移除奖品图片
  const handlePrizeRemove = () => {
    prizeFormData.imgUrl = ''
  }

  // 奖品图片超出限制
  const handlePrizeExceed = () => {
    ElMessage.warning('最多只能上传1张图片')
  }

  // 提交奖品表单
  const handlePrizeSubmit = async () => {
    try {
      if (!prizeFormRef.value) return

      const valid = await prizeFormRef.value.validate()
      if (!valid) return

      prizeSubmitLoading.value = true

      if (prizeDialogType.value === 'add') {
        await fetchAddPrize(prizeFormData as any)
        ElMessage.success('添加成功')
      } else {
        await fetchUpdatePrize(prizeFormData as any)
        ElMessage.success('修改成功')
      }

      prizeDialogVisible.value = false
      await (prizeDialogType.value === 'add' ? refreshCreate() : refreshUpdate())
      emit('success')
    } catch (error: any) {
      ElMessage.error(error.message || '操作失败')
    } finally {
      prizeSubmitLoading.value = false
    }
  }

  // 切换奖品状态 - 后端接口自动切换状态，只需传id
  const handleToggleStatus = async (row: Api.Lottery.PrizeListItem) => {
    try {
      await fetchTogglePrizeStatus(row.id!)
      ElMessage.success('状态已切换')
      await refreshUpdate()
    } catch (error: any) {
      ElMessage.error(error.message || '操作失败')
    }
  }

  // 删除奖品
  const handleDeletePrize = (row: Api.Lottery.PrizeListItem) => {
    ElMessageBox.confirm(`确定要删除奖品「${row.name}」吗？`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(async () => {
        try {
          await fetchDeletePrize(row.id!)
          ElMessage.success('删除成功')
          await refreshRemove()
          emit('success')
        } catch (error: any) {
          ElMessage.error(error.message || '删除失败')
        }
      })
      .catch(() => {
        ElMessage.info('已取消删除')
      })
  }

  // 监听对话框显示
  watch(
    () => props.visible,
    (visible) => {
      if (visible) {
        void refreshData()
      }
    },
    { immediate: true }
  )

  const {
    data: prizeList,
    columns: tableColumns,
    loading,
    refreshData,
    refreshCreate,
    refreshUpdate,
    refreshRemove
  } = useTable({
    core: {
      apiFn: fetchGetPrizeList,
      immediate: false,
      columnsFactory: () => [
        { prop: 'id', label: 'ID', width: 60 },
        {
          prop: 'imgUrl',
          label: '图片',
          width: 80,
          align: 'center',
          useSlot: true,
          slotName: 'tableColumnsSlot2'
        },
        { prop: 'name', label: '奖品名称', minWidth: 120 },
        {
          prop: 'type',
          label: '奖品类型',
          width: 100,
          useSlot: true,
          slotName: 'tableColumnsSlot4'
        },
        {
          prop: 'probability',
          label: '中奖概率',
          width: 100,
          align: 'center',
          useSlot: true,
          slotName: 'tableColumnsSlot5'
        },
        {
          prop: 'enabled',
          label: '状态',
          width: 80,
          align: 'center',
          useSlot: true,
          slotName: 'tableColumnsSlot6'
        },
        {
          prop: 'createTime',
          label: '创建时间',
          width: 160,
          useSlot: true,
          slotName: 'tableColumnsSlot7'
        },
        {
          prop: 'operation',
          label: '操作',
          width: 100,
          fixed: 'right',
          formatter: (row: Api.Lottery.PrizeListItem) =>
            h('div', { class: 'flex items-center' }, [
              h(ArtButtonTable, {
                auth: 'marketing:lottery:prize',
                type: 'edit',
                onClick: () => showPrizeDialog('edit', row)
              }),
              h(ArtButtonTable, {
                auth: 'marketing:lottery:prize',
                type: 'delete',
                onClick: () => handleDeletePrize(row)
              })
            ])
        }
      ]
    },
    transform: {
      dataTransformer: (data) =>
        convertListToNumber(data, {
          type: PrizeTypeEnumMap,
          enabled: BooleanEnumMap
        }) as Api.Lottery.PrizeListItem[]
    }
  })
</script>

<style lang="scss" scoped>
  .prize-manage {
    min-height: 300px;
  }

  .prize-image-upload {
    .upload-tip {
      margin-top: 8px;
      font-size: 12px;
      color: #909399;
    }

    :deep(.el-upload--picture-card) {
      width: 80px;
      height: 80px;
    }

    :deep(.el-upload-list--picture-card .el-upload-list__item) {
      width: 80px;
      height: 80px;
    }
  }

  .probability-input {
    display: flex;
    align-items: center;
    width: 100%;

    .probability-value {
      flex-shrink: 0;
    }
  }
</style>
