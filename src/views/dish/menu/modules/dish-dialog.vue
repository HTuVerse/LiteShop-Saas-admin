<template>
  <ElDialog v-model="dialogVisible" :title="dialogTitle" width="50%" align-center>
    <div class="dish-dialog-content">
      <ArtForm
        ref="formRef"
        :model-value="formData"
        @update:model-value="(value) => Object.assign(formData, value)"
        :items="formItems"
        :rules="rules"
        :defaultExpanded="true"
        :disabled-submit="submitting"
        labelWidth="100px"
        :span="12"
        :gutter="20"
        @reset="handleReset"
        @submit="handleSubmit"
      >
        <template #dishPics>
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
        </template>
      </ArtForm>
    </div>
  </ElDialog>
</template>

<script setup lang="ts">
  import { uploadRequest } from '@/api/upload'
  import type { FormInstance, FormRules, UploadProps, UploadUserFile } from 'element-plus'
  import { ElMessage, ElDialog, ElUpload } from 'element-plus'
  import { Plus } from '@element-plus/icons-vue'
  import request from '@/utils/http'
  import { fetchGetCategoryPage, fetchGetStoreList } from '@/api/dish-manage'
  import { ref, reactive, computed, watch, onMounted } from 'vue'
  import { useUserStore } from '@/store/modules/user'

  interface Props {
    visible: boolean
    type: string
    dishData?: any
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

  // 对话框标题
  const dialogTitle = computed(() => {
    if (props.type === 'add') return '添加菜品'
    if (props.type === 'edit') return '编辑菜品'
    return ''
  })

  // 表单实例
  const formRef = ref<FormInstance>()
  const submitting = ref(false)

  onMounted(() => {
    fetchCategoryOptions()
  })
  const categoryPage = ref(1)
  const categoryTotal = ref(0)

  const allCategories = ref<Api.Category.CategoryListItem[]>([])
  const fetchCategoryOptions = async () => {
    let page = 1
    const records: Api.Category.CategoryListItem[] = []
    try {
      for (;;) {
        const result = await fetchGetCategoryPage({ currentPage: page, pageSize: 100 })
        records.push(...result.records)
        if (!result.records.length || records.length >= result.total) break
        page++
      }
      allCategories.value = records
    } catch {}
  }
  const categoryOptions = computed(() =>
    allCategories.value
      .filter((item) => String(item.storeId) === String(formData.storeId))
      .map((item) => ({ label: item.categoryName, value: item.id }))
  )

  // 门店选项
  const storeOptions = ref<{ value: number; label: string }[]>([])
  onMounted(async () => {
    try {
      const result = await fetchGetStoreList()
      storeOptions.value = result.records.map((store) => ({
        value: store.id,
        label: store.storeName
      }))
    } catch {}
  })

  // 布尔选项
  const booleanOptions = ref([
    { value: 1, label: '是' },
    { value: 0, label: '否' }
  ])

  // 场景选项
  const sceneOptions = ref([
    { value: 0, label: '在线点餐' },
    { value: 1, label: '预点餐' },
    { value: 2, label: '门店自提' },
    { value: 3, label: '管理员下单' }
  ])

  // 状态选项
  const statusOptions = ref([
    { value: 1, label: '上架' },
    { value: 0, label: '下架' }
  ])

  // 表单数据
  const formData = reactive({
    id: '',
    dishName: '',
    dishDesc: '',
    categoryId: '',
    storeId: '',
    price: '',
    originalPrice: '',
    costPrice: '',
    unit: '',
    stock: '',
    salesCount: 0,
    viewCount: 0,
    isRecommend: 0,
    isHot: 0,
    isNew: 0,
    sceneType: 2,
    saleStatus: 1,
    sortOrder: 0,
    tags: '',
    allergens: '',
    cookingTime: 0,
    dishPics: ''
  })

  // 表单验证规则
  const rules: FormRules = {
    dishName: [
      { required: true, message: '请输入菜品名称', trigger: 'blur' },
      { max: 50, message: '长度在50 个字符内', trigger: 'blur' }
    ],
    categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }],
    storeId: [{ required: true, message: '请选择门店', trigger: 'change' }],
    originalPrice: [{ required: true, message: '请输入原价', trigger: 'blur' }],
    unit: [{ required: true, message: '请输入单位', trigger: 'blur' }],
    stock: [{ required: true, message: '请输入库存', trigger: 'blur' }],
    saleStatus: [{ required: true, message: '请选择销售状态', trigger: 'change' }]
  }

  // 表单项配置
  const formItems = computed(() => [
    {
      label: '菜品名称',
      key: 'dishName',
      type: 'input',
      props: { placeholder: '请输入菜品名称', maxlength: '50' }
    },
    {
      label: '菜品描述',
      key: 'dishDesc',
      type: 'input',
      span: 24,
      props: {
        placeholder: '请输入菜品描述',
        type: 'textarea',
        rows: 2
      }
    },
    {
      label: '菜品图片',
      key: 'dishPics',
      type: 'slot',
      span: 24,
      slotName: 'dishPics'
    },
    {
      label: '分类',
      key: 'categoryId',
      type: 'select',
      props: {
        placeholder: '请选择分类',
        options: categoryOptions.value
      }
    },
    {
      label: '门店',
      key: 'storeId',
      type: 'select',
      props: {
        placeholder: '请选择门店',
        options: storeOptions.value,
        onChange: () => {
          formData.categoryId = ''
        }
      }
    },
    {
      label: '优惠价格',
      key: 'price',
      type: 'number',
      props: {
        placeholder: '请输入价格',
        precision: 2,
        step: 0.1,
        controlsPosition: 'right'
      }
    },
    {
      label: '原价',
      key: 'originalPrice',
      type: 'number',
      props: {
        placeholder: '请输入原价',
        precision: 2,
        step: 0.1,
        min: 0,
        controlsPosition: 'right'
      }
    },
    {
      label: '成本',
      key: 'costPrice',
      type: 'number',
      props: {
        placeholder: '请输入成本',
        precision: 2,
        step: 0.1,
        min: 0,
        controlsPosition: 'right'
      }
    },
    {
      label: '单位',
      key: 'unit',
      type: 'input',
      props: { placeholder: '例如：份、杯' }
    },
    {
      label: '库存',
      key: 'stock',
      type: 'number',
      props: {
        placeholder: '请输入库存',
        min: 0,
        step: 1,
        controlsPosition: 'right'
      }
    },
    {
      label: '制作时间',
      key: 'cookingTime',
      type: 'number',
      props: {
        placeholder: '请输入制作时间(分钟)',
        min: 0,
        step: 1,
        controlsPosition: 'right'
      }
    },
    {
      label: '推荐',
      key: 'isRecommend',
      type: 'select',
      props: {
        placeholder: '是否推荐',
        options: booleanOptions.value
      }
    },
    {
      label: '热门',
      key: 'isHot',
      type: 'select',
      props: {
        placeholder: '是否热门',
        options: booleanOptions.value
      }
    },
    {
      label: '新品',
      key: 'isNew',
      type: 'select',
      props: {
        placeholder: '是否新品',
        options: booleanOptions.value
      }
    },
    {
      label: '场景',
      key: 'sceneType',
      type: 'select',
      props: {
        placeholder: '使用场景',
        options: sceneOptions.value
      }
    },
    {
      label: '状态',
      key: 'saleStatus',
      type: 'select',
      props: {
        placeholder: '销售状态',
        options: statusOptions.value
      }
    },
    {
      label: '排序',
      key: 'sortOrder',
      type: 'number',
      props: {
        placeholder: '请输入排序值',
        min: 0,
        step: 1,
        controlsPosition: 'right'
      }
    },
    {
      label: '标签',
      key: 'tags',
      type: 'input',
      span: 24,
      props: { placeholder: '多个标签用逗号分隔，例如：辣,招牌' }
    },
    {
      label: '过敏原',
      key: 'allergens',
      type: 'input',
      span: 24,
      props: { placeholder: '多个过敏原用逗号分隔，例如：花生,海鲜' }
    }
  ])

  // 初始化表单数据
  const initFormData = () => {
    const isEdit = props.type === 'edit' && props.dishData
    const dish = props.dishData || {}

    Object.assign(formData, {
      id: isEdit ? dish.id : '',
      dishName: isEdit ? dish.dishName : '',
      dishDesc: isEdit ? dish.dishDesc : '',
      categoryId: isEdit ? dish.categoryId : '',
      storeId: isEdit ? dish.storeId : undefined,
      price: isEdit ? dish.price : '',
      originalPrice: isEdit ? dish.originalPrice : 0,
      costPrice: isEdit ? dish.costPrice : 0,
      unit: isEdit ? dish.unit : '份',
      stock: isEdit ? dish.stock : 999,
      salesCount: isEdit ? dish.salesCount : 0,
      viewCount: isEdit ? dish.viewCount : 0,
      isRecommend: isEdit ? (dish.isRecommend == '是' ? 1 : 0) : 0,
      isHot: isEdit ? (dish.isHot == '是' ? 1 : 0) : 0,
      isNew: isEdit ? (dish.isNew == '是' ? 1 : 0) : 0,
      sceneType: isEdit
        ? typeof dish.sceneType === 'number'
          ? dish.sceneType
          : (({ 在线点餐: 0, 预点餐: 1, 门店自提: 2, 管理员下单: 3 } as Record<string, number>)[
              dish.sceneType
            ] ?? 0)
        : 0,
      saleStatus: isEdit ? (dish.saleStatus == '上架' ? 1 : 0) : 1,
      sortOrder: isEdit ? dish.sortOrder : 0,
      tags: isEdit ? dish.tags : '',
      allergens: isEdit ? dish.allergens : '',
      cookingTime: isEdit ? dish.cookingTime : 0,
      dishPics: isEdit ? dish.dishPics : ''
    })

    // 初始化图片列表
    if (isEdit && dish.dishPics) {
      fileList.value = dish.dishPics.split(',').map((url: string, index: number) => ({
        uid: Date.now() + index,
        name: `image-${index + 1}.jpg`,
        url: url.trim()
      }))
    } else {
      fileList.value = []
    }
  }

  // 监听对话框状态变化
  watch(
    () => [props.visible, props.type, props.dishData],
    ([visible]) => {
      if (visible) {
        initFormData()
        // nextTick(() => {
        //   formRef.value?.clearValidate()
        // })
      }
    },
    { immediate: true }
  )

  // 重置表单
  const handleReset = () => {
    initFormData()
  }

  // 提交表单
  const handleSubmit = async () => {
    try {
      if (!formRef.value || submitting.value) return
      // 表单验证
      await formRef.value.validate()
      submitting.value = true

      // 动态配置请求参数
      const { url, method, eventName, successMsg } = getRequestConfig(props.type)

      // 发送请求
      await request[method as 'post' | 'put']({
        url,
        data: formData
      })
      console.log(formData)

      // 处理成功逻辑
      emit(eventName)
      ElMessage.success(successMsg)
      dialogVisible.value = false
      emit('submit')
    } catch (error: any) {
      // 错误处理
      ElMessage.error(error.message || '提交失败')
    } finally {
      submitting.value = false
    }
  }

  // 请求配置工厂
  const getRequestConfig = (type: string) => {
    const configs: Record<string, any> = {
      add: {
        url: '/dish/add',
        method: 'post' as const,
        eventName: 'addSuccess',
        successMsg: '添加菜品成功'
      },
      edit: {
        url: '/dish/update',
        method: 'put' as const,
        eventName: 'editSuccess',
        successMsg: '更新菜品成功'
      }
    }
    return configs[type] || configs.add
  }

  // 图片上传相关
  const fileList = ref<UploadUserFile[]>([])
  const uploadUrl = ref(import.meta.env.VITE_API_URL + '/file-upload/upload/image')
  const userStore = useUserStore()
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
    console.log(response)
    if ((response.code === '200' || response.code === 200) && response.data) {
      // 更新图片列表中的URL
      const fileIndex = fileList.value.findIndex((file) => file.uid === uploadFile.uid)
      if (fileIndex !== -1) {
        fileList.value[fileIndex].url = response.data.url
      }
      // 更新表单数据中的dishPics字段（多张图片用逗号分隔）
      updateDishPics()
      ElMessage.success('图片上传成功')
    } else {
      ElMessage.error(response.msg || response.message || '图片上传失败')
    }
  }

  // 上传失败回调
  const handleUploadError: UploadProps['onError'] = (error: Error) => {
    console.log(uploadUrl.value)
    ElMessage.error('图片上传失败: ' + error.message)
  }

  // 删除图片回调
  const handleRemove: UploadProps['onRemove'] = () => {
    updateDishPics()
  }

  // 超出限制回调
  const handleExceed: UploadProps['onExceed'] = () => {
    ElMessage.warning('最多只能上传5张图片')
  }

  // 更新dishPics字段
  const updateDishPics = () => {
    const urls = fileList.value.filter((file) => file.url).map((file) => file.url)
    formData.dishPics = urls.join(',')
  }
</script>

<style scoped lang="scss">
  .upload-tip {
    margin-top: 8px;
    font-size: 12px;
    line-height: 1.5;
    color: var(--el-text-color-secondary);
  }

  :deep(.el-upload--picture-card) {
    width: 100px;
    height: 100px;
  }

  .dish-dialog-content {
    max-height: 70vh;
    overflow-y: auto;

    // 隐藏滚动条但保持滚动功能
    scrollbar-width: none; // Firefox
    -ms-overflow-style: none; // IE 10+

    &::-webkit-scrollbar {
      display: none; // Chrome, Safari, Edge
    }
  }

  :deep(.el-upload-list--picture-card .el-upload-list__item) {
    width: 100px;
    height: 100px;
  }
</style>
