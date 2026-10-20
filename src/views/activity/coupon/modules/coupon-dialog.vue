<!-- 优惠券编辑弹窗 -->
<template>
  <ElDialog
    v-model="dialogVisible"
    :title="dialogType === 'add' ? '新增优惠券' : '编辑优惠券'"
    width="700px"
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
          <ElRadio :value="3">菜品折扣券</ElRadio>
        </ElRadioGroup>
      </ElFormItem>

      <ElFormItem v-if="formData.type !== 2" :label="valueLabel" prop="value">
        <ElInputNumber
          v-model="formData.value"
          :min="[1, 3].includes(formData.type) ? 0.01 : 0.01"
          :max="[1, 3].includes(formData.type) ? 0.99 : 99999"
          :precision="2"
          :step="[1, 3].includes(formData.type) ? 0.05 : 1"
          controls-position="right"
          style="width: 200px"
        />
        <span class="form-tip">{{ valueTip }}</span>
      </ElFormItem>

      <ElFormItem v-if="[2, 3].includes(formData.type)" :label="formData.type === 2 ? '可免单菜品' : '可折扣菜品'" prop="dishIds">
        <ElSelect
          v-model="formData.dishIds"
          multiple
          filterable
          remote
          reserve-keyword
          :remote-method="searchDishOptions"
          :loading="dishLoading"
          :placeholder="formData.type === 2 ? '输入菜品名称，任选一种免一份' : '输入菜品名称，每单任选一份打折'"
          style="width: 100%"
        >
          <ElOption
            v-for="dish in dishOptions"
            :key="String(dish.id)"
            :label="dish.dishName"
            :value="String(dish.id)"
          />
        </ElSelect>
        <span class="form-tip">订单中命中多个菜品时，自动优惠价格最高的一份。</span>
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

      <ElFormItem v-if="dialogType === 'add'" label="发放总数" prop="totalCount">
        <ElInputNumber
          v-model="formData.totalCount"
          :min="1"
          :max="999999"
          controls-position="right"
          style="width: 200px"
        />
        <span class="form-tip">张</span>
      </ElFormItem>

      <ElFormItem v-else label="剩余库存">
        <span>{{ couponData?.remainCount ?? 0 }} 张；请在列表使用“调整库存”增减。</span>
      </ElFormItem>

      <ElFormItem label="适用门店">
        <ElSelect v-model="formData.storeIds" multiple filterable remote reserve-keyword
          :remote-method="searchStoreOptions" :loading="storeLoading"
          placeholder="不选表示全部门店；输入名称搜索" style="width: 100%">
          <ElOption v-for="store in storeOptions" :key="String(store.id)"
            :label="store.storeName" :value="String(store.id)" />
        </ElSelect>
      </ElFormItem>

      <ElFormItem label="可用星期">
        <ElCheckboxGroup v-model="formData.useWeekdays">
          <ElCheckbox v-for="day in weekdays" :key="day.value" :value="day.value" :label="day.label" />
        </ElCheckboxGroup>
        <span class="form-tip">不选表示每天可用</span>
      </ElFormItem>

      <ElFormItem label="每日时段">
        <ElTimePicker v-model="formData.useStartTime" value-format="HH:mm:ss" format="HH:mm"
          placeholder="开始时间" style="width: 145px" />
        <span style="margin: 0 8px">至</span>
        <ElTimePicker v-model="formData.useEndTime" value-format="HH:mm:ss" format="HH:mm"
          placeholder="结束时间" style="width: 145px" />
        <span class="form-tip">都不填表示全天</span>
      </ElFormItem>

      <ElFormItem label="生效时间" prop="startTime">
        <ElDatePicker
          v-model="formData.startTime"
          type="datetime"
          placeholder="请选择生效时间"
          format="YYYY-MM-DD HH:mm"
          value-format="YYYY-MM-DD HH:mm:ss"
          style="width: 100%"
        />
      </ElFormItem>

      <ElFormItem label="截止方式">
        <ElCheckbox v-model="longTerm">长期有效</ElCheckbox>
      </ElFormItem>

      <ElFormItem v-if="!longTerm" label="结束时间" prop="endTime">
        <ElDatePicker v-model="formData.endTime" type="datetime" placeholder="请选择结束时间"
          format="YYYY-MM-DD HH:mm" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
      </ElFormItem>

      <ElFormItem label="叠加使用">
        <ElRadioGroup v-model="formData.stackable" @change="(value) => { if (Number(value) === 0) formData.stackWithCouponIds = [] }">
          <ElRadio :value="0">不可叠加</ElRadio>
          <ElRadio :value="1">可与指定券叠加</ElRadio>
        </ElRadioGroup>
      </ElFormItem>

      <ElFormItem v-if="formData.stackable === 1" label="可叠加券" prop="stackWithCouponIds">
        <ElSelect v-model="formData.stackWithCouponIds" multiple filterable remote reserve-keyword
          :remote-method="searchStackOptions" :loading="stackLoading"
          placeholder="输入优惠券名称搜索；不选表示暂不可与其他券叠加" style="width: 100%">
          <ElOption v-for="coupon in stackOptions" :key="String(coupon.id)"
            :label="coupon.name" :value="String(coupon.id)" />
        </ElSelect>
        <span class="form-tip">选择后双向生效；对方也必须开启叠加使用。每单同一券模板限一张。</span>
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
    ElInputNumber,
    ElTimePicker,
    ElCheckboxGroup,
    ElCheckbox,
    ElSelect,
    ElOption
  } from 'element-plus'
  import {
    fetchUpdateCoupon,
    fetchAddCoupon,
    fetchGetCouponDetail,
    fetchGetCouponList,
    fetchCouponDishOptions,
    fetchCouponDishDetail
  } from '@/api/coupon-manage'
  import { fetchGetStorePageList, fetchGetStoreDetail } from '@/api/dish-manage'
  import { getEnumNumber, CouponTypeEnumMap } from '@/utils/enum/enumConverter'

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
  const dishLoading = ref(false)
  const dishOptions = ref<Api.Dish.DishListItem[]>([])
  const storeLoading = ref(false)
  const storeOptions = ref<Api.Store.StoreListItem[]>([])
  const stackLoading = ref(false)
  const stackOptions = ref<Api.Coupon.CouponListItem[]>([])
  const longTerm = ref(false)
  const weekdays = [
    { value: 1, label: '周一' }, { value: 2, label: '周二' }, { value: 3, label: '周三' },
    { value: 4, label: '周四' }, { value: 5, label: '周五' }, { value: 6, label: '周六' },
    { value: 7, label: '周日' }
  ]
  let dishSearchSeq = 0
  let storeSearchSeq = 0
  let stackSearchSeq = 0

  const searchStackOptions = async (keyword: string) => {
    const seq = ++stackSearchSeq
    const name = keyword.trim()
    if (!name) return
    stackLoading.value = true
    try {
      const page = await fetchGetCouponList({ name, currentPage: 1, pageSize: 20 })
      if (seq !== stackSearchSeq) return
      const selected = stackOptions.value.filter((item) =>
        formData.stackWithCouponIds.includes(String(item.id)))
      stackOptions.value = [...selected, ...page.records.filter((item) =>
        String(item.id) !== String(formData.id)
        && (item.stackable === 1 || item.stackable === '是')
        && !selected.some((existing) => String(existing.id) === String(item.id)))]
    } finally {
      if (seq === stackSearchSeq) stackLoading.value = false
    }
  }

  const searchStoreOptions = async (keyword: string) => {
    const seq = ++storeSearchSeq
    if (!keyword.trim()) return
    storeLoading.value = true
    try {
      const page = await fetchGetStorePageList({ currentPage: 1, pageSize: 20, storeName: keyword.trim() })
      if (seq === storeSearchSeq) {
        const selected = storeOptions.value.filter((store) => formData.storeIds.includes(String(store.id)))
        storeOptions.value = [...selected, ...page.records.filter((store) =>
          !selected.some((item) => String(item.id) === String(store.id)))]
      }
    } finally {
      if (seq === storeSearchSeq) storeLoading.value = false
    }
  }

  const searchDishOptions = async (keyword: string) => {
    const seq = ++dishSearchSeq
    if (!keyword.trim()) return
    dishLoading.value = true
    try {
      const page = await fetchCouponDishOptions(keyword.trim())
      if (seq === dishSearchSeq) {
        const selected = dishOptions.value.filter((dish) =>
          formData.dishIds.includes(String(dish.id))
        )
        dishOptions.value = [
          ...selected,
          ...page.records.filter(
            (dish) => !selected.some((item) => String(item.id) === String(dish.id))
          )
        ]
      }
    } catch (error) {
      console.error('搜索菜品失败', error)
    } finally {
      if (seq === dishSearchSeq) dishLoading.value = false
    }
  }

  // 表单数据
  const formData = reactive({
    id: undefined as string | number | undefined,
    name: '',
    description: '',
    type: 0 as Api.Coupon.CouponType,
    value: 10,
    minAmount: 0,
    totalCount: 100,
    dishIds: [] as string[],
    storeIds: [] as string[],
    useWeekdays: [] as number[],
    useStartTime: '' as string,
    useEndTime: '' as string,
    startTime: '',
    endTime: '',
    stackable: 0 as 0 | 1,
    stackWithCouponIds: [] as string[]
  })

  // 根据类型显示不同的标签和提示（与后端 CouponTypeEnum 一致）
  const valueLabel = computed(() => {
    switch (formData.type) {
      case 0:
        return '满减金额'
      case 1:
      case 3:
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
      case 3:
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
    totalCount: [{ required: true, message: '请输入发放总数', trigger: 'blur' }],
    dishIds: [
      {
        validator: (_rule, value: string[], callback) => {
          callback(
            ![2, 3].includes(formData.type) || value?.length ? undefined : new Error('请至少选择一个适用菜品')
          )
        },
        trigger: 'change'
      }
    ],
    startTime: [{ required: true, message: '请选择生效时间', trigger: 'change' }],
    endTime: [{ validator: (_rule, value: string, callback) => {
      if (longTerm.value) return callback()
      if (!value) return callback(new Error('请选择结束时间，或勾选长期有效'))
      callback(value > formData.startTime ? undefined : new Error('结束时间必须晚于生效时间'))
    }, trigger: 'change' }]
  }

  // 类型改变时重置面值（与后端 0-满减 1-整单折扣 2-菜品免单 一致）
  const handleTypeChange = (type: number) => {
    if (type === 1 || type === 3) {
      formData.value = 0.9
    } else if (type === 2) {
      formData.value = 0 // 菜品免单券不使用 value
    } else {
      formData.value = 10
    }
    if (![2, 3].includes(type)) formData.dishIds = []
  }

  // 初始化表单数据
  const initFormData = () => {
    dishSearchSeq++
    storeSearchSeq++
    stackSearchSeq++
    dishLoading.value = false
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
      value: isEdit ? (row?.value ?? 10) : 10,
      minAmount: isEdit ? (row?.minAmount ?? 0) : 0,
      totalCount: isEdit ? (row?.totalCount ?? 100) : 100,
      dishIds: isEdit ? (row?.dishItems || []).map((item) => String(item.dishId)) : [],
      storeIds: isEdit ? (row?.storeIds || '').split(',').filter(Boolean) : [],
      useWeekdays: isEdit ? (row?.useWeekdays || '').split(',').filter(Boolean).map(Number) : [],
      useStartTime: isEdit ? row?.useStartTime || '' : '',
      useEndTime: isEdit ? row?.useEndTime || '' : '',
      startTime: isEdit ? row?.startTime || '' : '',
      endTime: isEdit ? row?.endTime || '' : '',
      stackable: isEdit && (row?.stackable === 1 || row?.stackable === '是') ? 1 : 0,
      stackWithCouponIds: isEdit ? (row?.stackWithCouponIds || []).map(String) : []
    })
    longTerm.value = isEdit ? !row?.endTime : false
    dishOptions.value = []
    storeOptions.value = []
    stackOptions.value = []
    if (isEdit && row?.id) {
      const editingId = row.id
      fetchGetCouponDetail(editingId)
        .then(async (detail) => {
          if (!props.visible || String(props.couponData?.id) !== String(editingId)) return
          formData.dishIds = (detail.dishItems || []).map((item) => String(item.dishId))
          formData.storeIds = (detail.storeIds || '').split(',').filter(Boolean)
          formData.useWeekdays = (detail.useWeekdays || '').split(',').filter(Boolean).map(Number)
          formData.useStartTime = detail.useStartTime || ''
          formData.useEndTime = detail.useEndTime || ''
          formData.startTime = detail.startTime || ''
          formData.endTime = detail.endTime || ''
          longTerm.value = !detail.endTime
          formData.stackable = detail.stackable === 1 || detail.stackable === '是' ? 1 : 0
          formData.stackWithCouponIds = (detail.stackWithCouponIds || []).map(String)
          const loaded = await Promise.allSettled(formData.dishIds.map(fetchCouponDishDetail))
          const loadedStores = await Promise.allSettled(formData.storeIds.map(fetchGetStoreDetail))
          const loadedStack = await Promise.allSettled(formData.stackWithCouponIds.map(fetchGetCouponDetail))
          if (props.visible && String(props.couponData?.id) === String(editingId)) {
            dishOptions.value = loaded.flatMap((result) =>
              result.status === 'fulfilled' ? [result.value] : []
            )
            storeOptions.value = loadedStores.flatMap((result) =>
              result.status === 'fulfilled' ? [result.value] : []
            )
            stackOptions.value = loadedStack.flatMap((result) =>
              result.status === 'fulfilled' ? [result.value] : []
            )
          }
        })
        .catch((error) => console.error('读取优惠券菜品失败', error))
    }
  }

  watch(longTerm, (checked) => {
    if (checked) formData.endTime = ''
    formRef.value?.clearValidate('endTime')
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
      totalCount: dialogType.value === 'add' ? formData.totalCount : undefined,
      dishItems: [2, 3].includes(typeNum) ? formData.dishIds.map((dishId) => ({ dishId })) : [],
      storeIds: formData.storeIds.join(','),
      useWeekdays: formData.useWeekdays.join(','),
      useStartTime: formData.useStartTime || undefined,
      useEndTime: formData.useEndTime || undefined,
      startTime: formData.startTime || undefined,
      endTime: longTerm.value ? null : formData.endTime,
      stackable: formData.stackable,
      stackWithCouponIds: formData.stackable === 1 ? formData.stackWithCouponIds : []
    }
  }

  // 提交表单
  const handleSubmit = async () => {
    try {
      if (!formRef.value) return

      const valid = await formRef.value.validate()
      if (!valid) return
      if (!!formData.useStartTime !== !!formData.useEndTime
        || (formData.useStartTime && formData.useStartTime >= formData.useEndTime)) {
        ElMessage.warning('每日时段需同时填写，且结束时间应晚于开始时间')
        return
      }
      if (!formData.startTime || (!longTerm.value && (!formData.endTime || formData.endTime <= formData.startTime))) {
        ElMessage.warning('请填写有效的生效时间和结束时间，或勾选长期有效')
        return
      }

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
