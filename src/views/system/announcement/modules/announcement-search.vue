<template>
  <ArtSearchBar
    ref="searchRef"
    v-model="formData"
    :items="items"
    @search="emit('search', formData)"
    @reset="emit('reset')"
  />
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'

  const props = defineProps<{ modelValue: Record<string, any> }>()
  const emit = defineEmits<{
    'update:modelValue': [value: Record<string, any>]
    search: [value: Record<string, any>]
    reset: []
  }>()
  const searchRef = ref()
  const formData = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })
  const items = [
    {
      label: '公告关键词',
      key: 'keyword',
      type: 'input',
      props: { clearable: true, placeholder: '搜索标题或内容', maxlength: 100 }
    },
    {
      label: '公告状态',
      key: 'status',
      type: 'select',
      props: {
        clearable: true,
        placeholder: '全部状态',
        options: [
          { label: '草稿', value: 'DRAFT' },
          { label: '已发布', value: 'PUBLISHED' },
          { label: '已撤回', value: 'WITHDRAWN' }
        ]
      }
    }
  ]
</script>
