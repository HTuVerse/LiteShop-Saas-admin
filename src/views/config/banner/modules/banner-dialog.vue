<!-- 轮播图编辑弹窗 -->
<template>
  <ElDialog
    v-model="dialogVisible"
    :title="dialogType === 'add' ? '添加轮播图' : '编辑轮播图'"
    width="600px"
    align-center
    @close="handleClose"
  >
    <ArtForm ref="formRef" :model="formData" :rules="rules" label-width="100px">
      <ElFormItem label="轮播图位置" prop="position">
        <ElSelect v-model="formData.position" placeholder="请选择位置" style="width: 100%">
          <ElOption
            v-for="item in positionOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </ElSelect>
      </ElFormItem>

      <ElFormItem label="标题" prop="title">
        <ElInput v-model="formData.title" placeholder="请输入标题（可选）" maxlength="100" />
      </ElFormItem>

      <ElFormItem label="轮播图片" prop="imageUrl">
        <div class="banner-image-upload">
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
          <div class="upload-tip">建议尺寸 750x340，支持 jpg/png 格式，不超过2MB</div>
        </div>
      </ElFormItem>

      <ElFormItem label="跳转类型" prop="linkType">
        <ElRadioGroup v-model="formData.linkType">
          <ElRadio :value="3">不跳转</ElRadio>
          <ElRadio :value="1">小程序页面</ElRadio>
          <ElRadio :value="2">H5链接</ElRadio>
        </ElRadioGroup>
      </ElFormItem>

      <ElFormItem v-if="formData.linkType !== 3" label="跳转链接" prop="linkUrl">
        <ElInput
          v-model="formData.linkUrl"
          :placeholder="
            formData.linkType === 1
              ? '请输入小程序页面路径，如 /pages/index/index'
              : '请输入H5链接地址'
          "
          maxlength="500"
        />
      </ElFormItem>

      <ElRow :gutter="20">
        <ElCol :span="12">
          <ElFormItem label="排序" prop="sortOrder">
            <ElInputNumber
              v-model="formData.sortOrder"
              :min="0"
              :max="999"
              placeholder="排序值"
              controls-position="right"
              style="width: 100%"
            />
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
          <ElFormItem label="状态" prop="status">
            <ElRadioGroup v-model="formData.status" :disabled="!hasAuth('config:banner:status')">
              <ElRadio :value="1">启用</ElRadio>
              <ElRadio :value="0">禁用</ElRadio>
            </ElRadioGroup>
          </ElFormItem>
        </ElCol>
      </ElRow>

      <ElFormItem label="展示时间">
        <ElDatePicker
          v-model="timeRange"
          type="datetimerange"
          range-separator="至"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          value-format="YYYY-MM-DD HH:mm:ss"
          style="width: 100%"
        />
        <div class="time-tip">不设置则永久展示</div>
      </ElFormItem>

      <ElFormItem label="备注" prop="remark">
        <ElInput
          v-model="formData.remark"
          type="textarea"
          :rows="2"
          placeholder="请输入备注（可选）"
          maxlength="500"
        />
      </ElFormItem>
    </ArtForm>

    <template #footer>
      <ElButton @click="handleClose">取消</ElButton>
      <ElButton type="primary" :loading="submitLoading" @click="handleSubmit">确定</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { useAuth } from '@/hooks/core/useAuth'
  const { hasAuth } = useAuth()
  import { uploadRequest } from '@/api/upload'
  import { ElMessage, type FormInstance, type FormRules, type UploadFile } from 'element-plus'
  import { Plus } from '@element-plus/icons-vue'
  import { fetchAddBanner, fetchUpdateBanner } from '@/api/config-manage'
  import { useUserStore } from '@/store/modules/user'

  type Banner = Api.Config.Banner
  type BannerFormData = Api.Config.BannerFormData

  const props = defineProps<{
    type: 'add' | 'edit'
    bannerData: Partial<Banner>
  }>()

  const emit = defineEmits<{
    'update:visible': [value: boolean]
    submit: []
    addSuccess: []
    editSuccess: []
  }>()

  const dialogVisible = defineModel<boolean>('visible', { required: true })
  const dialogType = computed(() => props.type)

  const userStore = useUserStore()
  const formRef = ref<FormInstance>()
  const submitLoading = ref(false)

  // 上传配置（与 dish-dialog 保持一致）
  const uploadUrl = import.meta.env.VITE_API_URL + '/file-upload/upload/image'
  const uploadHeaders = computed(() => ({
    satoken: userStore.accessToken || ''
  }))

  // 文件列表
  const fileList = ref<UploadFile[]>([])

  // 时间范围
  const timeRange = ref<[string, string] | null>(null)

  // 表单数据
  const formData = ref<BannerFormData>({
    position: 1,
    title: '',
    imageUrl: '',
    linkType: 3,
    linkUrl: '',
    sortOrder: 0,
    status: 1,
    startTime: undefined,
    endTime: undefined,
    remark: ''
  })

  // 位置选项
  const positionOptions = [
    { label: '首页轮播图', value: 1 },
    { label: '点餐页轮播图', value: 2 },
    { label: '个人中心轮播图', value: 3 },
    { label: '活动页轮播图', value: 4 }
  ]

  // 位置描述映射到code
  const positionDescToCode: Record<string, number> = {
    首页轮播图: 1,
    点餐页轮播图: 2,
    个人中心轮播图: 3,
    活动页轮播图: 4
  }

  // 表单验证规则
  const rules: FormRules = {
    position: [{ required: true, message: '请选择轮播图位置', trigger: 'change' }],
    imageUrl: [{ required: true, message: '请上传轮播图片', trigger: 'change' }]
  }

  // 监听弹窗显示，初始化数据
  watch(dialogVisible, (val) => {
    if (val) {
      if (props.type === 'edit' && props.bannerData.id) {
        // 编辑模式，回填数据
        formData.value = {
          id: props.bannerData.id,
          position: positionDescToCode[props.bannerData.position || ''] || 1,
          title: props.bannerData.title || '',
          imageUrl: props.bannerData.imageUrl || '',
          linkType: props.bannerData.linkType || 3,
          linkUrl: props.bannerData.linkUrl || '',
          sortOrder: props.bannerData.sortOrder || 0,
          status: props.bannerData.status === '是' ? 1 : 0,
          startTime: props.bannerData.startTime,
          endTime: props.bannerData.endTime,
          remark: props.bannerData.remark || ''
        }
        // 回填图片
        if (props.bannerData.imageUrl) {
          fileList.value = [
            {
              name: 'banner',
              url: props.bannerData.imageUrl
            } as UploadFile
          ]
        }
        // 回填时间范围
        if (props.bannerData.startTime && props.bannerData.endTime) {
          timeRange.value = [props.bannerData.startTime, props.bannerData.endTime]
        } else {
          timeRange.value = null
        }
      } else {
        // 新增模式，重置数据
        resetForm()
      }
    }
  })

  /**
   * 重置表单
   */
  const resetForm = () => {
    formData.value = {
      position: 1,
      title: '',
      imageUrl: '',
      linkType: 3,
      linkUrl: '',
      sortOrder: 0,
      status: 1,
      startTime: undefined,
      endTime: undefined,
      remark: ''
    }
    fileList.value = []
    timeRange.value = null
    formRef.value?.resetFields()
  }

  /**
   * 上传前校验
   */
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

  /**
   * 上传成功（与 dish-dialog 一致：取 response.data.url）
   */
  const handleUploadSuccess = (response: any) => {
    if ((response.code === '200' || response.code === 200) && response.data) {
      formData.value.imageUrl = response.data.url ?? response.data
      ElMessage.success('上传成功')
    } else {
      ElMessage.error(response.msg || '上传失败')
    }
  }

  /**
   * 上传失败
   */
  const handleUploadError = () => {
    ElMessage.error('上传失败，请重试')
  }

  /**
   * 移除图片
   */
  const handleRemove = () => {
    formData.value.imageUrl = ''
  }

  /**
   * 超出限制
   */
  const handleExceed = () => {
    ElMessage.warning('最多只能上传1张图片')
  }

  /**
   * 提交表单
   */
  const handleSubmit = async () => {
    try {
      await formRef.value?.validate()

      submitLoading.value = true

      // 处理时间范围
      if (timeRange.value && timeRange.value.length === 2) {
        formData.value.startTime = timeRange.value[0]
        formData.value.endTime = timeRange.value[1]
      } else {
        formData.value.startTime = undefined
        formData.value.endTime = undefined
      }

      if (dialogType.value === 'add') {
        await fetchAddBanner(formData.value)
        ElMessage.success('添加成功')
        emit('addSuccess')
      } else {
        await fetchUpdateBanner(formData.value)
        ElMessage.success('更新成功')
        emit('editSuccess')
      }

      emit('submit')
      dialogVisible.value = false
    } catch (error: any) {
      if (error !== 'cancel') {
        ElMessage.error(error.message || '操作失败')
      }
    } finally {
      submitLoading.value = false
    }
  }

  /**
   * 关闭弹窗
   */
  const handleClose = () => {
    dialogVisible.value = false
    resetForm()
  }
</script>

<style lang="scss" scoped>
  .banner-image-upload {
    .upload-tip {
      margin-top: 8px;
      font-size: 12px;
      color: #909399;
    }

    :deep(.el-upload--picture-card) {
      width: 178px;
      height: 100px;
    }

    :deep(.el-upload-list--picture-card .el-upload-list__item) {
      width: 178px;
      height: 100px;
    }
  }

  .time-tip {
    margin-top: 4px;
    font-size: 12px;
    color: #909399;
  }
</style>
