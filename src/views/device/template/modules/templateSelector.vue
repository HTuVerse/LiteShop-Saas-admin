<!-- 打印模板选择器组件 -->
<template>
  <div class="template-selector">
    <ElSelect
      v-model="selectedTemplate"
      placeholder="请选择打印模板"
      clearable
      filterable
      style="width: 100%"
      @change="handleChange"
    >
      <ElOption
        v-for="template in templateList"
        :key="template.id"
        :label="template.templateName"
        :value="template.id"
      >
        <div class="template-option">
          <span>{{ template.templateName }}</span>
          <div class="template-tags">
            <ElTag v-if="isTrue(template.isDefault)" type="success" size="small">默认</ElTag>
            <ElTag size="small">{{ template.paperWidth }}</ElTag>
          </div>
        </div>
      </ElOption>
    </ElSelect>

    <!-- 模板详情弹窗 -->
    <ElDialog v-model="detailVisible" title="模板详情" width="500px" align-center>
      <ElDescriptions v-if="currentTemplate" :column="1" border>
        <ElDescriptionsItem label="模板名称">
          {{ currentTemplate.templateName }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="纸张宽度">
          {{ currentTemplate.paperWidth }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="字体大小">
          {{ ['正常', '中号', '大号'][currentTemplate.fontSize] }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="打印浓度">
          {{ currentTemplate.printDensity }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="打印联数">
          {{ currentTemplate.printCopies }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="显示店铺Logo">
          {{ isEnabled(currentTemplate.showLogo) ? '是' : '否' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="显示支付信息">
          {{ isEnabled(currentTemplate.showPaymentInfo) ? '是' : '否' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="备注">
          {{ currentTemplate.remark || '-' }}
        </ElDescriptionsItem>
      </ElDescriptions>
      <template #footer>
        <ElButton @click="detailVisible = false">关闭</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, watch } from 'vue'
  import { getEnumNumber, StatusTextMap, BooleanTextMap } from '../../utils/enumConverter'

  defineOptions({ name: 'TemplateSelector' })

  const props = defineProps<{
    modelValue?: number
    templateList: any[]
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: number | undefined]
    change: [value: number | undefined]
  }>()

  const selectedTemplate = ref<number | undefined>(props.modelValue)
  const detailVisible = ref(false)
  const currentTemplate = ref<any>(null)

  // 辅助函数：判断枚举是否为启用状态（兼容数字和文字）
  const isEnabled = (value: any) => {
    const num = getEnumNumber(value, StatusTextMap) ?? value
    return num === 1
  }

  // 辅助函数：判断布尔值（兼容数字和文字）
  const isTrue = (value: any) => {
    const num = getEnumNumber(value, BooleanTextMap) ?? value
    return num === 1
  }

  // 监听外部值变化
  watch(
    () => props.modelValue,
    (newVal) => {
      selectedTemplate.value = newVal
    }
  )

  // 值变化时触发
  const handleChange = (value: number | undefined) => {
    emit('update:modelValue', value)
    emit('change', value)
  }

  // 查看模板详情
  const showDetail = (template: any) => {
    currentTemplate.value = template
    detailVisible.value = true
  }
</script>

<style scoped lang="scss">
  .template-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;

    .template-tags {
      display: flex;
      gap: 4px;
    }
  }
</style>
