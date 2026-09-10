<template>
  <ElDialog v-model="dialogVisible" :title="title" :width="width" align-center>
    <ElAlert
      v-if="alertTitle"
      :title="alertTitle"
      :type="alertType"
      :closable="false"
      class="dialog-alert"
    />
    <ArtForm
      v-model="formModel"
      :items="items"
      :span="span"
      :gutter="12"
      :label-width="labelWidth"
      :show-reset="false"
      :show-submit="false"
    />
    <template #footer>
      <ElButton @click="dialogVisible = false">取消</ElButton>
      <ElButton type="primary" :loading="saving" @click="emit('submit')">
        {{ submitText }}
      </ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import type { FormItem } from '@/components/core/forms/art-form/index.vue'

  interface Props {
    title: string
    form: Record<string, any>
    items: FormItem[]
    saving?: boolean
    width?: string
    labelWidth?: string
    span?: number
    submitText?: string
    alertTitle?: string
    alertType?: 'success' | 'warning' | 'info' | 'error'
  }

  const props = withDefaults(defineProps<Props>(), {
    saving: false,
    width: '560px',
    labelWidth: '92px',
    span: 24,
    submitText: '保存',
    alertTitle: '',
    alertType: 'info'
  })
  const emit = defineEmits<{ submit: [] }>()
  const dialogVisible = defineModel<boolean>('visible', { default: false })
  const formModel = computed({
    get: () => props.form,
    set: (value) => Object.assign(props.form, value)
  })
</script>

<style scoped>
  .dialog-alert {
    margin-bottom: 12px;
  }
</style>
