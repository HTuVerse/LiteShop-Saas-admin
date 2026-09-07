<!-- 抽奖活动编辑弹窗 -->
<template>
  <ElDialog
    v-model="dialogVisible"
    :title="dialogType === 'add' ? '新增活动' : '编辑活动'"
    width="600px"
    align-center
    destroy-on-close
  >
    <ArtForm ref="formRef" :model="formData" :rules="rules" label-width="100px">
      <ElFormItem label="活动名称" prop="name">
        <ElInput
          v-model="formData.name"
          placeholder="请输入活动名称"
          maxlength="50"
          show-word-limit
        />
      </ElFormItem>

      <ElFormItem label="活动描述" prop="description">
        <ElInput
          v-model="formData.description"
          type="textarea"
          placeholder="请输入活动描述"
          :rows="3"
          maxlength="200"
          show-word-limit
        />
      </ElFormItem>

      <ElFormItem label="活动标签" prop="tag">
        <ElInput v-model="formData.tag" placeholder="请输入活动标签" maxlength="20" />
      </ElFormItem>

      <ElFormItem label="活动图片" prop="imgUrl">
        <div class="activity-image-upload">
          <ElUpload
            v-model:file-list="fileList"
            :http-request="uploadRequest"
            :headers="uploadHeaders"
            list-type="picture-card"
            :on-success="handleUploadSuccess"
            :on-error="handleUploadError"
            :on-remove="handleRemove"
            :before-upload="beforeUpload"
            :limit="1"
            :on-exceed="handleExceed"
            accept="image/*"
          >
            <el-icon><Plus /></el-icon>
          </ElUpload>
          <div class="upload-tip">建议尺寸 400x400，支持 jpg/png 格式，不超过2MB</div>
        </div>
      </ElFormItem>

      <ElFormItem label="活动时间" prop="timeRange">
        <ElDatePicker
          v-model="timeRange"
          type="datetimerange"
          range-separator="至"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          format="YYYY-MM-DD HH:mm"
          value-format="YYYY-MM-DDTHH:mm:ss"
          style="width: 100%"
        />
      </ElFormItem>

      <ElFormItem label="活动状态" prop="status">
        <ElRadioGroup v-model="formData.status" :disabled="!hasAuth('marketing:lottery:status')">
          <ElRadio :value="1">启用</ElRadio>
          <ElRadio :value="0">关闭</ElRadio>
        </ElRadioGroup>
      </ElFormItem>
    </ArtForm>

    <template #footer>
      <div class="dialog-footer">
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="submitLoading" @click="handleSubmit">提交</ElButton>
      </div>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { useAuth } from '@/hooks/core/useAuth'
  const { hasAuth } = useAuth()
  import { uploadRequest } from '@/api/upload'
  import { ref, reactive, computed, watch, nextTick } from 'vue'
  import type { FormInstance, FormRules, UploadFile } from 'element-plus'
  import {
    ElMessage,
    ElDialog,
    ElFormItem,
    ElInput,
    ElButton,
    ElRadioGroup,
    ElRadio,
    ElDatePicker,
    ElUpload
  } from 'element-plus'
  import { Plus } from '@element-plus/icons-vue'
  import { fetchUpdateActivity, fetchAddActivity } from '@/api/lottery-manage'
  import { useUserStore } from '@/store/modules/user'

  interface Props {
    visible: boolean
    type: string
    activityData?: Partial<Api.Lottery.ActivityListItem>
  }

  interface Emits {
    (e: 'update:visible', value: boolean): void
    (e: 'submit'): void
    (e: 'success'): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  // 对话框显示控制
  const dialogVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
  })

  const dialogType = computed(() => props.type)

  // 表单实例
  const formRef = ref<FormInstance>()
  const submitLoading = ref(false)

  // 上传配置
  const userStore = useUserStore()
  const uploadUrl = import.meta.env.VITE_API_URL + '/file-upload/upload/image'
  const uploadHeaders = computed(() => ({
    satoken: userStore.accessToken || ''
  }))

  // 文件列表
  const fileList = ref<UploadFile[]>([])

  // 时间范围
  const timeRange = ref<[string, string] | null>(null)

  // 表单数据
  const formData = reactive({
    id: undefined as number | undefined,
    name: '',
    description: '',
    tag: '',
    imgUrl: '',
    status: 1,
    startTime: '',
    endTime: ''
  })

  // 表单验证规则
  const rules: FormRules = {
    name: [
      { required: true, message: '请输入活动名称', trigger: 'blur' },
      { min: 2, max: 50, message: '活动名称长度在 2 到 50 个字符', trigger: 'blur' }
    ],
    status: [{ required: true, message: '请选择活动状态', trigger: 'change' }]
  }

  // 初始化表单数据
  const initFormData = () => {
    const isEdit = props.type === 'edit' && props.activityData
    const row = props.activityData

    Object.assign(formData, {
      id: isEdit ? row?.id : undefined,
      name: isEdit ? row?.name || '' : '',
      description: isEdit ? row?.description || '' : '',
      tag: isEdit ? row?.tag || '' : '',
      imgUrl: isEdit ? row?.imgUrl || '' : '',
      status: isEdit ? row?.status ?? 1 : 1,
      startTime: isEdit ? row?.startTime || '' : '',
      endTime: isEdit ? row?.endTime || '' : ''
    })

    // 回填图片
    if (isEdit && row?.imgUrl) {
      fileList.value = [
        {
          name: 'activity',
          url: row.imgUrl
        } as UploadFile
      ]
    } else {
      fileList.value = []
    }

    // 设置时间范围
    if (isEdit && row?.startTime && row?.endTime) {
      timeRange.value = [row.startTime, row.endTime]
    } else {
      timeRange.value = null
    }
  }

  // 上传前校验
  const beforeUpload = (file: File) => {
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

  // 上传成功
  const handleUploadSuccess = (response: any, uploadFile: any) => {
    if ((response.code === '200' || response.code === 200) && response.data) {
      // 更新图片列表中的URL
      const fileIndex = fileList.value.findIndex((file) => file.uid === uploadFile.uid)
      if (fileIndex !== -1) {
        fileList.value[fileIndex].url = response.data.url
      }
      formData.imgUrl = response.data.url
      ElMessage.success('上传成功')
    } else {
      ElMessage.error(response.msg || response.message || '上传失败')
    }
  }

  // 上传失败
  const handleUploadError = (error: Error) => {
    ElMessage.error('上传失败: ' + error.message)
  }

  // 移除图片
  const handleRemove = () => {
    formData.imgUrl = ''
  }

  // 超出限制
  const handleExceed = () => {
    ElMessage.warning('最多只能上传1张图片')
  }

  // 监听时间范围变化
  watch(timeRange, (val) => {
    if (val && val.length === 2) {
      formData.startTime = val[0]
      formData.endTime = val[1]
    } else {
      formData.startTime = ''
      formData.endTime = ''
    }
  })

  // 监听对话框状态变化
  watch(
    () => [props.visible, props.type, props.activityData],
    ([visible]) => {
      if (visible) {
        initFormData()
        nextTick(() => {
          formRef.value?.clearValidate()
        })
      }
    },
    { immediate: true }
  )

  // 提交表单
  const handleSubmit = async () => {
    try {
      if (!formRef.value) return

      const valid = await formRef.value.validate()
      if (!valid) return

      submitLoading.value = true

      if (dialogType.value === 'add') {
        // 新增活动
        await fetchAddActivity(formData)
        ElMessage.success('添加成功')
      } else {
        // 编辑活动 - 后端接口只接收一个包含id的data对象
        await fetchUpdateActivity(formData)
        ElMessage.success('修改成功')
      }

      emit('success')
      emit('submit')
      dialogVisible.value = false
    } catch (error: any) {
      ElMessage.error(error.message || '操作失败')
    } finally {
      submitLoading.value = false
    }
  }
</script>

<style lang="scss" scoped>
  .activity-image-upload {
    .upload-tip {
      margin-top: 8px;
      font-size: 12px;
      color: #909399;
    }

    :deep(.el-upload--picture-card) {
      width: 100px;
      height: 100px;
    }

    :deep(.el-upload-list--picture-card .el-upload-list__item) {
      width: 100px;
      height: 100px;
    }
  }
</style>
