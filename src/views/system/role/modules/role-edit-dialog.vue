<template>
  <ElDialog
    v-model="visible"
    :title="dialogType === 'add' ? '新增角色' : '编辑角色'"
    width="min(480px, 94vw)"
    :close-on-click-modal="false"
    :close-on-press-escape="!saving"
    :show-close="!saving"
    align-center
    @close="handleClose"
  >
    <ArtForm ref="formRef" :model="form" :rules="rules" label-width="120px">
      <ElFormItem label="角色名称" prop="roleName">
        <ElInput v-model="form.roleName" placeholder="请输入角色名称" />
      </ElFormItem>
      <ElFormItem label="角色编码" prop="roleCode">
        <ElInput v-model="form.roleCode" :disabled="dialogType === 'edit'" placeholder="请输入角色编码（创建后固定）" />
      </ElFormItem>
      <ElFormItem label="描述" prop="description">
        <ElInput
          v-model="form.description"
          type="textarea"
          :rows="3"
          placeholder="请输入角色描述"
        />
      </ElFormItem>
      <ElFormItem prop="status" label="状态">
        <ElRadioGroup v-model="form.status">
          <ElRadio :value="1" label="启用">启用</ElRadio>
          <ElRadio :value="0" label="禁用">禁用</ElRadio>
        </ElRadioGroup>
      </ElFormItem>
    </ArtForm>
    <template #footer>
      <ElButton :disabled="saving" @click="handleClose">取消</ElButton>
      <ElButton type="primary" :loading="saving" @click="handleSubmit">提交</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import type { FormInstance, FormRules } from 'element-plus'
  import request from '@utils/http'

  type RoleListItem = Api.SystemManage.RoleListItem

  interface Props {
    modelValue: boolean
    dialogType: 'add' | 'edit'
    roleData?: RoleListItem
  }

  interface Emits {
    (e: 'update:modelValue', value: boolean): void
    (e: 'success'): void
  }

  const props = withDefaults(defineProps<Props>(), {
    modelValue: false,
    dialogType: 'add',
    roleData: undefined
  })

  const emit = defineEmits<Emits>()

  const formRef = ref<FormInstance>()
  const saving = ref(false)

  /**
   * 弹窗显示状态双向绑定
   */
  const visible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })

  // 配置工厂函数
  const getRequestConfig = (type: 'add' | 'edit') => {
    const configs = {
      add: {
        url: '/sys-role/add',
        method: 'post' as const,
        successMsg: '添加成功'
      },
      edit: {
        url: '/sys-role/update',
        method: 'put' as const,
        successMsg: '修改成功'
      }
    }
    return configs[type]
  }

  /**
   * 表单验证规则
   */
  const rules = reactive<FormRules>({
    roleName: [
      { required: true, message: '请输入角色名称', trigger: 'blur' },
      { min: 1, max: 20, message: '长度在 1 到 15 个字符', trigger: 'blur' }
    ],
    roleCode: [{ required: true, message: '请输入角色描述', trigger: 'blur' }],
    description: [{ required: false, message: '请输入角色描述', trigger: 'blur' }],
    status: [{ required: true, message: '请选择角色状态', trigger: 'change' }]
  })

  /**
   * 表单数据
   */
  const form = reactive<Omit<RoleListItem, 'status'> & { status: number | string }>({
    id: '',
    roleName: '',
    roleCode: '',
    description: '',
    createTime: '',
    updateTime: '',
    status: ''
  })

  /**
   * 监听弹窗打开，初始化表单数据
   */
  watch(
    () => props.modelValue,
    (newVal) => {
      if (newVal) initForm()
    }
  )

  /**
   * 监听角色数据变化，更新表单
   */
  watch(
    () => props.roleData,
    (newData) => {
      if (newData && props.modelValue) initForm()
    },
    { deep: true }
  )

  /**
   * 初始化表单数据
   * 根据弹窗类型填充表单或重置表单
   */
  const initForm = () => {
    if (props.dialogType === 'edit' && props.roleData) {
      form.roleName = props.roleData.roleName
      form.roleCode = props.roleData.roleCode
      form.description = props.roleData.description
      form.createTime = props.roleData.createTime
      form.updateTime = props.roleData.updateTime
      form.id = props.roleData.id
      form.status = props.roleData.status == '正常' ? 1 : 0
    } else {
      Object.assign(form, {
        id: '',
        roleName: '',
        roleCode: '',
        description: '',
        createTime: '',
        updateTime: '',
        status: 1
      })
    }
  }

  /**
   * 关闭弹窗并重置表单
   */
  const handleClose = () => {
    visible.value = false
    formRef.value?.resetFields()
  }

  /**
   * 提交表单
   * 验证通过后调用接口保存数据
   */

  const handleSubmit = async () => {
    if (saving.value || !formRef.value || !(await formRef.value.validate().catch(() => false)))
      return
    saving.value = true
    try {
      const { url, method, successMsg } = getRequestConfig(props.dialogType)
      const data = {
        id: props.dialogType === 'edit' ? form.id : undefined,
        roleName: form.roleName,
        roleCode: form.roleCode,
        description: form.description,
        status: form.status
      }
      await request[method]({ url, data })
      ElMessage.success(successMsg)
      emit('success')
      handleClose()
    } catch {
    } finally {
      saving.value = false
    }
  }
</script>
