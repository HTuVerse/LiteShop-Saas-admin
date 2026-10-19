<template>
  <ElDialog
    v-model="dialogVisible"
    :title="title"
    width="420px"
    destroy-on-close
    align-center
    @close="handleClose"
  >
    <ArtForm label-width="80px">
      <ElFormItem label="打印机">
        <ElSelect
          v-model="form.printerId"
          placeholder="不选则使用门店默认打印机"
          clearable
          style="width: 100%"
        >
          <ElOption
            v-for="p in printerList"
            :key="p.id"
            :label="p.remark || p.printerName || p.sn"
            :value="p.id"
          />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="打印模板">
        <ElSelect
          v-model="form.templateId"
          placeholder="不选则优先使用打印机绑定模板"
          clearable
          style="width: 100%"
        >
          <ElOption v-for="t in templateList" :key="t.id" :label="t.templateName" :value="t.id" />
        </ElSelect>
      </ElFormItem>
    </ArtForm>
    <template #footer>
      <ElButton @click="dialogVisible = false">取消</ElButton>
      <ElButton
        v-auth="[
          'restaurant:printer:print',
          'restaurant:order:print',
          'operations:direct-cashier:print',
          'operations:table-cashier:print'
        ]"
        type="primary"
        :loading="printing"
        @click="handlePrint"
      >
        打印
      </ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import { ElDialog, ElFormItem, ElSelect, ElOption, ElButton, ElMessage } from 'element-plus'
  import { printOrder } from '@/api/order-print'
  import { getPrinterListByStore } from '@/api/printer'
  import { getTemplatePage } from '@/api/print-template'

  const props = withDefaults(
    defineProps<{
      visible: boolean
      orderId: string | number | null
      storeId?: string | number | null
      title?: string
    }>(),
    { title: '小票打印', storeId: null }
  )

  const emit = defineEmits<{
    (e: 'update:visible', v: boolean): void
    (e: 'success'): void
  }>()

  const dialogVisible = computed({
    get: () => props.visible,
    set: (v) => emit('update:visible', v)
  })

  const form = ref({
    printerId: undefined as number | undefined,
    templateId: undefined as number | undefined
  })
  const printerList = ref<any[]>([])
  const templateList = ref<any[]>([])
  const printing = ref(false)

  const loadPrinters = async () => {
    if (!props.storeId) return
    try {
      const res = await getPrinterListByStore(props.storeId)
      printerList.value = Array.isArray(res) ? res : ((res as any)?.data ?? res?.list ?? [])
    } catch {
      printerList.value = []
    }
  }

  const loadTemplates = async () => {
    try {
      const res = await getTemplatePage({ currentPage: 1, pageSize: 100, enabled: 1 })
      const list = (res as any)?.records ?? (res as any)?.data?.records ?? (res as any)?.list ?? []
      templateList.value = Array.isArray(list)
        ? list.filter(
            (template) =>
              (template.printScene == null || template.printScene === 'ORDER') &&
              (template.storeId == null || String(template.storeId) === String(props.storeId))
          )
        : []
    } catch {
      templateList.value = []
    }
  }

  watch(
    () => props.visible,
    (visible) => {
      if (visible) {
        form.value = { printerId: undefined, templateId: undefined }
        loadPrinters()
        loadTemplates()
      }
    }
  )

  const handlePrint = async () => {
    const orderId = props.orderId
    if (!orderId) {
      ElMessage.warning('订单ID不存在')
      return
    }
    printing.value = true
    try {
      await printOrder({
        orderId,
        printerId: form.value.printerId,
        templateId: form.value.templateId
      })
      ElMessage.success('打印任务已提交，请等待打印机出纸')
      emit('success')
      dialogVisible.value = false
    } catch (error) {
      console.error('提交打印任务失败', error)
    } finally {
      printing.value = false
    }
  }

  const handleClose = () => {
    emit('update:visible', false)
  }
</script>
