<template>
  <ElDialog v-model="dialogVisible" :title="dialogTitle" width="50%" align-center>
    <div class="spec-form">
      <!-- 规格基础信息 -->
      <ArtForm ref="formRef" :model="formData" :rules="rules" label-width="100px">
        <ElFormItem label="规格名称" prop="specName">
          <ElInput v-model="formData.specName" placeholder="请输入规格名称，如尺寸、温度" />
        </ElFormItem>
        <ElFormItem label="选择类型" prop="moreSelect">
          <ElRadioGroup
            v-model="formData.moreSelect"
            @change="(value) => handlemoreSelectChange(Number(value))"
          >
            <ElRadio :value="0" label="single">单选</ElRadio>
            <ElRadio :value="1" label="multiple">多选</ElRadio>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem label="是否必选" prop="isRequired">
          <ElRadioGroup
            v-model="formData.isRequired"
            @change="(value) => handleRequiredChange(Number(value))"
          >
            <ElRadio :value="1" label="true">必选</ElRadio>
            <ElRadio :value="0" label="false">可选</ElRadio>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem label="排序值" prop="sortOrder">
          <ElInputNumber v-model="formData.sortOrder" :min="0" :step="1" />
        </ElFormItem>
      </ArtForm>

      <!-- 规格值列表 -->
      <div class="spec-values-section">
        <div class="section-header">
          <h3>规格选项</h3>
          <ElButton type="primary" size="small" @click="addSpecValue">添加选项</ElButton>
        </div>
        <div
          v-if="formData.isRequired === 1 && formData.moreSelect === 0 && defaultValueIndex === -1"
          class="warning-tip"
        >
          <el-icon><WarningFilled /></el-icon>
          <span>必选单选规格需要设置一个默认选中项</span>
        </div>

        <ArtTable :data="specValueRows" border style="width: 100%" :columns="tableColumns">
          <template #tableColumnsSlot1="{ row }">
            <ElInput v-model="row.value" placeholder="如小份、中份、大份" />
          </template>
          <template #tableColumnsSlot2="{ row }">
            <div class="spec-image-container">
              <ElImage
                v-if="row.imageUrl"
                :src="row.imageUrl"
                fit="cover"
                class="spec-image"
                :preview-src-list="[row.imageUrl]"
              >
                <template #error>
                  <div class="image-viewer-slot image-slot">
                    <el-icon><Failed /></el-icon>
                  </div>
                </template>
              </ElImage>
              <ElUpload
                :http-request="uploadRequest"
                :show-file-list="false"
                accept="image/*"
                :on-success="(response: any) => (row.imageUrl = response.data.url)"
                ><ElButton size="small">{{
                  row.imageUrl ? '更换图片' : '上传图片'
                }}</ElButton></ElUpload
              >
            </div>
          </template>
          <template #tableColumnsSlot3="{ row }">
            <ElInputNumber
              v-model="row.extraPrice"
              :precision="2"
              :step="0.1"
              :min="0"
              style="width: 90px"
              controls-position="right"
            />
          </template>
          <template #tableColumnsSlot4="{ row, $index }">
            <!-- 多选模式：使用复选框 -->
            <ElCheckbox
              v-if="formData.moreSelect === 1"
              :model-value="row.isDefault || false"
              @change="handleMultipleDefaultChange($index, Boolean($event))"
            />
            <!-- 单选模式 -->
            <template v-else>
              <!-- 可选单选：使用复选框（可取消） -->
              <ElCheckbox
                v-if="formData.isRequired === 0"
                :model-value="defaultValueIndex === $index"
                @change="handleDefaultChange($index)"
              />
              <!-- 必选单选：使用单选框（不可取消） -->
              <ElRadio
                v-else
                v-model="defaultValueIndex"
                :label="$index"
                @change="handleDefaultChange($index)"
              />
            </template>
          </template>
          <template #tableColumnsSlot5="{ row }">
            <ElInput type="number" style="width: 50px" v-model="row.sortOrder" :min="0" :step="1" />
          </template>
        </ArtTable>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton v-auth="'restaurant:dish:spec'" type="primary" @click="handleSubmit"
          >提交</ElButton
        >
      </div>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { useTable } from '@/hooks/core/useTable'
  import { uploadRequest } from '@/api/upload'
  import type { FormInstance, FormRules } from 'element-plus'
  import {
    ElMessage,
    ElDialog,
    ElButton,
    ElFormItem,
    ElInput,
    ElInputNumber,
    ElRadio,
    ElCheckbox,
    ElRadioGroup
  } from 'element-plus'
  import { Failed, WarningFilled } from '@element-plus/icons-vue'
  import request from '@/utils/http'
  import { h, ref, reactive, computed, watch, nextTick } from 'vue'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'

  interface Props {
    visible: boolean
    type: string
    dishId?: number
    specData?: any
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
    if (props.type === 'addSpec') return '添加规格'
    if (props.type === 'editSpec') return '编辑规格'
    return '菜品规格'
  })

  // 表单实例
  const formRef = ref<FormInstance>()

  // 默认选中的规格值索引
  const defaultValueIndex = ref(-1)

  // 表单数据
  const formData = reactive<Api.Dish.DishSpecOption>({
    dishId: undefined,
    specName: '',
    specValueList: [],
    moreSelect: 0, // 0: 单选, 1: 多选
    isRequired: 0,
    sortOrder: 0,
    id: 0
  })

  // 表单验证规则
  const rules: FormRules = {
    specName: [
      { required: true, message: '请输入规格名称', trigger: 'blur' },
      { max: 30, message: '长度在 2 到 30 个字符', trigger: 'blur' }
    ]
  }

  // 初始化表单数据
  const initFormData = () => {
    const isEdit = props.type === 'editSpec' && props.specData
    const spec = props.specData || {}

    // 重置表单数据
    formData.id = isEdit ? spec.id : ''
    formData.dishId = props.dishId
    formData.specName = isEdit ? spec.specName : ''
    formData.moreSelect = isEdit ? (spec.moreSelect == '是' ? 1 : 0) : 0
    formData.isRequired = isEdit ? (spec.isRequired == '是' ? 1 : 0) : 0
    formData.sortOrder = isEdit ? spec.sortOrder : 0
    formData.specValueList = []

    // 如果是编辑模式，加载规格值
    if (isEdit && spec.specValueList && spec.specValueList.length > 0) {
      formData.specValueList = JSON.parse(JSON.stringify(spec.specValueList))

      // 查找默认选中的规格值
      if (formData.moreSelect === 0) {
        // 单选模式：查找第一个默认选中项
        const defaultIndex = formData.specValueList.findIndex((item) => item.isDefault)
        defaultValueIndex.value = defaultIndex >= 0 ? defaultIndex : -1
      } else {
        // 多选模式：不使用 defaultValueIndex，直接使用各项的 isDefault 属性
        defaultValueIndex.value = -1
      }
    } else {
      // 添加一个默认的空规格值
      addSpecValue()
    }
  }

  // 监听对话框状态变化
  watch(
    () => [props.visible, props.type, props.specData],
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

  // 添加规格值
  const addSpecValue = () => {
    const isFirstValue = formData.specValueList.length === 0

    formData.specValueList.push({
      value: '',
      extraPrice: 0,
      isDefault: isFirstValue && formData.isRequired === 1 && formData.moreSelect === 0, // 必选单选时第一个默认选中
      sortOrder: formData.specValueList.length,
      imageUrl: null
    })

    // 如果是第一个值且为必选单选，设置为默认选中
    if (isFirstValue && formData.isRequired === 1 && formData.moreSelect === 0) {
      defaultValueIndex.value = 0
    }
  }

  // 移除规格值
  const removeSpecValue = (index: number) => {
    // 如果删除的是默认选中的项
    if (index === defaultValueIndex.value) {
      defaultValueIndex.value = -1
    } else if (index < defaultValueIndex.value) {
      // 如果删除的项在默认选中项之前，需要调整默认选中项的索引
      defaultValueIndex.value--
    }

    formData.specValueList.splice(index, 1)

    // 重新排序
    formData.specValueList.forEach((item, idx) => {
      item.sortOrder = idx
    })
  }

  // 处理默认选中变化
  const handleDefaultChange = (index: number) => {
    if (formData.isRequired === 0) {
      // 可选规格：允许取消选中
      if (defaultValueIndex.value === index) {
        // 取消选中
        defaultValueIndex.value = -1
        formData.specValueList.forEach((item) => {
          item.isDefault = false
        })
      } else {
        // 选中新项
        defaultValueIndex.value = index
        formData.specValueList.forEach((item, idx) => {
          item.isDefault = idx === index
        })
      }
    } else {
      // 必选规格：只能切换，不能取消
      defaultValueIndex.value = index
      formData.specValueList.forEach((item, idx) => {
        item.isDefault = idx === index
      })
    }
  }

  // 处理必选/可选切换
  const handleRequiredChange = (value: number) => {
    if (value === 1) {
      // 切换到必选：如果是单选模式且没有默认选中项且有选项，自动选中第一项
      if (
        formData.moreSelect === 0 &&
        defaultValueIndex.value === -1 &&
        formData.specValueList.length > 0
      ) {
        defaultValueIndex.value = 0
        formData.specValueList[0].isDefault = true
      }
    }
    // 切换到可选时保留当前选中状态，不做处理
  }

  // 处理选择类型切换（单选/多选）
  const handlemoreSelectChange = (value: number) => {
    if (value === 0) {
      // 切换到单选：清除所有默认选中，如果是必选则自动选中第一项
      formData.specValueList.forEach((item) => {
        item.isDefault = false
      })
      defaultValueIndex.value = -1

      if (formData.isRequired === 1 && formData.specValueList.length > 0) {
        defaultValueIndex.value = 0
        formData.specValueList[0].isDefault = true
      }
    } else {
      // 切换到多选：保留当前默认选中状态
      // 如果之前有单选的默认值，保留它
      if (defaultValueIndex.value >= 0) {
        formData.specValueList[defaultValueIndex.value].isDefault = true
      }
      defaultValueIndex.value = -1
    }
  }

  // 处理多选模式下的默认选中变化
  const handleMultipleDefaultChange = (index: number, value: boolean) => {
    formData.specValueList[index].isDefault = value
  }

  // 提交表单
  const handleSubmit = async () => {
    try {
      if (!formRef.value) return

      // 表单验证
      await formRef.value.validate()

      // 验证规格值
      if (formData.specValueList.length === 0) {
        ElMessage.warning('请至少添加一个规格选项')
        return
      }

      // 验证规格值是否填写完整
      const emptyValue = formData.specValueList.find((item) => !item.value.trim())
      if (emptyValue) {
        ElMessage.warning('规格选项值不能为空')
        return
      }

      // 必选单选规格必须有默认选中项
      if (
        formData.isRequired === 1 &&
        formData.moreSelect === 0 &&
        defaultValueIndex.value === -1
      ) {
        ElMessage.warning('必选单选规格必须设置一个默认选中项')
        return
      }

      // 同步默认选中状态
      if (formData.moreSelect === 0) {
        // 单选模式：只能有一个默认选中
        if (defaultValueIndex.value >= 0) {
          formData.specValueList.forEach((item, idx) => {
            item.isDefault = idx === defaultValueIndex.value
          })
        } else {
          // 可选规格且没有默认项，所有项都设为非默认
          formData.specValueList.forEach((item) => {
            item.isDefault = false
          })
        }
      }
      // 多选模式：已经通过复选框直接设置了 isDefault，不需要额外处理

      // 动态配置请求参数
      const { url, method, eventName, successMsg } = getRequestConfig(props.type)
      console.log(formData)
      // 发送请求
      await request[method as 'post' | 'put']({
        url,
        data: formData
      })
      // 处理成功逻辑
      emit(eventName)
      ElMessage.success(successMsg)
      dialogVisible.value = false
    } catch (error: any) {
      // 错误处理
      ElMessage.error(error.message || '提交失败')
    }
  }

  // 请求配置工厂
  const getRequestConfig = (type: string) => {
    const configs: Record<string, any> = {
      addSpec: {
        url: '/dish/spec/add',
        method: 'post' as const,
        eventName: 'addSuccess',
        successMsg: '添加规格成功'
      },
      editSpec: {
        url: '/dish/spec/update',
        method: 'put' as const,
        eventName: 'editSuccess',
        successMsg: '更新规格成功'
      }
    }
    return configs[type]
  }

  const { data: specValueRows, columns: tableColumns } = useTable({
    core: {
      dataSource: () => formData.specValueList,
      columnsFactory: () => [
        {
          prop: 'tableColumnsColumn1',
          align: 'center',
          label: '选项值',
          minWidth: 140,
          useSlot: true,
          slotName: 'tableColumnsSlot1'
        },
        {
          prop: 'tableColumnsColumn2',
          align: 'center',
          fit: true,
          label: '菜品图片',
          width: 120,
          useSlot: true,
          slotName: 'tableColumnsSlot2'
        },
        {
          prop: 'tableColumnsColumn3',
          align: 'center',
          label: '额外价格',
          width: 120,
          useSlot: true,
          slotName: 'tableColumnsSlot3'
        },
        {
          prop: 'tableColumnsColumn4',
          align: 'center',
          label: '默认选中',
          width: 80,
          useSlot: true,
          slotName: 'tableColumnsSlot4'
        },
        {
          prop: 'tableColumnsColumn5',
          align: 'center',
          label: '排序',
          width: 80,
          useSlot: true,
          slotName: 'tableColumnsSlot5'
        },
        {
          prop: 'operation',
          align: 'center',
          label: '操作',
          width: 80,
          formatter: (row: Api.Dish.SpecValue) =>
            h(ArtButtonTable, {
              type: 'delete',
              label: '删除规格选项',
              onClick: () => removeSpecValue(formData.specValueList.indexOf(row))
            })
        }
      ]
    }
  })
</script>

<style lang="scss" scoped>
  .spec-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .spec-values-section {
    margin-top: 10px;

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;

      h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--el-text-color-primary);
      }
    }
  }

  .dialog-footer {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }

  .spec-image-container {
    position: relative;
    width: 60px;
    height: 60px;
    margin: 0 auto;

    .spec-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 4px;
    }

    .upload-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      cursor: pointer;
      background-color: #f5f7fa;
      border: 1px dashed #d9d9d9;
      border-radius: 4px;
      transition: all 0.3s;

      &:hover {
        color: var(--el-color-primary);
        border-color: var(--el-color-primary);
      }
    }
  }

  .image-viewer-slot {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: #909399;
    background: #f5f7fa;
  }

  .form-tip {
    margin-top: 4px;
    line-height: 1.5;
  }

  .warning-tip {
    display: flex;
    gap: 6px;
    align-items: center;
    padding: 8px 12px;
    margin-bottom: 10px;
    font-size: 13px;
    color: #f56c6c;
    background-color: #fef0f0;
    border: 1px solid #fde2e2;
    border-radius: 4px;
  }
</style>
