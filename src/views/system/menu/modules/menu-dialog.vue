<template>
  <ElDialog
    :title="dialogTitle"
    :model-value="visible"
    @update:model-value="handleCancel"
    width="860px"
    align-center
    class="menu-dialog"
    @closed="handleClosed"
  >
    <ArtForm
      ref="formRef"
      :model-value="form"
      @update:model-value="(value) => Object.assign(form, value)"
      :items="formItems"
      :rules="rules"
      :span="width > 640 ? 12 : 24"
      :gutter="20"
      label-width="100px"
      :show-reset="false"
      :show-submit="false"
    >
      <template #menuType>
        <ElRadioGroup v-model="form.menuType" :disabled="disableMenuType">
          <ElRadioButton value="menu" label="menu">菜单</ElRadioButton>
          <ElRadioButton value="button" label="button">按钮</ElRadioButton>
        </ElRadioGroup>
      </template>
      <template #componentAddress>
        <ElSelect
          v-model="form.componentAddress"
          filterable
          default-first-option
          placeholder="搜索并选择已有页面，自动填写路由"
          style="width: 100%"
          @change="selectPage"
        >
          <ElOption label="目录（用于放置下级菜单）" value="Layout" />
          <ElOption
            v-for="page in menuPages"
            :key="page.value"
            :label="page.label"
            :value="page.value"
          />
        </ElSelect>
      </template>
      <template #menuScope>
        <ElSelect
          v-model="form.menuScope"
          :disabled="form.componentAddress === 'Layout'"
          style="width: 100%"
        >
          <ElOption
            v-for="(label, value) in menuScopeLabels"
            :key="value"
            :value="Number(value)"
            :label="label"
          />
        </ElSelect>
      </template>
    </ArtForm>
    <p class="text-sm text-gray-500"
      >显示范围控制平台与租户中的菜单入口；目录随子菜单显示，按钮继承所属页面。业务页面仍需支持相应范围，接口权限不会因此放开。</p
    >

    <template #footer>
      <span class="dialog-footer">
        <ElButton :disabled="saving" @click="handleCancel">取 消</ElButton>
        <ElButton type="primary" :loading="saving" @click="handleSubmit">确 定</ElButton>
      </span>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import type { FormRules } from 'element-plus'
  import { ElIcon, ElTooltip, ElMessage } from 'element-plus'
  import { QuestionFilled } from '@element-plus/icons-vue'
  import { formatMenuTitle } from '@/utils/router'
  import type { AppRouteRecord } from '@/types/router'
  import type { FormItem } from '@/components/core/forms/art-form/index.vue'
  import ArtForm from '@/components/core/forms/art-form/index.vue'
  import { useWindowSize } from '@vueuse/core'
  import { permissionStatusCode, permissionTypeCode } from '@/utils/permission'
  import type { Id } from '@/types/backend'
  import { resolveMenuScope, menuScopeLabels, MenuScope } from '@/router/backend-menu'
  import { menuPages, findMenuPage } from '@/config/menu-pages'
  import { canParentPermission, permissionFullPaths } from '@/utils/permission-hierarchy'
  import type { PermissionNode } from '@/utils/permission'
  const { width } = useWindowSize()

  /**
   * 创建带 tooltip 的表单标签
   * @param label 标签文本
   * @param tooltip 提示文本
   * @returns 渲染函数
   */
  const createLabelTooltip = (label: string, tooltip: string) => {
    return () =>
      h('span', { class: 'flex items-center' }, [
        h('span', label),
        h(
          ElTooltip,
          {
            content: tooltip,
            placement: 'top'
          },
          () => h(ElIcon, { class: 'ml-0.5 cursor-help' }, () => h(QuestionFilled))
        )
      ])
  }

  interface MenuFormData {
    id?: Id
    parentId?: Id | null
    menuScope: MenuScope
    permissionName: string
    permissionCode: string
    permissionType: 1 | 2 | 3 // 1-菜单, 2-按钮, 3-API
    routerAddress: string
    componentAddress: string
    icon: string
    status: number // 0-禁用, 1-正常
    sort: number
    isIframe: boolean // 是否为iframe
    keepAlive: boolean // 是否缓存
    link: string | null // 外链地址
    isHide: boolean // 是否隐藏
  }

  interface Props {
    visible: boolean
    editData?: AppRouteRecord | any
    type?: 'menu' | 'button'
    lockType?: boolean
    saving?: boolean
    permissions: PermissionNode[]
  }

  interface Emits {
    (e: 'update:visible', value: boolean): void
    (e: 'submit', data: Api.SystemManage.PermissionFormData, isEdit: boolean): void
  }

  const props = withDefaults(defineProps<Props>(), {
    visible: false,
    type: 'menu',
    lockType: false,
    saving: false
  })

  const emit = defineEmits<Emits>()

  const formRef = ref()
  const isEdit = ref(false)

  const form = reactive<MenuFormData & { menuType: 'menu' | 'button' }>({
    menuType: 'menu',
    menuScope: MenuScope.TENANT,
    id: undefined,
    parentId: '0',
    permissionName: '',
    permissionCode: '',
    permissionType: 1,
    routerAddress: '',
    componentAddress: '',
    icon: '',
    status: 1, // 默认启用
    sort: 1,
    isIframe: false, // 默认不是iframe
    keepAlive: false, // 默认不缓存
    link: null, // 默认无外链
    isHide: false // 默认不隐藏
  })

  const rules = reactive<FormRules>({
    permissionName: [
      { required: true, message: '请输入权限名称', trigger: 'blur' },
      { min: 1, max: 100, message: '长度在 1 到 100 个字符', trigger: 'blur' }
    ],
    permissionCode: [{ required: true, message: '请输入权限编码', trigger: 'blur' }],
    routerAddress: [
      {
        required: true,
        message: '请输入路由地址',
        trigger: 'blur',
        validator: (_rule: any, value: any, callback: any) => {
          if (form.menuType === 'menu' && !value) {
            callback(new Error('菜单类型必须填写路由地址'))
          } else {
            callback()
          }
        }
      }
    ],
    componentAddress: [
      {
        validator: (_rule: any, value: any, callback: any) => {
          if (form.menuType === 'menu' && !value) {
            callback(new Error('菜单类型必须填写组件地址'))
          } else {
            callback()
          }
        },
        trigger: 'blur'
      }
    ]
  })

  /**
   * 表单项配置
   */
  const formItems = computed<FormItem[]>(() => {
    const baseItems: FormItem[] = [
      { label: '菜单类型', key: 'menuType', span: 24 },
      {
        label: '上级菜单',
        key: 'parentId',
        type: 'treeselect',
        span: 24,
        props: {
          data: parentOptions.value,
          checkStrictly: true,
          filterable: true,
          renderAfterExpand: false,
          placeholder: '选择所属目录',
          style: { width: '100%' }
        }
      }
    ]

    if (form.menuType === 'menu') {
      return [
        ...baseItems,
        {
          label: '菜单名称',
          key: 'permissionName',
          type: 'input',
          props: { placeholder: '菜单名称' }
        },
        {
          label: createLabelTooltip(
            '路由地址',
            '选择已有页面可自动填写。使用完整路径，移动目录时页面地址保持不变。'
          ),
          key: 'routerAddress',
          type: 'input',
          props: { placeholder: '选择已有页面后自动填写，也可自定义' }
        },
        {
          label: '权限编码',
          key: 'permissionCode',
          type: 'input',
          props: { placeholder: '如：system:user:list' }
        },
        {
          label: createLabelTooltip(
            '组件地址',
            '选择主项目已有页面或目录。新页面放入 views 目录后会自动加入选项。'
          ),
          key: 'componentAddress'
        },
        { label: '显示范围', key: 'menuScope' },
        { label: '图标', key: 'icon', type: 'icon' },
        {
          label: '菜单排序',
          key: 'sort',
          type: 'number',
          props: { min: 1, controlsPosition: 'right', style: { width: '100%' } }
        },
        {
          label: '外链地址',
          key: 'link',
          type: 'input',
          props: { placeholder: '如：https://example.com（可选）' }
        },
        {
          label: '是否Iframe',
          key: 'isIframe',
          type: 'switch',
          props: {
            activeValue: true,
            inactiveValue: false,
            activeText: '是',
            inactiveText: '否'
          }
        },
        {
          label: '是否缓存',
          key: 'keepAlive',
          type: 'switch',
          props: {
            activeValue: true,
            inactiveValue: false,
            activeText: '是',
            inactiveText: '否'
          }
        },
        {
          label: '是否隐藏',
          key: 'isHide',
          type: 'switch',
          props: {
            activeValue: true,
            inactiveValue: false,
            activeText: '是',
            inactiveText: '否'
          }
        },
        {
          label: '是否启用',
          key: 'status',
          type: 'switch',
          span: 24,
          props: {
            activeValue: 1,
            inactiveValue: 0,
            activeText: '启用',
            inactiveText: '禁用'
          }
        }
      ]
    } else {
      return [
        ...baseItems,
        {
          label: '权限名称',
          key: 'permissionName',
          type: 'input',
          props: { placeholder: '如：新增、编辑、删除' }
        },
        {
          label: '权限编码',
          key: 'permissionCode',
          type: 'input',
          props: { placeholder: '如：system:user:add' }
        },
        {
          label: '权限排序',
          key: 'sort',
          type: 'number',
          props: { min: 1, controlsPosition: 'right', style: { width: '100%' } }
        },
        {
          label: '是否启用',
          key: 'status',
          type: 'switch',
          span: 24,
          props: {
            activeValue: 1,
            inactiveValue: 0,
            activeText: '启用',
            inactiveText: '禁用'
          }
        }
      ]
    }
  })

  const dialogTitle = computed(() => {
    const type = form.menuType === 'menu' ? '菜单' : form.permissionType === 3 ? 'API' : '按钮'
    return isEdit.value ? `编辑${type}` : `新建${type}`
  })

  /**
   * 是否禁用菜单类型切换
   */
  const disableMenuType = computed(() => {
    if (isEdit.value) return true
    if (!isEdit.value && form.menuType === 'menu' && props.lockType) return true
    return false
  })

  /**
   * 重置表单数据
   */
  const resetForm = (): void => {
    formRef.value?.reset()
    Object.assign(form, {
      menuType: 'menu',
      menuScope: MenuScope.TENANT,
      id: undefined,
      parentId: '0',
      permissionName: '',
      permissionCode: '',
      permissionType: 1,
      routerAddress: '',
      componentAddress: '',
      icon: '',
      status: 1,
      sort: 1,
      isIframe: false,
      keepAlive: false,
      link: null,
      isHide: false
    })
  }

  /**
   * 加载表单数据（编辑模式）
   */
  const loadFormData = (): void => {
    if (!props.editData) return

    // 如果只有 parentId，说明是新增子权限，不是编辑
    if (props.editData.parentId && !props.editData.id) {
      isEdit.value = false
      form.parentId = props.editData.parentId
      return
    }

    isEdit.value = true

    if (form.menuType === 'menu') {
      const row = props.editData
      form.id = row.id
      form.parentId = String(row.parentId || '0')
      form.permissionName = formatMenuTitle(row.meta?.title || '')
      form.routerAddress =
        permissionFullPaths(props.permissions).get(String(row.id)) || row.path || ''
      form.menuScope = resolveMenuScope(row)
      form.permissionCode = row.permissionCode || ''
      form.componentAddress = findMenuPage(row.component || '')?.value || row.component || ''
      form.icon = row.icon ?? row.meta?.icon ?? ''
      form.sort = row.sort ?? 1
      form.status = permissionStatusCode(row.status)
      form.permissionType = 1
      form.isIframe = row.isIframe ?? false
      form.keepAlive = row.keepAlive ?? false
      form.link = row.link || null
      form.isHide = row.isHide ?? false
    } else {
      const row = props.editData
      form.id = row.id
      form.parentId = String(row.parentId || '0')
      form.permissionName = row.permissionName || row.meta?.title || ''
      form.permissionCode = row.permissionCode || row.meta?.authMark || ''
      form.icon = row.icon || ''
      form.sort = row.sort ?? 1
      form.status = permissionStatusCode(row.status)
      form.permissionType = permissionTypeCode(row.permissionType)
    }
  }

  /**
   * 提交表单
   */
  const handleSubmit = async (): Promise<void> => {
    if (!formRef.value || props.saving) return

    try {
      await formRef.value.validate()
      if (form.menuType !== 'menu' && (!form.parentId || String(form.parentId) === '0')) {
        ElMessage.warning('按钮和API权限必须选择上级菜单')
        return
      }

      // 构建提交数据
      const submitData: Api.SystemManage.PermissionFormData = {
        permissionName: form.permissionName,
        permissionCode: form.permissionCode,
        permissionType: form.menuType === 'menu' ? 1 : form.permissionType === 3 ? 3 : 2,
        sort: form.sort,
        status: permissionStatusCode(form.status),
        parentId: form.parentId ?? 0
      }
      // 编辑时添加ID
      if (isEdit.value && form.id) {
        submitData.id = form.id
      }
      // 添加父级ID
      if (form.parentId) {
        submitData.parentId = form.parentId
      }
      // 菜单类型的额外字段
      if (form.menuType === 'menu') {
        submitData.menuScope = form.componentAddress === 'Layout' ? MenuScope.ALL : form.menuScope
        submitData.routerAddress = form.routerAddress
        submitData.componentAddress = form.componentAddress
        submitData.isIframe = form.isIframe
        submitData.keepAlive = form.keepAlive
        submitData.link = form.link
        submitData.isHide = form.isHide
        submitData.icon = form.icon || ''
      } else {
        // 按钮类型也可以有图标
        if (form.icon) {
          submitData.icon = form.icon
        }
      }
      emit('submit', submitData, isEdit.value)
    } catch (error) {
      console.error('表单校验失败:', error)
    }
  }

  const parentOptions = computed(() => {
    const current = {
      id: form.id || '',
      permissionType: form.menuType === 'menu' ? 1 : 2,
      children: []
    } as unknown as PermissionNode
    const excluded = new Set<string>()
    const mark = (nodes: PermissionNode[]) =>
      nodes.forEach((node) => {
        excluded.add(String(node.id))
        mark(node.children || [])
      })
    const find = (nodes: PermissionNode[]) =>
      nodes.forEach((node) => {
        if (String(node.id) === String(form.id)) mark([node])
        else find(node.children || [])
      })
    find(props.permissions)
    const options = (nodes: PermissionNode[]): any[] =>
      nodes
        .filter((node) => node.permissionType === 1 && !excluded.has(String(node.id)))
        .map((node) => ({
          value: String(node.id),
          label: node.permissionName,
          disabled: !canParentPermission(current, node),
          children: options(node.children || [])
        }))
    return [
      {
        value: '0',
        label: '顶层菜单',
        disabled: form.menuType !== 'menu',
        children: options(props.permissions)
      }
    ]
  })

  const selectPage = (value: string) => {
    if (value === 'Layout') form.menuScope = MenuScope.ALL
    const page = menuPages.find((item) => item.value === value)
    if (!page) return
    if (!isEdit.value) form.menuScope = page.menuScope
    if (!isEdit.value || !form.routerAddress) form.routerAddress = page.route
    if (!form.permissionName) form.permissionName = page.title
    if (!form.permissionCode) form.permissionCode = page.code
  }

  /**
   * 取消操作
   */
  const handleCancel = (): void => {
    if (props.saving) return
    emit('update:visible', false)
  }

  /**
   * 对话框关闭后的回调
   */
  const handleClosed = (): void => {
    resetForm()
    isEdit.value = false
  }

  /**
   * 监听对话框显示状态
   */
  watch(
    () => props.visible,
    (newVal) => {
      if (newVal) {
        form.menuType = props.type
        nextTick(() => {
          if (props.editData) {
            loadFormData()
          }
        })
      }
    }
  )

  /**
   * 监听菜单类型变化
   */
  watch(
    () => props.type,
    (newType) => {
      if (props.visible) {
        form.menuType = newType
      }
    }
  )
</script>
