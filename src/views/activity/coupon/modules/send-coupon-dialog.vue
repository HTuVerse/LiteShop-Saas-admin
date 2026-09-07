<!-- 发放优惠券弹窗 -->
<template>
  <ElDialog v-model="dialogVisible" title="发放优惠券" width="500px" align-center destroy-on-close>
    <div class="coupon-info" v-if="couponData">
      <div class="coupon-card">
        <div class="coupon-value">
          <template v-if="getTypeNumber(couponData.type) === 1">
            <span class="value">{{ (Number(couponData.value) * 10).toFixed(0) }}</span>
            <span class="unit">折</span>
          </template>
          <template v-else-if="getTypeNumber(couponData.type) === 2">
            <span class="value">免单</span>
          </template>
          <template v-else>
            <span class="unit">¥</span>
            <span class="value">{{ couponData.value }}</span>
          </template>
        </div>
        <div class="coupon-detail">
          <div class="name">{{ couponData.name }}</div>
          <div class="condition">
            {{
              couponData.minAmount && couponData.minAmount > 0
                ? `满${couponData.minAmount}元可用`
                : '无门槛'
            }}
          </div>
          <div class="remain"
            >剩余 {{ couponData.remainCount }} / {{ couponData.totalCount }} 张</div
          >
        </div>
      </div>
    </div>

    <ElDivider />

    <ArtForm ref="formRef" :model="formData" :rules="rules" label-width="100px">
      <ElFormItem label="用户ID" prop="userId">
        <ElAutocomplete
          v-model="formData.userId"
          :fetch-suggestions="searchUsers"
          :validate-event="false"
          @update:model-value="formRef?.clearValidate('userId')"
          :debounce="250"
          clearable
          placeholder="搜索姓名 / 手机号，或输入完整用户 ID"
          style="width: 100%"
        >
          <template #default="{ item }">{{ item.label }}</template>
        </ElAutocomplete>
        <div class="form-tip">只能发给当前租户的用户；用户 ID 请从用户管理中复制。</div>
      </ElFormItem>

      <ElFormItem label="生效时间" prop="startTime">
        <ElDatePicker
          v-model="formData.startTime"
          type="datetime"
          placeholder="选择生效时间（可选）"
          format="YYYY-MM-DD HH:mm"
          value-format="YYYY-MM-DD HH:mm:ss"
          style="width: 100%"
        />
        <div class="form-tip">不填则立即生效；尚未开始的券从活动开始时间生效</div>
      </ElFormItem>

      <ElFormItem label="过期时间" prop="expiredTime">
        <ElDatePicker
          v-model="formData.expiredTime"
          type="datetime"
          placeholder="选择过期时间（可选）"
          format="YYYY-MM-DD HH:mm"
          value-format="YYYY-MM-DD HH:mm:ss"
          style="width: 100%"
        />
        <div class="form-tip">不填默认 3 天，最长不超过优惠券截止时间</div>
      </ElFormItem>
    </ArtForm>

    <template #footer>
      <div class="dialog-footer">
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton
          v-auth="'marketing:coupon:send'"
          type="primary"
          :loading="submitLoading"
          @click="handleSubmit"
          >确认发放</ElButton
        >
      </div>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { ref, reactive, computed, watch, nextTick } from 'vue'
  import type { FormInstance, FormRules } from 'element-plus'
  import { ElMessage, ElDialog, ElFormItem, ElButton, ElDatePicker, ElDivider } from 'element-plus'
  import { fetchSendCouponToUser } from '@/api/coupon-manage'
  import { fetchUserRecipients } from '@/api/system-manage'
  import { getEnumNumber, CouponTypeEnumMap } from '@/utils/enum/enumConverter'

  interface Props {
    visible: boolean
    couponData?: Partial<Api.Coupon.CouponListItem>
  }

  interface Emits {
    (e: 'update:visible', value: boolean): void
    (e: 'success'): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  /**
   * 获取类型的数字值（兼容后端返回的文字）
   */
  const getTypeNumber = (type: string | number | undefined): number => {
    if (type === undefined) return 0
    return getEnumNumber(type, CouponTypeEnumMap) ?? 0
  }

  // 对话框显示控制
  const dialogVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
  })

  // 表单实例
  const formRef = ref<FormInstance>()
  const submitLoading = ref(false)

  async function searchUsers(keyWord: string) {
    try {
      const page = await fetchUserRecipients(keyWord)
      return page.records.map((user) => ({
        value: String(user.id),
        label: (user.nickname || user.username || '用户') + ' · ID ' + user.id
      }))
    } catch {
      return []
    }
  }

  // 表单数据
  const formData = reactive({
    userId: '',
    startTime: '',
    expiredTime: ''
  })

  // 表单验证规则
  const rules: FormRules = {
    userId: [
      {
        required: true,
        validator: (_rule, value, callback) => {
          const id = String(value || '')
          callback(
            /^[1-9]\d{0,18}$/.test(id) && BigInt(id) <= BigInt('9223372036854775807')
              ? undefined
              : new Error('请输入有效的完整用户 ID')
          )
        },
        trigger: 'change'
      }
    ]
  }

  // 初始化表单数据
  const initFormData = () => {
    formData.userId = ''
    formData.startTime = ''
    formData.expiredTime = ''
  }

  // 监听对话框状态变化
  watch(
    () => props.visible,
    (visible) => {
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
      if (!formRef.value || submitLoading.value) return

      const valid = await formRef.value.validate()
      if (!valid) return

      if (!props.couponData?.id) {
        ElMessage.error('优惠券信息不完整')
        return
      }

      if (
        formData.expiredTime &&
        new Date(formData.expiredTime.replace(' ', 'T')).getTime() <=
          new Date((formData.startTime || new Date().toISOString()).replace(' ', 'T')).getTime()
      ) {
        ElMessage.warning('过期时间必须晚于生效时间，且不能已过期')
        return
      }
      submitLoading.value = true

      await fetchSendCouponToUser({
        userId: formData.userId!,
        couponId: props.couponData.id,
        startTime: formData.startTime || undefined,
        expiredTime: formData.expiredTime || undefined
      })

      ElMessage.success('发放成功')
      emit('success')
      dialogVisible.value = false
    } catch (error: any) {
      ElMessage.error(error.message || '发放失败')
    } finally {
      submitLoading.value = false
    }
  }
</script>

<style lang="scss" scoped>
  .coupon-info {
    margin-bottom: 16px;
  }

  .coupon-card {
    display: flex;
    align-items: center;
    padding: 16px;
    color: #fff;
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
    border-radius: 8px;
  }

  .coupon-value {
    min-width: 100px;
    padding-right: 16px;
    text-align: center;
    border-right: 1px dashed rgb(255 255 255 / 50%);

    .value {
      font-size: 36px;
      font-weight: bold;
    }

    .unit {
      font-size: 14px;
    }
  }

  .coupon-detail {
    flex: 1;
    padding-left: 16px;

    .name {
      margin-bottom: 4px;
      font-size: 16px;
      font-weight: 500;
    }

    .condition {
      margin-bottom: 4px;
      font-size: 12px;
      opacity: 0.9;
    }

    .remain {
      font-size: 12px;
      opacity: 0.8;
    }
  }

  .form-tip {
    margin-top: 4px;
    font-size: 12px;
    color: #909399;
  }
</style>
