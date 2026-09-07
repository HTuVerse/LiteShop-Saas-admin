<template>
  <ElDialog
    v-model="visibleModel"
    :title="type === 'add' ? '添加用户' : '编辑用户'"
    width="min(570px,94vw)"
    align-center
    :close-on-click-modal="false"
    ><ArtForm ref="formRef" :model="form" :rules="rules" label-width="90px"
      ><ElFormItem label="用户名" prop="username"
        ><ElInput v-model.trim="form.username" /></ElFormItem
      ><ElFormItem label="昵称"><ElInput v-model="form.nickname" /></ElFormItem
      ><ElFormItem v-if="type === 'add'" label="初始密码" prop="password"
        ><ElInput
          v-model="form.password"
          type="password"
          show-password
          autocomplete="new-password" /></ElFormItem
      ><ElFormItem label="手机号" prop="phone"><ElInput v-model.trim="form.phone" /></ElFormItem
      ><ElFormItem label="邮箱" prop="email"><ElInput v-model.trim="form.email" /></ElFormItem
      ><ElFormItem label="性别"
        ><ElSelect v-model="form.gender"
          ><ElOption label="保密" :value="0" /><ElOption label="男" :value="1" /><ElOption
            label="女"
            :value="2" /></ElSelect></ElFormItem
      ><ElFormItem label="生日"
        ><ElDatePicker v-model="form.birthday" value-format="YYYY-MM-DD" /></ElFormItem
      ><ElFormItem label="等级" prop="level"
        ><ElSelect v-model="form.level" :disabled="type === 'edit' && !hasAuth('system:user:level')"
          ><ElOption
            v-for="level in levels"
            :key="level.id"
            :value="level.levelCode"
            :label="level.levelName" /></ElSelect></ElFormItem
      ><ElFormItem label="角色" prop="roleCode"
        ><ElSelect v-model="form.roleCode" multiple :disabled="!hasAuth('system:user:assign-role')"
          ><ElOption
            v-for="role in roles"
            :key="role.id"
            :value="role.roleCode"
            :label="role.roleName" /></ElSelect></ElFormItem
      ><ElFormItem label="状态"
        ><ElSwitch
          v-model="form.status"
          :active-value="1"
          :inactive-value="0" /></ElFormItem></ArtForm
    ><template #footer
      ><ElButton @click="visibleModel = false">取消</ElButton
      ><ElButton type="primary" :loading="saving" @click="save">保存</ElButton></template
    ></ElDialog
  >
</template>
<script setup lang="ts">
  import { computed, reactive, ref, watch } from 'vue'
  import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
  import request from '@/utils/http'
  import { useAuth } from '@/hooks/core/useAuth'
  const { hasAuth } = useAuth()
  import { fetchGetRoleList, fetchGetEnabledLevelList } from '@/api/system-manage'
  const props = defineProps<{ visible: boolean; type: string; userData?: any }>()
  const emit = defineEmits<{
    'update:visible': [boolean]
    submit: []
    addSuccess: []
    editSuccess: []
  }>()
  const visibleModel = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
  })
  const saving = ref(false),
    formRef = ref<FormInstance>(),
    roles = ref<Api.SystemManage.RoleListItem[]>([]),
    levels = ref<Api.SystemManage.LevelListItem[]>([])
  const defaults = () => ({
    id: undefined,
    username: '',
    nickname: '',
    password: '',
    phone: '',
    email: '',
    gender: 0,
    level: 1,
    roleCode: ['USER'],
    status: 1,
    birthday: null
  })
  const form = reactive<any>(defaults())
  const rules: FormRules = {
    username: [
      { required: true, message: '请输入用户名' },
      { pattern: /^[\w-]+$/, message: '账号仅支持字母、数字、下划线和横线' }
    ],
    password: [
      { required: true, message: '请设置初始密码' },
      { min: 6, message: '密码至少6位' }
    ],
    email: [{ type: 'email', message: '请输入有效邮箱' }],
    level: [{ required: true, message: '请选择等级' }],
    roleCode: [{ required: true, message: '请选择角色' }]
  }
  watch(
    () => props.visible,
    async (value) => {
      if (!value) return
      const row = props.userData
      Object.assign(
        form,
        defaults(),
        props.type === 'edit' && row
          ? {
              ...row,
              password: undefined,
              status: ['正常', 1, '1'].includes(row.status) ? 1 : 0,
              gender: row.gender === '男' ? 1 : row.gender === '女' ? 2 : 0,
              birthday: row.birthday || null
            }
          : {}
      )
      try {
        const [allRoles, allLevels] = await Promise.all([
          fetchGetRoleList(),
          fetchGetEnabledLevelList()
        ])
        roles.value = allRoles.filter((role) => role.roleCode !== 'SUPER_ADMIN')
        levels.value = allLevels
        if (props.type !== 'edit' && allLevels.length) form.level = allLevels[0].levelCode
      } catch {}
    },
    { immediate: true }
  )
  async function save() {
    if (saving.value || !(await formRef.value?.validate().catch(() => false))) return
    saving.value = true
    try {
      const data = { ...form, phone: form.phone || null, email: form.email || null }
      if (!hasAuth('system:user:assign-role')) delete data.roleCode
      if (props.type === 'edit' && !hasAuth('system:user:level')) delete data.level
      if (props.type === 'edit') {
        delete data.password
        await request.put({ url: '/user/admin/edit', data })
      } else {
        delete data.id
        await request.post({ url: '/user/add', data })
      }
      ElMessage.success('用户已保存')
      visibleModel.value = false
      emit('submit')
    } catch {
    } finally {
      saving.value = false
    }
  }
</script>
