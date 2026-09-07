<template>
  <ElDialog
    v-model="dialogVisible"
    :title="dialogType === 'add' ? '添加餐桌' : '编辑餐桌'"
    width="600px"
    align-center
  >
    <ArtForm ref="formRef" :model="formData" :rules="rules" label-width="100px">
      <ElRow :gutter="20">
        <ElCol :span="12">
          <ElFormItem label="门店" prop="storeId">
            <ElSelect v-model="formData.storeId" placeholder="请选择门店" style="width: 100%">
              <ElOption
                v-for="store in storeList"
                :key="store.id"
                :label="store.storeName"
                :value="store.id"
              />
            </ElSelect>
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
          <ElFormItem label="餐桌编号" prop="tableNumber">
            <ElInput v-model="formData.tableNumber" placeholder="请输入餐桌编号" maxlength="20" />
          </ElFormItem>
        </ElCol>
      </ElRow>

      <ElRow :gutter="20">
        <ElCol :span="12">
          <ElFormItem label="餐桌名称" prop="tableName">
            <ElInput v-model="formData.tableName" placeholder="请输入餐桌名称" maxlength="50" />
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
          <ElFormItem label="座位数" prop="seats">
            <ElInputNumber
              v-model="formData.seats"
              :min="1"
              :max="50"
              placeholder="请输入座位数"
              controls-position="right"
              style="width: 100%"
            />
          </ElFormItem>
        </ElCol>
      </ElRow>

      <ElFormItem label="位置描述" prop="location">
        <ElInput
          v-model="formData.location"
          type="textarea"
          :rows="3"
          placeholder="请输入位置描述，如：大厅靠窗、包间1号等"
          maxlength="200"
          show-word-limit
        />
      </ElFormItem>

      <ElFormItem label="状态" prop="status">
        <ElRadioGroup v-model="formData.status" :disabled="!hasAuth('restaurant:table:status')">
          <ElRadio :value="0">空闲</ElRadio>
          <ElRadio :value="1">使用中</ElRadio>
          <ElRadio :value="2">预留</ElRadio>
          <ElRadio :value="3">停用</ElRadio>
        </ElRadioGroup>
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
  import type { FormInstance, FormRules } from 'element-plus'
  import { ElMessage } from 'element-plus'
  import { fetchGetStoreList, fetchAddTable, fetchUpdateTable } from '@/api/dish-manage'

  interface Props {
    visible: boolean
    type: 'add' | 'edit'
    tableData?: Partial<Api.Table.TableListItem>
  }

  interface Emits {
    (e: 'update:visible', value: boolean): void
    (e: 'submit'): void
    (e: 'addSuccess'): void
    (e: 'editSuccess'): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  // 门店列表
  const storeList = ref<Api.Store.StoreListItem[]>([])

  // 对话框显示控制
  const dialogVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
  })

  const dialogType = computed(() => props.type)

  // 表单实例
  const formRef = ref<FormInstance>()

  // 表单数据
  const formData = reactive<Api.Table.TableFormData>({
    id: undefined,
    storeId: null,
    tableNumber: '',
    tableName: '',
    seats: null,
    location: '',
    status: 0
  })

  // 表单验证规则
  const rules: FormRules = {
    storeId: [{ required: true, message: '请选择门店', trigger: 'change' }],
    tableNumber: [
      { required: true, message: '请输入餐桌编号', trigger: 'blur' },
      { min: 1, max: 20, message: '长度在 1 到 20 个字符', trigger: 'blur' }
    ],
    tableName: [
      { required: true, message: '请输入餐桌名称', trigger: 'blur' },
      { min: 1, max: 50, message: '长度在 1 到 50 个字符', trigger: 'blur' }
    ],
    seats: [{ required: true, message: '请输入座位数', trigger: 'blur' }],
    location: [{ max: 200, message: '长度不能超过 200 个字符', trigger: 'blur' }],
    status: [{ required: true, message: '请选择状态', trigger: 'change' }]
  }

  // 获取门店列表
  const fetchStoreOptions = async () => {
    try {
      const res: any = await fetchGetStoreList()
      // 后端返回的是分页数据,需要取records
      storeList.value = res.records || res
    } catch (err: any) {
      ElMessage.error(err.message || '获取门店列表失败')
    }
  }

  // 初始化表单数据
  const initFormData = () => {
    const isEdit = props.type === 'edit' && props.tableData
    const row = props.tableData

    if (isEdit && row) {
      Object.assign(formData, {
        id: row.id,
        storeId: row.storeId,
        tableNumber: row.tableNumber,
        tableName: row.tableName,
        seats: row.seats,
        location: row.location || '',
        status: getStatusCode(row.status || '空闲')
      })
    } else {
      // 重置为默认值
      Object.assign(formData, {
        id: undefined,
        storeId: null,
        tableNumber: '',
        tableName: '',
        seats: null,
        location: '',
        status: 0
      })
    }
  }

  // 状态文本转换为状态码
  const getStatusCode = (status: Api.Table.TableStatus): number => {
    const statusMap: Record<string, number> = {
      空闲: 0,
      使用中: 1,
      预留: 2,
      停用: 3
    }
    return statusMap[status] ?? 0
  }

  // 统一监听对话框状态变化
  watch(
    () => [props.visible, props.type, props.tableData],
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
        await fetchAddTable(formData)
        emit('addSuccess')
        ElMessage.success('添加成功')
      } else {
        await fetchUpdateTable(formData)
        emit('editSuccess')
        ElMessage.success('修改成功')
      }

      dialogVisible.value = false
      emit('submit')
    } catch (error: any) {
      ElMessage.error(error.message || '操作失败')
    }
  }

  onMounted(() => {
    fetchStoreOptions()
  })
</script>

<style scoped lang="scss">
  .dialog-footer {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }
</style>
