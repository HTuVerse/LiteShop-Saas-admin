<template>
  <ArtSearchBar
    ref="searchBarRef"
    v-model="formData"
    :items="formItems"
    :rules="rules"
    @reset="handleReset"
    @search="handleSearch"
  />
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { ElMessage } from 'element-plus'
  import { fetchGetLevelList } from '@/api/system-manage'

  interface Props {
    modelValue: Record<string, any>
  }
  interface Emits {
    (e: 'update:modelValue', value: Record<string, any>): void
    (e: 'search', params: Record<string, any>): void
    (e: 'reset'): void
  }
  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  // 表单数据双向绑定
  const searchBarRef = ref()
  const formData = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
  })

  // 校验规则
  const rules = {
    // keyWord: [{ required: true, message: '请输入查询参数(用户名/电话/邮箱)', trigger: 'blur' }]
  }

  // 动态 options
  const levelOptions = ref<{ label: string; value: string; disabled?: boolean }[]>([])

  const fetchLevelOptions = async () => {
    fetchGetLevelList()
      .then((res: any) => {
        levelOptions.value = res.map((item: any) => ({
          label: item.levelName,
          value: item.levelCode
        }))
      })
      .catch((err) => {
        return ElMessage.error(err.message)
      })
  }

  onMounted(() => {
    fetchLevelOptions()
  })

  // 表单配置
  const formItems = computed(() => [
    {
      label: '查询参数',
      key: 'keyWord',
      type: 'input',
      props: { placeholder: '用户名/手机号/邮箱', maxlength: '35' }
    },
    {
      label: '用户等级',
      key: 'level',
      type: 'select',
      props: { placeholder: '请选择等级', options: levelOptions.value }
    }
  ])

  // 事件
  function handleReset() {
    emit('reset')
  }

  async function handleSearch() {
    await searchBarRef.value.validate()
    emit('search', formData.value)
    console.log('表单数据', formData.value)
  }
</script>
