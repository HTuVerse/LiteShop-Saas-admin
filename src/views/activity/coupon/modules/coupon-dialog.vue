<!-- 优惠券编辑弹窗 -->
<template>
  <ElDialog
    v-model="dialogVisible"
    :title="dialogType === 'add' ? '新增优惠券' : '编辑优惠券'"
    width="600px"
    align-center
    destroy-on-close
  >
    <ArtForm ref="formRef" :model="formData" :rules="rules" label-width="100px">
      <ElFormItem label="优惠券名称" prop="name">
        <ElInput
          v-model="formData.name"
          placeholder="请输入优惠券名称"
          maxlength="50"
          show-word-limit
        />
      </ElFormItem>

      <ElFormItem label="优惠券类型" prop="type">
        <ElRadioGroup v-model="formData.type" @change="(value) => handleTypeChange(Number(value))">
          <ElRadio :value="0">满减券</ElRadio>
          <ElRadio :value="1">整单折扣券</ElRadio>
          <ElRadio :value="2">菜品免单券</ElRadio>
        </ElRadioGroup>
      </ElFormItem>

      <ElFormItem v-if="formData.type !== 2" :label="valueLabel" prop="value">
        <ElInputNumber
          v-model="formData.value"
          :min="formData.type === 1 ? 0.01 : 0.01"
          :max="formData.type === 1 ? 0.99 : 99999"
          :precision="2"
          :step="formData.type === 1 ? 0.05 : 1"
          controls-position="right"
          style="width: 200px"
        />
        <span class="form-tip">{{ valueTip }}</span>
      </ElFormItem>

      <ElFormItem label="最低消费" prop="minAmount">
        <ElInputNumber
          v-model="formData.minAmount"
          :min="0"
          :precision="2"
          controls-position="right"
          placeholder="无门槛请填0"
          style="width: 200px"
        />
        <span class="form-tip">元，无门槛请填 0</span>
      </ElFormItem>

      <ElFormItem label="发放总数" prop="totalCount">
        <ElInputNumber
          v-model="formData.totalCount"
          :min="1"
          :max="999999"
          controls-position="right"
          style="width: 200px"
        />
        <span class="form-tip">张</span>
      </ElFormItem>

      <ElFormItem label="有效期" prop="timeRange">
        <ElDatePicker
          v-model="timeRange"
          type="datetimerange"
          range-separator="至"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          format="YYYY-MM-DD HH:mm"
          value-format="YYYY-MM-DD HH:mm:ss"
          style="width: 100%"
        />
      </ElFormItem>

      <ElFormItem label="优惠券描述" prop="description">
        <ElInput
          v-model="formData.description"
          type="textarea"
          placeholder="请输入优惠券描述（如使用条件、适用范围等）"
          :rows="3"
          maxlength="200"
          show-word-limit
        />
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
  import { ref, reactive, computed, watch, nextTick } from 'vue'
  import type { FormInstance, FormRules } from 'element-plus'
  import {
    ElMessage,
    ElDialog,
    ElFormItem,
    ElInput,
    ElButton,
    ElRadioGroup,
    ElRadio,
    ElDatePicker,
    ElInputNumber
  } from 'element-plus'
  import { fetchUpdateCoupon, fetchAddCoupon } from '@/api/coupon-manage'
  import { CouponEnumConverter, getEnumNumber, CouponTypeEnumMap } from '@/utils/enum/enumConverter'

  interface Props {
    visible: boolean
    type: string
    couponData?: Partial<Api.Coupon.CouponListItem>
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

  // 时间范围
  const timeRange = ref<[string, string] | null>(null)

  // 表单数据
  const formData = reactive({
    id: undefined as number | undefined,
    name: '',
    description: '',
    type: 0 as Api.Coupon.CouponType,
    value: 10,
    minAmount: 0,
    totalCount: 100,
    startTime: '',
    endTime: ''
  })

  // 根据类型显示不同的标签和提示（与后端 CouponTypeEnum 一致）
  const valueLabel = computed(() => {
    switch (formData.type) {
      case 0:
        return '满减金额'
      case 1:
        return '折扣率'
      case 2:
        return '' // 菜品免单券无需面值
      default:
        return '面值'
    }
  })

  const valueTip = computed(() => {
    switch (formData.type) {
      case 0:
        return '元，满足最低消费后直接减免'
      case 1:
        return '，如 0.85 表示 85 折'
      case 2:
        return ''
      default:
        return ''
    }
  })

  // 表单验证规则（菜品免单券不需填面值）
  const rules: FormRules = {
    name: [
      { required: true, message: '请输入优惠券名称', trigger: 'blur' },
      { min: 2, max: 50, message: '优惠券名称长度在 2 到 50 个字符', trigger: 'blur' }
    ],
    type: [{ required: true, message: '请选择优惠券类型', trigger: 'change' }],
    value: [
      {
        required: true,
        validator: (_rule: any, val: number, callback: (e?: Error) => void) => {
          if (formData.type === 2) return callback()
          if (val === undefined || val === null || (typeof val === 'number' && val <= 0))
            return callback(new Error('请输入面值'))
          callback()
        },
        trigger: 'blur'
      }
    ],
    totalCount: [{ required: true, message: '请输入发放总数', trigger: 'blur' }]
  }

  // 类型改变时重置面值（与后端 0-满减 1-整单折扣 2-菜品免单 一致）
  const handleTypeChange = (type: number) => {
    if (type === 1) {
      formData.value = 0.9
    } else if (type === 2) {
      formData.value = 0 // 菜品免单券不使用 value
    } else {
      formData.value = 10
    }
  }

  // 初始化表单数据
  const initFormData = () => {
    const isEdit = props.type === 'edit' && props.couponData
    const row = props.couponData

    // 处理 type 字段：后端返回文字（如"满减券"），需要转换为数字
    let typeValue = 0
    if (isEdit && row?.type !== undefined) {
      // 如果是字符串（后端返回的文字），转换为数字
      typeValue = getEnumNumber(row.type as string | number, CouponTypeEnumMap) ?? 0
    }

    Object.assign(formData, {
      id: isEdit ? row?.id : undefined,
      name: isEdit ? row?.name || '' : '',
      description: isEdit ? row?.description || '' : '',
      type: typeValue,
      value: isEdit ? row?.value ?? 10 : 10,
      minAmount: isEdit ? row?.minAmount ?? 0 : 0,
      totalCount: isEdit ? row?.totalCount ?? 100 : 100,
      startTime: isEdit ? row?.startTime || '' : '',
      endTime: isEdit ? row?.endTime || '' : ''
    })

    // 设置时间范围
    if (isEdit && row?.startTime && row?.endTime) {
      timeRange.value = [row.startTime, row.endTime]
    } else {
      timeRange.value = null
    }
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
    () => [props.visible, props.type, props.couponData],
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

  // 构建提交数据：后端枚举字段需传数字（type/status/stackable）
  const buildSubmitPayload = (): Api.Coupon.CouponFormData => {
    const typeNum = getEnumNumber(formData.type as string | number, CouponTypeEnumMap) ?? 0
    return {
      id: formData.id,
      name: formData.name,
      description: formData.description || undefined,
      type: typeNum as Api.Coupon.CouponType,
      value: typeNum === 2 ? 0 : Number(formData.value),
      minAmount: formData.minAmount ?? 0,
      totalCount: formData.totalCount,
      startTime: formData.startTime || undefined,
      endTime: formData.endTime || undefined
    }
  }

  // 提交表单
  const handleSubmit = async () => {
    try {
      if (!formRef.value) return

      const valid = await formRef.value.validate()
      if (!valid) return

      submitLoading.value = true
      const payload = buildSubmitPayload()

      if (dialogType.value === 'add') {
        await fetchAddCoupon(payload)
        ElMessage.success('添加成功')
      } else {
        await fetchUpdateCoupon(payload)
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
  .form-tip {
    margin-left: 10px;
    font-size: 12px;
    color: #909399;
  }
</style>
