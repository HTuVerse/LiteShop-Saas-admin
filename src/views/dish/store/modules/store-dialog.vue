<template>
  <ElDialog
    v-model="dialogVisible"
    :title="dialogType === 'add' ? '添加门店' : '编辑门店'"
    width="800px"
    align-center
  >
    <ArtForm ref="formRef" :model="formData" :rules="rules" label-width="120px">
      <ElRow :gutter="20">
        <ElCol :span="12">
          <ElFormItem label="门店名称" prop="storeName">
            <ElInput v-model="formData.storeName" placeholder="请输入门店名称" maxlength="50" />
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
          <ElFormItem label="门店编码" prop="storeCode">
            <ElInput v-model="formData.storeCode" placeholder="请输入门店编码" maxlength="20" />
          </ElFormItem>
        </ElCol>
      </ElRow>

      <ElRow :gutter="20">
        <ElCol :span="12">
          <ElFormItem label="联系电话" prop="phone">
            <ElInput v-model="formData.phone" placeholder="请输入联系电话" maxlength="20" />
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
          <ElFormItem label="营业时间" prop="businessHours">
            <ElInput
              v-model="formData.businessHours"
              placeholder="如：09:00-22:00"
              maxlength="50"
            />
          </ElFormItem>
        </ElCol>
      </ElRow>

      <ElFormItem label="门店地址" prop="address">
        <ElInput v-model="formData.address" placeholder="请输入门店地址" maxlength="200" />
      </ElFormItem>

      <ElRow :gutter="20">
        <ElCol :span="12">
          <ElFormItem label="支付模式" prop="paymentMode">
            <ElRadioGroup v-model="formData.paymentMode">
              <ElRadio :value="1">线上支付</ElRadio>
              <ElRadio :value="2">线下支付</ElRadio>
            </ElRadioGroup>
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
          <ElFormItem label="取餐模式" prop="pickupMode">
            <ElRadioGroup v-model="formData.pickupMode">
              <ElRadio :value="0">送上桌</ElRadio>
              <ElRadio :value="1">叫号自取</ElRadio>
            </ElRadioGroup>
          </ElFormItem>
        </ElCol>
      </ElRow>

      <ElRow :gutter="20">
        <ElCol :span="12">
          <ElFormItem label="允许预点单" prop="allowPreOrder">
            <ElRadioGroup v-model="formData.allowPreOrder">
              <ElRadio :value="0">否</ElRadio>
              <ElRadio :value="1">是</ElRadio>
            </ElRadioGroup>
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
          <ElFormItem label="预点单时限" prop="preOrderLimit">
            <ElInputNumber
              v-model="formData.preOrderLimit"
              :min="0"
              :max="1440"
              placeholder="分钟"
              controls-position="right"
              style="width: 100%"
              :disabled="formData.allowPreOrder === 0"
            />
          </ElFormItem>
        </ElCol>
      </ElRow>

      <ElRow :gutter="20">
        <ElCol :span="12">
          <ElFormItem label="小票打印" prop="isPrint">
            <ElRadioGroup v-model="formData.isPrint">
              <ElRadio :value="0">否</ElRadio>
              <ElRadio :value="1">是</ElRadio>
            </ElRadioGroup>
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
          <ElFormItem label="状态" prop="status">
            <ElRadioGroup v-model="formData.status" :disabled="!hasAuth('restaurant:store:status')">
              <ElRadio :value="0">停业</ElRadio>
              <ElRadio :value="1">营业</ElRadio>
            </ElRadioGroup>
          </ElFormItem>
        </ElCol>
      </ElRow>

      <ElRow :gutter="20">
        <ElCol :span="12">
          <ElFormItem label="经度" prop="longitude">
            <ElInputNumber
              v-model="formData.longitude"
              :precision="6"
              placeholder="请输入经度"
              controls-position="right"
              style="width: 100%"
            />
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
          <ElFormItem label="纬度" prop="latitude">
            <ElInputNumber
              v-model="formData.latitude"
              :precision="6"
              placeholder="请输入纬度"
              controls-position="right"
              style="width: 100%"
            />
          </ElFormItem>
        </ElCol>
      </ElRow>

      <ElFormItem label="门店图片" prop="storeImages">
        <div class="store-image-upload">
          <ElUpload
            v-model:file-list="fileList"
            :http-request="uploadRequest"
            :headers="uploadHeaders"
            list-type="picture-card"
            :on-success="handleUploadSuccess"
            :on-error="handleUploadError"
            :on-remove="handleRemove"
            :before-upload="beforeUpload"
            :limit="5"
            :on-exceed="handleExceed"
            accept="image/*"
          >
            <el-icon><Plus /></el-icon>
          </ElUpload>
          <div class="upload-tip">支持上传 jpg/png/gif 格式图片，最多5张，单张不超过2MB</div>
        </div>
      </ElFormItem>

      <ElFormItem label="门店简介" prop="description">
        <ElInput
          v-model="formData.description"
          type="textarea"
          :rows="3"
          placeholder="请输入门店简介"
          maxlength="500"
          show-word-limit
        />
      </ElFormItem>
    </ArtForm>
    <template #footer>
      <div class="dialog-footer">
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="handleSubmit">提交</ElButton>
      </div>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { useAuth } from '@/hooks/core/useAuth'
  const { hasAuth } = useAuth()
  import { uploadRequest } from '@/api/upload'
  import type { FormInstance, FormRules, UploadProps, UploadUserFile } from 'element-plus'
  import { ElMessage, ElUpload } from 'element-plus'
  import { Plus } from '@element-plus/icons-vue'
  import { fetchAddStore, fetchUpdateStore } from '@/api/dish-manage'
  import { useUserStore } from '@/store/modules/user'

  interface Props {
    visible: boolean
    type: 'add' | 'edit'
    storeData?: Partial<Api.Store.StoreListItem>
  }

  interface Emits {
    (e: 'update:visible', value: boolean): void
    (e: 'submit'): void
    (e: 'addSuccess'): void
    (e: 'editSuccess'): void
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

  // 用户store（用于获取token）
  const userStore = useUserStore()

  // 表单数据
  const formData = reactive<Api.Store.StoreFormData>({
    id: undefined,
    storeName: '',
    storeCode: '',
    address: '',
    phone: '',
    businessHours: '',
    paymentMode: 1,
    pickupMode: 0,
    allowPreOrder: 0,
    preOrderLimit: null,
    isPrint: 0,
    status: 1,
    latitude: null,
    longitude: null,
    storeImages: '',
    description: ''
  })

  // 表单验证规则
  const rules: FormRules = {
    storeName: [
      { required: true, message: '请输入门店名称', trigger: 'blur' },
      { min: 1, max: 50, message: '长度在 1 到 50 个字符', trigger: 'blur' }
    ],
    storeCode: [
      { required: true, message: '请输入门店编码', trigger: 'blur' },
      { min: 1, max: 20, message: '长度在 1 到 20 个字符', trigger: 'blur' }
    ],
    phone: [
      { required: true, message: '请输入联系电话', trigger: 'blur' },
      { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式', trigger: 'blur' }
    ],
    address: [
      { required: true, message: '请输入门店地址', trigger: 'blur' },
      { max: 200, message: '长度不能超过 200 个字符', trigger: 'blur' }
    ],
    businessHours: [{ required: true, message: '请输入营业时间', trigger: 'blur' }],
    paymentMode: [{ required: true, message: '请选择支付模式', trigger: 'change' }],
    pickupMode: [{ required: true, message: '请选择取餐模式', trigger: 'change' }],
    allowPreOrder: [{ required: true, message: '请选择是否允许预点单', trigger: 'change' }],
    isPrint: [{ required: true, message: '请选择是否开启小票打印', trigger: 'change' }],
    status: [{ required: true, message: '请选择状态', trigger: 'change' }]
  }

  // ============ 图片上传相关 ============
  const fileList = ref<UploadUserFile[]>([])
  const uploadUrl = ref(import.meta.env.VITE_API_URL + '/file-upload/upload/image')
  const uploadHeaders = computed(() => ({
    satoken: userStore.accessToken || ''
  }))

  // 上传前检查
  const beforeUpload: UploadProps['beforeUpload'] = (rawFile) => {
    const isImage = rawFile.type.startsWith('image/')
    const isLt2M = rawFile.size / 1024 / 1024 < 2

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

  // 上传成功回调
  const handleUploadSuccess: UploadProps['onSuccess'] = (response: any, uploadFile: any) => {
    if ((response.code === '200' || response.code === 200) && response.data) {
      // 更新图片列表中的URL
      const fileIndex = fileList.value.findIndex((file) => file.uid === uploadFile.uid)
      if (fileIndex !== -1) {
        fileList.value[fileIndex].url = response.data.url
      }
      // 更新表单数据中的storeImages字段
      updateStoreImages()
      ElMessage.success('图片上传成功')
    } else {
      ElMessage.error(response.msg || response.message || '图片上传失败')
    }
  }

  // 上传失败回调
  const handleUploadError: UploadProps['onError'] = (error: Error) => {
    ElMessage.error('图片上传失败: ' + error.message)
  }

  // 删除图片回调
  const handleRemove: UploadProps['onRemove'] = () => {
    updateStoreImages()
  }

  // 超出限制回调
  const handleExceed: UploadProps['onExceed'] = () => {
    ElMessage.warning('最多只能上传5张图片')
  }

  // 更新storeImages字段（多张图片用逗号分隔）
  const updateStoreImages = () => {
    const urls = fileList.value.filter((file) => file.url).map((file) => file.url)
    formData.storeImages = urls.join(',')
  }

  // 初始化表单数据
  const initFormData = () => {
    const isEdit = props.type === 'edit' && props.storeData
    const row = props.storeData

    if (isEdit && row) {
      Object.assign(formData, {
        id: row.id,
        storeName: row.storeName,
        storeCode: row.storeCode || '',
        address: row.address || '',
        phone: row.phone || '',
        businessHours: row.businessHours || '',
        paymentMode: getPaymentModeCode(row.paymentMode),
        pickupMode: getPickupModeCode(row.pickupMode),
        allowPreOrder: getAllowPreOrderCode(row.allowPreOrder),
        preOrderLimit: row.preOrderLimit || null,
        isPrint: getIsPrintCode(row.isPrint),
        status: getStatusCode(row.status),
        latitude: row.latitude || null,
        longitude: row.longitude || null,
        storeImages: row.storeImages || '',
        description: row.description || ''
      })

      // 初始化图片列表
      if (row.storeImages) {
        fileList.value = row.storeImages.split(',').map((url: string, index: number) => ({
          uid: Date.now() + index,
          name: `store-image-${index + 1}.jpg`,
          url: url.trim()
        }))
      } else {
        fileList.value = []
      }
    } else {
      // 重置为默认值
      Object.assign(formData, {
        id: undefined,
        storeName: '',
        storeCode: '',
        address: '',
        phone: '',
        businessHours: '',
        paymentMode: 1,
        pickupMode: 0,
        allowPreOrder: 0,
        preOrderLimit: null,
        isPrint: 0,
        status: 1,
        latitude: null,
        longitude: null,
        storeImages: '',
        description: ''
      })
      // 清空图片列表
      fileList.value = []
    }
  }

  // 状态文本转换为状态码
  const getStatusCode = (status?: Api.Store.StoreStatus): number => {
    const statusMap: Record<string, number> = {
      停业: 0,
      营业: 1,
      休息中: 2
    }
    return status ? (statusMap[status] ?? 1) : 1
  }

  // 支付模式文本转换为代码
  const getPaymentModeCode = (mode?: Api.Store.PaymentMode): number => {
    return mode === '线下支付' ? 2 : 1
  }

  // 取餐模式文本转换为代码
  const getPickupModeCode = (mode?: Api.Store.PickupMode): number => {
    return mode === '叫号自取' ? 1 : 0
  }

  // 预点单文本转换为代码
  const getAllowPreOrderCode = (allow?: string): number => {
    return allow === '是' ? 1 : 0
  }

  // 是否打印文本转换为代码（后端返回"是"/"否"，提交需要数字0/1）
  const getIsPrintCode = (isPrint?: string): number => {
    return isPrint === '是' ? 1 : 0
  }

  // 统一监听对话框状态变化
  watch(
    () => [props.visible, props.type, props.storeData],
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

      // 验证表单
      const valid = await formRef.value.validate()
      if (!valid) return

      // 根据类型调用不同的API
      if (dialogType.value === 'add') {
        await fetchAddStore(formData)
        emit('addSuccess')
        ElMessage.success('添加成功')
      } else {
        await fetchUpdateStore(formData)
        emit('editSuccess')
        ElMessage.success('修改成功')
      }

      dialogVisible.value = false
      emit('submit')
    } catch (error: any) {
      ElMessage.error(error.message || '操作失败')
    }
  }
</script>

<style scoped lang="scss">
  .dialog-footer {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }

  .store-image-upload {
    width: 100%;

    .upload-tip {
      margin-top: 8px;
      font-size: 12px;
      line-height: 1.5;
      color: var(--el-text-color-secondary);
    }
  }

  :deep(.el-upload--picture-card) {
    width: 100px;
    height: 100px;
  }

  :deep(.el-upload-list--picture-card .el-upload-list__item) {
    width: 100px;
    height: 100px;
  }
</style>
