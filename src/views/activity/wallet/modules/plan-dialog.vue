<template>
  <ElDialog
    v-model="dialogVisible"
    :title="plan ? '编辑储值档位' : '新增储值档位'"
    width="500px"
    destroy-on-close
  >
    <ArtForm ref="formRef" :model="form" :rules="rules" label-width="110px">
      <ElFormItem label="实付金额" prop="amount">
        <ElInputNumber
          v-model="form.amount"
          :min="0.01"
          :max="99999999.99"
          :precision="2"
          :step="1"
        />
        <span class="ml-2">元</span>
      </ElFormItem>
      <ElFormItem label="赠送金额" prop="bonus">
        <ElInputNumber v-model="form.bonus" :min="0" :max="99999999.99" :precision="2" :step="1" />
        <span class="ml-2">元</span>
      </ElFormItem>
      <ElFormItem label="角标文案" prop="badge">
        <ElInput v-model="form.badge" maxlength="30" placeholder="例如：人气推荐（可选）" />
      </ElFormItem>
      <ElFormItem label="排序" prop="sort">
        <ElInputNumber v-model="form.sort" :min="0" :max="99999" :precision="0" />
      </ElFormItem>
      <ElFormItem label="启用状态" prop="status">
        <ElSwitch v-model="enabled" active-text="启用" inactive-text="停用" />
      </ElFormItem>
    </ArtForm>
    <ElAlert
      title="余额支付时，本金与赠送余额按付款前余额比例共同扣除。"
      type="info"
      :closable="false"
    />
    <template #footer>
      <ElButton @click="dialogVisible = false">取消</ElButton>
      <ElButton type="primary" :loading="submitting" @click="submit">保存</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { computed, reactive, ref, watch } from 'vue'
  import type { FormInstance, FormRules } from 'element-plus'
  import { ElMessage } from 'element-plus'
  import { createWalletPlan, updateWalletPlan } from '@/api/wallet'
  import type { WalletPlan, WalletPlanForm } from '@/api/wallet'

  const props = defineProps<{ visible: boolean; plan?: WalletPlan | null }>()
  const emit = defineEmits<{ (e: 'update:visible', value: boolean): void; (e: 'success'): void }>()
  const dialogVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
  })
  const formRef = ref<FormInstance>()
  const submitting = ref(false)
  const form = reactive<WalletPlanForm>({ amount: 100, bonus: 0, badge: '', sort: 0, status: 0 })
  const enabled = computed({
    get: () => form.status === 1,
    set: (value) => {
      form.status = value ? 1 : 0
    }
  })
  const rules: FormRules = {
    amount: [
      {
        type: 'number',
        required: true,
        min: 0.01,
        message: '实付金额必须大于 0',
        trigger: 'change'
      }
    ],
    bonus: [
      { type: 'number', required: true, min: 0, message: '赠送金额不能为负数', trigger: 'change' }
    ]
  }

  watch(
    () => props.visible,
    (visible) => {
      if (visible)
        Object.assign(
          form,
          props.plan
            ? {
                amount: Number(props.plan.amount),
                bonus: Number(props.plan.bonus),
                badge: props.plan.badge || '',
                sort: props.plan.sort,
                status: props.plan.status
              }
            : { amount: 100, bonus: 0, badge: '', sort: 0, status: 0 }
        )
    }
  )

  async function submit() {
    if (submitting.value || !(await formRef.value?.validate().catch(() => false))) return
    submitting.value = true
    try {
      if (props.plan) await updateWalletPlan(String(props.plan.id), { ...form })
      else await createWalletPlan({ ...form })
      ElMessage.success('储值档位已保存')
      emit('success')
      dialogVisible.value = false
    } finally {
      submitting.value = false
    }
  }
</script>
