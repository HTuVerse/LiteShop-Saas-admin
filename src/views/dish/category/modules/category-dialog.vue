<template>
  <ElDialog
    v-model="dialogVisible"
    :title="dialogTitle"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
    align-center
  >
    <ArtForm ref="formRef" :model="formData" :rules="rules" label-width="100px" status-icon>
      <ElFormItem v-if="headquartersContext" label="分类来源" prop="sourceType">
        <ElSelect
          v-model="formData.sourceType"
          :disabled="type === 'edit'"
          @change="handleSourceChange"
        >
          <ElOption label="总部统一分类" :value="0" />
          <ElOption label="门店自建分类" :value="1" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem
        v-if="headquartersContext && formData.sourceType === 1"
        label="所属门店"
        prop="storeId"
        ><ElSelect
          v-model="formData.storeId"
          @change="formData.parentId = 0"
          filterable
          placeholder="请选择门店"
          ><ElOption
            v-for="store in stores"
            :key="store.id"
            :value="store.id"
            :label="store.storeName" /></ElSelect
      ></ElFormItem>
      <ElFormItem label="分类名称" prop="categoryName">
        <ElInput
          v-model="formData.categoryName"
          placeholder="请输入分类名称"
          maxlength="50"
          show-word-limit
          clearable
        />
      </ElFormItem>

      <ElFormItem label="分类描述" prop="categoryDesc">
        <ElInput
          v-model="formData.categoryDesc"
          type="textarea"
          :rows="3"
          placeholder="请输入分类描述"
          maxlength="200"
          show-word-limit
        />
      </ElFormItem>

      <ElFormItem label="分类图标" prop="categoryIcon">
        <ArtIconPicker v-model="formData.categoryIcon" allow-image />
      </ElFormItem>

      <ElFormItem label="分类层级" prop="level">
        <ElSelect
          v-model="formData.level"
          placeholder="请选择分类层级"
          clearable
          style="width: 100%"
        >
          <ElOption label="一级分类" :value="1" />
          <ElOption label="二级分类" :value="2" />
        </ElSelect>
      </ElFormItem>

      <ElFormItem label="父分类" prop="parentId" v-if="formData.level === 2">
        <ElSelect
          v-model="formData.parentId"
          placeholder="请选择父分类"
          clearable
          style="width: 100%"
        >
          <ElOption
            v-for="item in parentCategoryList"
            :key="item.id"
            :label="item.categoryName"
            :value="item.id"
          />
        </ElSelect>
        <div v-if="categoryTotal > categoryList.length" class="load-more-wrap">
          <ElButton plain type="primary" :loading="loadingMore" @click="emit('load-more')">
            {{
              loadingMore
                ? '加载中...'
                : `加载更多（已显示 ${categoryList.length}/${categoryTotal}）`
            }}
          </ElButton>
        </div>
      </ElFormItem>

      <ElFormItem label="排序" prop="sortOrder">
        <ElInputNumber
          v-model="formData.sortOrder"
          :min="0"
          :max="9999"
          placeholder="请输入排序值"
          style="width: 100%"
        />
      </ElFormItem>

      <ElFormItem label="是否显示" prop="isShow">
        <ElSwitch
          v-model="formData.isShow"
          :active-value="1"
          :inactive-value="0"
          active-text="显示"
          inactive-text="隐藏"
        />
      </ElFormItem>

      <ElFormItem label="分类图片" prop="categoryPic">
        <ElInput v-model="formData.categoryPic" placeholder="请输入分类图片URL" clearable
          @input="formData.categoryImageResourceId = undefined">
          <template #append>
            <ElUpload
              :http-request="uploadRequest"
              :show-file-list="false"
              accept="image/*"
              :on-success="(response: any) => { formData.categoryPic = response.data.url; formData.categoryImageResourceId = String(response.data.id) }"
              ><ElButton>上传图片</ElButton></ElUpload
            >
          </template>
        </ElInput>
        <ElButton @click="pickerVisible = true">从资源库选择</ElButton>
        <div v-if="formData.categoryPic" style="margin-top: 10px">
          <ElImage
            :src="formData.categoryPic"
            fit="cover"
            style="width: 100px; height: 100px; border-radius: 4px"
            :preview-src-list="[formData.categoryPic]"
          />
        </div>
      </ElFormItem>
    </ArtForm>

    <ResourcePicker v-model="pickerVisible" @select="selectResource" />
    <template #footer>
      <ElSpace>
        <ElButton @click="handleClose">取消</ElButton>
        <ElButton type="primary" :loading="submitLoading" @click="handleSubmit">
          {{ submitLoading ? '提交中...' : '确定' }}
        </ElButton>
      </ElSpace>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { uploadRequest } from '@/api/upload'
  import ResourcePicker from '@/components/business/ResourcePicker.vue'
  import type { ResourceFile } from '@/api/resource-library'
  import {
    ElDialog,
    ElFormItem,
    ElInput,
    ElButton,
    ElSpace,
    ElMessage,
    ElSelect,
    ElOption,
    ElSwitch,
    ElInputNumber,
    ElImage,
    type FormInstance,
    type FormRules
  } from 'element-plus'
  import { ref, computed, watch } from 'vue'
  const pickerVisible = ref(false)
  const selectResource = (file: ResourceFile) => {
    if (!file.url) return
    formData.value.categoryPic = file.url
    formData.value.categoryImageResourceId = file.id
  }
  import { fetchAddCategory, fetchUpdateCategory, fetchGetStoreList } from '@/api/dish-manage'
  // import ArtIconSelector from '@/components/core/base/art-icon-selector/index.vue'

  interface Props {
    visible: boolean
    type: 'add' | 'edit'
    categoryData?: Api.Category.CategoryListItem | Record<string, any>
    categoryList?: Api.Category.CategoryListItem[]
    categoryTotal?: number
    loadingMore?: boolean
    headquartersContext?: boolean
    defaultStoreId?: string | number
  }

  interface Emits {
    (e: 'update:visible', value: boolean): void
    (e: 'submit'): void
    (e: 'addSuccess'): void
    (e: 'editSuccess'): void
    (e: 'load-more'): void
  }

  const props = withDefaults(defineProps<Props>(), {
    visible: false,
    type: 'add',
    categoryData: () => ({}),
    categoryList: () => [],
    categoryTotal: 0,
    loadingMore: false,
    headquartersContext: false
  })

  const emit = defineEmits<Emits>()

  // 对话框显示状态
  const dialogVisible = computed({
    get: () => props.visible,
    set: (val) => emit('update:visible', val)
  })

  // 对话框标题
  const dialogTitle = computed(() => {
    return props.type === 'add' ? '添加分类' : '编辑分类'
  })

  // 父分类列表（只显示一级分类）
  const parentCategoryList = computed(() => {
    return props.categoryList.filter(
      (item) =>
        item.level === 1 &&
        (formData.value.sourceType === 0
          ? item.sourceType === 0 || !item.storeId
          : item.sourceType === 0 ||
            !item.storeId ||
            String(item.ownerStoreId || item.storeId) === String(formData.value.storeId))
    )
  })

  const stores = ref<Api.Store.StoreListItem[]>([])
  onMounted(async () => {
    try {
      stores.value = (await fetchGetStoreList()).records
    } catch {
      stores.value = []
    }
  })
  // 表单引用
  const formRef = ref<FormInstance>()
  const submitLoading = ref(false)

  // 表单数据
  const formData = ref<Api.Category.CategoryFormData>({
    sourceType: 0,
    categoryName: '',
    categoryDesc: '',
    categoryIcon: '',
    categoryPic: '',
    categoryImageResourceId: undefined,
    parentId: 0,
    level: 1,
    sortOrder: 0,
    isShow: 1
  })

  // 表单验证规则
  const rules = computed<FormRules>(() => ({
    sourceType: [{ required: true, message: '请选择分类来源', trigger: 'change' }],
    storeId: [
      { required: formData.value.sourceType === 1, message: '请选择门店', trigger: 'change' }
    ],
    categoryName: [
      { required: true, message: '请输入分类名称', trigger: 'blur' },
      { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
    ],
    level: [{ required: true, message: '请选择分类层级', trigger: 'change' }],
    parentId: [
      {
        required: true,
        message: '请选择父分类',
        trigger: 'change',
        validator: (rule, value, callback) => {
          if (formData.value.level === 2 && !value) {
            callback(new Error('二级分类必须选择父分类'))
          } else {
            callback()
          }
        }
      }
    ]
  }))

  // 监听分类数据变化
  watch(
    () => props.categoryData,
    (newVal) => {
      if (newVal && Object.keys(newVal).length > 0) {
        formData.value = {
          ...formData.value,
          ...newVal
        }
      } else {
        resetForm()
      }
    },
    { immediate: true, deep: true }
  )

  // 监听层级变化，重置父分类
  watch(
    () => formData.value.level,
    (newVal) => {
      if (newVal === 1) {
        formData.value.parentId = 0
      }
    }
  )

  // 重置表单
  function resetForm() {
    formData.value = {
      sourceType: props.headquartersContext ? 0 : 1,
      storeId:
        props.headquartersContext || props.defaultStoreId == null
          ? undefined
          : Number(props.defaultStoreId),
      ownerStoreId:
        props.headquartersContext || props.defaultStoreId == null
          ? undefined
          : Number(props.defaultStoreId),
      categoryName: '',
      categoryDesc: '',
      categoryIcon: '',
      categoryPic: '',
      categoryImageResourceId: undefined,
      parentId: 0,
      level: 1,
      sortOrder: 0,
      isShow: 1
    }
    formRef.value?.clearValidate()
  }

  const handleSourceChange = () => {
    formData.value.storeId = undefined
    formData.value.ownerStoreId = undefined
    formData.value.parentId = 0
  }

  // 处理关闭
  const handleClose = () => {
    resetForm()
    dialogVisible.value = false
  }

  // 处理提交
  const handleSubmit = async () => {
    if (!formRef.value) return

    try {
      await formRef.value.validate()
      submitLoading.value = true

      // 准备提交数据
      const submitData = { ...formData.value }
      submitData.ownerStoreId = submitData.sourceType === 1 ? submitData.storeId : undefined
      if (submitData.sourceType === 0) submitData.storeId = undefined

      // 如果是一级分类，parentId设置为0
      if (submitData.level === 1) {
        submitData.parentId = 0
      }

      if (props.type === 'add') {
        await fetchAddCategory(submitData)
        ElMessage.success('添加分类成功')
        emit('addSuccess')
      } else {
        await fetchUpdateCategory(submitData)
        ElMessage.success('更新分类成功')
        emit('editSuccess')
      }

      emit('submit')
      handleClose()
    } catch (error: any) {
      if (error?.message) {
        ElMessage.error(error.message)
      }
    } finally {
      submitLoading.value = false
    }
  }
</script>

<style scoped lang="scss">
  :deep(.el-input-number) {
    width: 100%;
  }

  .load-more-wrap {
    margin-top: 4px;
  }
</style>
