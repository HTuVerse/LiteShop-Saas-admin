<!-- 表格按钮 -->
<template>
  <button
    v-if="!auth || hasAuth(auth)"
    type="button"
    :aria-label="labelText"
    :title="labelText"
    :disabled="disabled"
    :class="[
      'art-table-button inline-flex items-center justify-center w-8 h-8 p-0 mr-2.5 text-sm c-p rounded-md align-middle',
      buttonClass
    ]"
    :style="{ backgroundColor: buttonBgColor, color: iconColor }"
    @click="handleClick"
  >
    <ArtSvgIcon :icon="iconContent" />
  </button>
</template>

<script setup lang="ts">
  import { useAuth } from '@/hooks/core/useAuth'
  import type { RequiredPermission } from '@/utils/operation-permission'
  const { hasAuth } = useAuth()
  defineOptions({ name: 'ArtButtonTable' })

  interface Props {
    auth?: RequiredPermission
    /** Accessible label, also shown on hover. */
    label?: string
    disabled?: boolean
    /** 按钮类型 */
    type?: 'add' | 'edit' | 'delete' | 'more' | 'view'
    /** 按钮图标 */
    icon?: string
    /** 按钮样式类 */
    iconClass?: string
    /** icon 颜色 */
    iconColor?: string
    /** 按钮背景色 */
    buttonBgColor?: string
  }

  const props = withDefaults(defineProps<Props>(), {})

  const emit = defineEmits<{
    (e: 'click'): void
  }>()

  // 默认按钮配置
  const defaultButtons = {
    add: { icon: 'ri:add-fill', class: 'bg-theme/12 text-theme' },
    edit: { icon: 'ri:pencil-line', class: 'bg-secondary/12 text-secondary' },
    delete: { icon: 'ri:delete-bin-5-line', class: 'bg-error/12 text-error' },
    view: { icon: 'ri:eye-line', class: 'bg-info/12 text-info' },
    more: { icon: 'ri:more-2-fill', class: '' }
  } as const

  // 获取图标内容
  const iconContent = computed(() => {
    return props.icon || (props.type ? defaultButtons[props.type]?.icon : '') || ''
  })

  // 获取按钮样式类
  const buttonClass = computed(() => {
    return props.iconClass || (props.type ? defaultButtons[props.type]?.class : '') || ''
  })

  const labelText = computed(
    () =>
      props.label ||
      (
        {
          'ri:send-plane-line': '发放优惠券',
          'ri:bank-card-fill': '余额充值',
          'ri:lock-password-line': '重置密码',
          'ri:qr-code-line': '二维码',
          'ri:history-line': '历史记录'
        } as Record<string, string>
      )[iconContent.value] ||
      (
        { add: '新增', edit: '编辑', delete: '删除', view: '查看', more: '更多' } as Record<
          string,
          string
        >
      )[props.type || ''] ||
      '操作'
  )
  const handleClick = () => {
    if (props.disabled || (props.auth && !hasAuth(props.auth))) return
    emit('click')
  }
</script>
<style scoped>
  .art-table-button {
    flex-shrink: 0;
    border: 0;
    transition:
      filter 0.15s,
      opacity 0.15s;
  }

  .art-table-button:last-child {
    margin-right: 0;
  }

  .art-table-button:hover:not(:disabled) {
    filter: brightness(0.94);
  }

  .art-table-button:focus-visible {
    outline: 2px solid currentcolor;
    outline-offset: 2px;
  }

  .art-table-button:disabled {
    cursor: not-allowed;
    opacity: 0.4;
  }
</style>
