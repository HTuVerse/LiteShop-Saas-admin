<template>
  <ElDialog
    align-center
    v-model="dialogVisible"
    title="用户充值"
    width="min(440px, 94vw)"
    :close-on-click-modal="false"
    :close-on-press-escape="!submitting"
    :show-close="!submitting"
  >
    <ArtForm :rules="rules" ref="formRef" :model="formData">
      <ElFormItem prop="amount" label="充值金额（元）">
        <ElInput
          maxlength="8"
          v-model="formData.amount"
          type="number"
          placeholder="请输入要充值的余额"
        ></ElInput>
      </ElFormItem>
    </ArtForm>
    <template #footer>
      <div class="dialog-footer">
        <ElButton :disabled="submitting" @click="dialogVisible = false">取消</ElButton>
        <ElButton
          v-auth="'system:user:recharge'"
          type="primary"
          :loading="submitting"
          @click="handleSubmit"
          >提交</ElButton
        >
      </div>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import type { FormInstance, FormRules } from 'element-plus'
  import { ElMessage } from 'element-plus'
  import request from '@utils/http'
  interface Props {
    visible: boolean
    type: string
    userData?: any
  }
  interface Emits {
    (e: 'update:visible', value: boolean): void
    (e: 'submit'): void
    (e: 'rechargeSuccess'): void
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
  const submitting = ref(false)
  const formData = reactive({
    userId: props.userData?.id,
    amount: ''
  })

  // 初始化表单数据
  const initFormData = () => {
    const isRecharge = props.type === 'recharge' && props.userData
    const row = props.userData

    Object.assign(formData, {
      userId: isRecharge ? row.id : '',
      amount: ''
    })
  }

  // 表单验证规则
  const rules: FormRules = {
    amount: [
      { required: true, message: '请输入充值金额', trigger: 'blur' },
      { pattern: /^[1-9]\d{0,7}$/, message: '请输入正整数金额（元）', trigger: 'blur' }
    ]
  }

  // 统一监听对话框状态变化
  watch(
    () => [props.visible, props.type, props.userData],
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

  const handleSubmit = async () => {
    if (submitting.value || !formRef.value || !(await formRef.value.validate().catch(() => false)))
      return
    submitting.value = true
    try {
      await request.post({
        url: '/user/admin/recharge',
        params: { userId: formData.userId, amount: formData.amount }
      })
      ElMessage.success('充值成功')
      emit('rechargeSuccess')
      emit('submit')
      dialogVisible.value = false
    } catch {
      /* Only a confirmed server response marks the recharge as successful. */
    } finally {
      submitting.value = false
    }
  }
</script>

<style scoped lang="scss"></style>
