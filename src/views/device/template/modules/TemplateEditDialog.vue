<!-- 打印模板编辑弹窗组件 -->
<template>
  <ElDialog
    v-model="dialogVisible"
    :title="dialogType === 'add' ? '新建打印模板' : '编辑打印模板'"
    width="1000px"
    :close-on-click-modal="false"
    align-center
    @close="handleClose"
  >
    <div class="template-dialog-content">
      <!-- 左侧表单 -->
      <div class="form-section">
        <ArtForm
          ref="formRef"
          :model="formData"
          :rules="formRules"
          :disabled="storesLoading || submitLoading"
          label-width="140px"
        >
          <ElTabs v-model="activeTab">
            <!-- 基础信息 -->
            <ElTabPane label="基础信息" name="basic">
              <ElFormItem label="模板名称" prop="templateName">
                <ElInput v-model="formData.templateName" placeholder="请输入模板名称" />
              </ElFormItem>

              <ElFormItem label="打印用途" prop="printScene">
                <ElRadioGroup v-model="formData.printScene">
                  <ElRadio value="ORDER">提交订单</ElRadio>
                  <ElRadio value="ADD_ITEMS">加菜</ElRadio>
                </ElRadioGroup>
                <ElText type="info" size="small" class="ml-2">加菜单只打印本次新增菜品</ElText>
              </ElFormItem>

              <ElFormItem label="所属门店" prop="storeId">
                <ElSelect
                  v-model="formData.storeId"
                  placeholder="请选择有管理权限的门店"
                  filterable
                  :loading="storesLoading"
                  :no-data-text="storesError ? '门店加载失败，请重新打开弹窗' : '暂无可管理的门店'"
                  style="width: 100%"
                >
                  <ElOption
                    v-for="store in storeOptions"
                    :key="store.value"
                    :label="store.label"
                    :value="store.value"
                  />
                </ElSelect>
              </ElFormItem>

              <ElFormItem label="纸张宽度" prop="paperWidth">
                <ElRadioGroup v-model="formData.paperWidth">
                  <ElRadio :value="0">58mm</ElRadio>
                  <ElRadio :value="1">80mm</ElRadio>
                </ElRadioGroup>
              </ElFormItem>

              <ElFormItem label="打印联数" prop="printCopies">
                <ElInputNumber v-model="formData.printCopies" :min="1" :max="5" />
              </ElFormItem>

              <ElFormItem label="备注说明" prop="remark">
                <ElInput
                  v-model="formData.remark"
                  type="textarea"
                  :rows="3"
                  placeholder="请输入备注说明"
                />
              </ElFormItem>
            </ElTabPane>

            <!-- 店铺信息 -->
            <ElTabPane label="店铺信息" name="store">
              <ElFormItem label="显示店铺Logo">
                <ElSwitch v-model="formData.showLogo" :active-value="1" :inactive-value="0" />
              </ElFormItem>

              <ElFormItem v-if="formData.showLogo === 1" label="Logo URL" prop="logoUrl">
                <ElInput v-model="formData.logoUrl" placeholder="请输入Logo图片URL"
                  @input="formData.logoResourceId = undefined" />
                <ElButton v-if="userStore.isSuperAdmin" @click="pickerVisible = true">从资源库选择</ElButton>
              </ElFormItem>

              <ElFormItem label="店铺名称样式" prop="storeNameStyle">
                <ElRadioGroup v-model="formData.storeNameStyle">
                  <ElRadio :value="0">普通</ElRadio>
                  <ElRadio :value="1">加粗</ElRadio>
                  <ElRadio :value="2">加粗+居中</ElRadio>
                  <ElRadio :value="3">加粗+居中+放大</ElRadio>
                </ElRadioGroup>
              </ElFormItem>

              <ElFormItem label="显示店铺地址">
                <ElSwitch v-model="formData.showAddress" :active-value="1" :inactive-value="0" />
              </ElFormItem>

              <ElFormItem label="显示联系电话">
                <ElSwitch v-model="formData.showPhone" :active-value="1" :inactive-value="0" />
              </ElFormItem>

              <ElFormItem label="显示营业时间">
                <ElSwitch
                  v-model="formData.showBusinessHours"
                  :active-value="1"
                  :inactive-value="0"
                />
              </ElFormItem>
            </ElTabPane>

            <!-- 订单信息 -->
            <ElTabPane label="订单信息" name="order">
              <ElFormItem label="订单信息字段" prop="orderInfoFields">
                <ElCheckboxGroup v-model="selectedOrderFields">
                  <ElCheckbox value="orderNo">订单号</ElCheckbox>
                  <ElCheckbox value="tableName">桌台名称</ElCheckbox>
                  <ElCheckbox value="orderType">订单类型</ElCheckbox>
                  <ElCheckbox value="diningCount">就餐人数</ElCheckbox>
                  <ElCheckbox value="pickupMode">取餐方式</ElCheckbox>
                  <ElCheckbox value="pickupCode">取餐码</ElCheckbox>
                  <ElCheckbox value="createdAt">下单时间</ElCheckbox>
                </ElCheckboxGroup>
              </ElFormItem>

              <ElFormItem label="取餐码突出显示">
                <ElSwitch v-model="formData.showPickupCode" :active-value="1" :inactive-value="0" />
                <ElText type="info" size="small" class="ml-2">
                  叫号自取订单会在完整小票中突出取餐码
                </ElText>
              </ElFormItem>

              <ElFormItem label="显示订单备注">
                <ElSwitch v-model="formData.showOrderNote" :active-value="1" :inactive-value="0" />
              </ElFormItem>

              <ElFormItem label="显示支付方式、状态与时间">
                <ElSwitch
                  v-model="formData.showPaymentInfo"
                  :active-value="1"
                  :inactive-value="0"
                />
              </ElFormItem>
            </ElTabPane>

            <!-- 菜品信息 -->
            <ElTabPane label="菜品信息" name="dish">
              <ElFormItem label="菜品列表样式" prop="dishListStyle">
                <ElRadioGroup v-model="formData.dishListStyle">
                  <ElRadio :value="0">简约(仅名称、数量、价格)</ElRadio>
                  <ElRadio :value="1">详细(含规格、备注)</ElRadio>
                </ElRadioGroup>
              </ElFormItem>

              <ElFormItem label="显示菜品规格">
                <ElSwitch v-model="formData.showDishSpec" :active-value="1" :inactive-value="0" :disabled="formData.dishListStyle === 0" />
              </ElFormItem>

              <ElFormItem label="显示菜品备注">
                <ElSwitch v-model="formData.showDishNote" :active-value="1" :inactive-value="0" :disabled="formData.dishListStyle === 0" />
              </ElFormItem>
            </ElTabPane>

            <!-- 底部信息 -->
            <ElTabPane label="底部信息" name="footer">
              <ElFormItem label="底部欢迎语" prop="footerText">
                <ElInput
                  v-model="formData.footerText"
                  type="textarea"
                  :rows="3"
                  placeholder="如：谢谢惠顾，欢迎再次光临！"
                />
              </ElFormItem>

              <ElFormItem label="显示二维码">
                <ElSwitch v-model="formData.showQrcode" :active-value="1" :inactive-value="0" />
              </ElFormItem>

              <ElFormItem v-if="formData.showQrcode === 1" label="二维码内容" prop="qrcodeTemplate">
                <ElInput
                  v-model="formData.qrcodeTemplate"
                  placeholder="支持变量：{orderNo}、{storeId}、{tableId}"
                />
                <ElText type="info" size="small">
                  示例：http://yourdomain.com/order/{orderNo}
                </ElText>
              </ElFormItem>

            </ElTabPane>
          </ElTabs>
        </ArtForm>
      </div>

      <!-- 右侧预览 -->
      <div class="preview-section">
        <div class="preview-header">
          <span>实时预览</span>
          <ElButton
            v-auth="[
              'restaurant:printer:print',
              'restaurant:order:print',
              'operations:direct-cashier:print',
              'operations:table-cashier:print'
            ]"
            size="small"
            @click="handleTestPrint"
          >
            <template #icon>
              <Icon icon="ri:printer-line" />
            </template>
            打印当前模板草稿
          </ElButton>
        </div>
        <TemplatePreview :template-data="previewTemplateData" />
      </div>
    </div>

    <ResourcePicker v-if="userStore.isSuperAdmin" v-model="pickerVisible" @select="selectResource" />

    <template #footer>
      <ElButton @click="handleClose">取消</ElButton>
      <ElButton
        type="primary"
        @click="handleSubmit"
        :loading="submitLoading"
        :disabled="storesLoading || storesError || !storeOptions.length"
      >
        确定
      </ElButton>
    </template>
  </ElDialog>

  <!-- 打印机选择对话框 -->
  <ElDialog
    v-model="showPrinterDialog"
    title="选择打印机"
    width="500px"
    :close-on-click-modal="false"
    align-center
  >
    <ArtForm label-width="100px">
      <ElFormItem label="打印机">
        <ElSelect
          v-model="selectedPrinterId"
          placeholder="请选择打印机"
          style="width: 100%"
          filterable
        >
          <ElOption
            v-for="printer in printerList"
            :key="printer.id"
            :label="`${printer.remark || printer.sn} (${printer.sn})`"
            :value="printer.id"
          >
            <div style="display: flex; align-items: center; justify-content: space-between">
              <span>{{ printer.remark || printer.sn }}</span>
              <ElTag
                :type="printer.status === 1 ? 'success' : 'danger'"
                size="small"
                style="margin-left: 8px"
              >
                {{ printer.status === 1 ? '在线' : '离线' }}
              </ElTag>
              <ElTag size="small">{{ printer.paperWidth === 1 ? '80mm' : '58mm' }}</ElTag>
            </div>
          </ElOption>
        </ElSelect>
      </ElFormItem>
      <ElAlert
        v-if="selectedPrinter && (selectedPrinter.paperWidth ?? 0) !== formData.paperWidth"
        title="该打印机实际纸宽与模板不同，试打会按打印机纸宽重新排版"
        type="warning"
        :closable="false"
      />
    </ArtForm>

    <template #footer>
      <ElButton @click="showPrinterDialog = false">取消</ElButton>
      <ElButton
        v-auth="[
          'restaurant:printer:print',
          'restaurant:order:print',
          'operations:direct-cashier:print',
          'operations:table-cashier:print'
        ]"
        type="primary"
        @click="confirmTestPrint"
        >确定</ElButton
      >
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { ref, reactive, watch, computed, nextTick } from 'vue'
  import { ElMessage } from 'element-plus'
  import { Icon } from '@iconify/vue'
  import { DialogType } from '@/types'
  import { createTemplate, updateTemplate } from '@/api/print-template'
  import { testPrint } from '@/api/order-print'
  import { getPrinterPage } from '@/api/printer'
  import TemplatePreview from './TemplatePreview.vue'
  import { convertPrinterToNumber, convertTemplateToNumber } from '../../utils/enumConverter'
  import { useManagedStores } from '../../composables/useManagedStores'
  import type { Id } from '@/types/backend'
  import ResourcePicker from '@/components/business/ResourcePicker.vue'
  import type { ResourceFile } from '@/api/resource-library'
  import { useUserStore } from '@/store/modules/user'

  defineOptions({ name: 'TemplateEditDialog' })

  const props = defineProps<{
    visible: boolean
    dialogType: DialogType
    templateData: any
    initialStoreId?: Id
  }>()

  const emit = defineEmits<{
    'update:visible': [value: boolean]
    submit: []
    addSuccess: []
    editSuccess: []
  }>()

  const dialogVisible = computed({
    get: () => props.visible,
    set: (val) => emit('update:visible', val)
  })

  const activeTab = ref('basic')
  const userStore = useUserStore()
  const pickerVisible = ref(false)
  function selectResource(file: ResourceFile) {
    if (!file.url) return
    formData.logoUrl = file.url
    formData.logoResourceId = file.id
  }
  const formRef = ref()
  const submitLoading = ref(false)
  const selectedOrderFields = ref<string[]>([])
  const defaultOrderFields = ['orderNo', 'tableName', 'orderType', 'createdAt']
  const supportedOrderFields = new Set([
    ...defaultOrderFields, 'diningCount', 'pickupMode', 'pickupCode'
  ])
  const showPrinterDialog = ref(false)
  const selectedPrinterId = ref<number | undefined>(undefined)
  const printerList = ref<any[]>([])
  const selectedPrinter = computed(() =>
    printerList.value.find((printer) => String(printer.id) === String(selectedPrinterId.value))
  )
  const previewTemplateData = computed(() => ({
    ...formData,
    paperWidth: selectedPrinter.value?.paperWidth ?? formData.paperWidth
  }))
  const {
    storeOptions,
    storesLoading,
    storesError,
    loadStores,
    resolveStoreId,
    defaultStoreId,
    storeRules
  } = useManagedStores()

  const formData = reactive({
    id: undefined as number | undefined,
    templateName: '',
    printScene: 'ORDER',
    storeId: undefined as string | undefined,
    paperWidth: 0,
    showLogo: 0,
    logoUrl: '',
    logoResourceId: undefined as string | undefined,
    storeNameStyle: 2,
    showAddress: 1,
    showPhone: 1,
    showBusinessHours: 0,
    orderInfoFields: JSON.stringify(defaultOrderFields),
    dishListStyle: 1,
    showDishImage: 0,
    showDishSpec: 1,
    showDishNote: 1,
    showOrderNote: 1,
    showPaymentInfo: 1,
    showPickupCode: 0,
    footerText: '谢谢惠顾，欢迎再次光临！',
    showQrcode: 0,
    qrcodeTemplate: '',
    qrcodeSize: 2,
    fontSize: 0,
    printDensity: 8,
    printCopies: 1,
    isDefault: 0,
    enabled: 1,
    remark: ''
  })

  const formRules = {
    storeId: storeRules,
    templateName: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
    printScene: [{ required: true, message: '请选择打印用途', trigger: 'change' }],
    paperWidth: [{ required: true, message: '请选择纸张宽度', trigger: 'change' }]
  }

  // 监听模板数据变化
  watch(
    () => [props.visible, props.templateData] as const,
    async ([visible, newVal], _previous, onCleanup) => {
      if (!visible) return
      let active = true
      onCleanup(() => {
        active = false
      })
      resetForm()
      if (props.dialogType === 'edit' && newVal) {
        // 将文字枚举转换为数字枚举
        const convertedData = convertTemplateToNumber(newVal)
        Object.assign(formData, convertedData)
        formData.storeId = newVal.storeId == null ? undefined : String(newVal.storeId)

        // 解析订单字段
        if (newVal.orderInfoFields) {
          try {
            const fields = JSON.parse(newVal.orderInfoFields)
            selectedOrderFields.value = Array.isArray(fields)
              ? fields.filter(
                  (field: unknown): field is string =>
                    typeof field === 'string' && supportedOrderFields.has(field)
                )
              : [...defaultOrderFields]
          } catch {
            selectedOrderFields.value = [...defaultOrderFields]
          }
        }
      }
      await loadStores()
      if (!active) return
      if (props.dialogType === 'edit' && newVal) {
        formData.storeId = resolveStoreId(newVal.storeId)
      } else {
        formData.storeId = resolveStoreId(props.initialStoreId) ?? defaultStoreId.value
      }
      await nextTick()
      formRef.value?.clearValidate()
    },
    { immediate: true }
  )

  // 监听订单字段选择变化
  watch(
    selectedOrderFields,
    (newVal) => {
      formData.orderInfoFields = JSON.stringify(newVal)
    },
    { deep: true }
  )

  // 重置表单
  function resetForm() {
    Object.assign(formData, {
      id: undefined,
      templateName: '',
      printScene: 'ORDER',
      storeId: undefined,
      paperWidth: 0,
      showLogo: 0,
      logoUrl: '',
      logoResourceId: undefined,
      storeNameStyle: 2,
      showAddress: 1,
      showPhone: 1,
      showBusinessHours: 0,
      orderInfoFields: JSON.stringify(defaultOrderFields),
      dishListStyle: 1,
      showDishImage: 0,
      showDishSpec: 1,
      showDishNote: 1,
      showOrderNote: 1,
      showPaymentInfo: 1,
      showPickupCode: 0,
      footerText: '谢谢惠顾,欢迎再次光临！',
      showQrcode: 0,
      qrcodeTemplate: '',
      qrcodeSize: 2,
      fontSize: 0,
      printDensity: 8,
      printCopies: 1,
      isDefault: 0,
      enabled: 1,
      remark: ''
    })
    selectedOrderFields.value = [...defaultOrderFields]
    activeTab.value = 'basic'
  }

  // 提交表单
  const handleSubmit = async () => {
    if (storesLoading.value || storesError.value || submitLoading.value) return
    submitLoading.value = true
    try {
      await formRef.value?.validate()

      // 准备提交数据，确保 showPickupCode 是数字类型
      const submitData = {
        ...formData,
        showPickupCode: Number(formData.showPickupCode)
      }

      if (props.dialogType === 'add') {
        await createTemplate(submitData)
        ElMessage.success('创建成功')
        emit('addSuccess')
      } else {
        await updateTemplate(submitData)
        ElMessage.success('更新成功')
        emit('editSuccess')
      }

      emit('submit')
      handleClose()
    } catch (error) {
      console.error('表单验证失败', error)
    } finally {
      submitLoading.value = false
    }
  }

  // 关闭弹窗
  const handleClose = () => {
    formRef.value?.clearValidate()
    dialogVisible.value = false
  }

  // 测试打印
  const handleTestPrint = async () => {
    try {
      // 获取可用的打印机列表
      const printerResult: any = await getPrinterPage({
        currentPage: 1,
        pageSize: 100,
        storeId: formData.storeId ?? undefined,
        status: undefined
      })

      if (!printerResult.records || printerResult.records.length === 0) {
        ElMessage.warning('没有可用的打印机')
        return
      }

      // 设置打印机列表并打开对话框
      printerList.value = printerResult.records.map((printer: any) =>
        convertPrinterToNumber(printer)
      )
      selectedPrinterId.value = undefined
      showPrinterDialog.value = true
    } catch (error: any) {
      console.error('获取打印机列表失败', error)
      ElMessage.error('获取打印机列表失败')
    }
  }

  // 确认测试打印
  const confirmTestPrint = async () => {
    if (!selectedPrinterId.value) {
      ElMessage.warning('请选择打印机')
      return
    }

    try {
      await testPrint({
        printerId: selectedPrinterId.value,
        template: { ...formData }
      })
      ElMessage.success('当前模板草稿已提交打印，请检查小票内容')
      showPrinterDialog.value = false
    } catch (error: any) {
      console.error('测试打印失败', error)
      ElMessage.error('测试打印失败')
    }
  }
</script>

<style scoped lang="scss">
  .template-dialog-content {
    display: flex;
    gap: 20px;
    max-height: 70vh; // 改为最大高度，避免超出视口
    overflow: hidden; // 父容器不滚动
  }

  .form-section {
    display: flex;
    flex: 1;
    flex-direction: column;
    overflow: hidden;
  }

  .preview-section {
    display: flex;
    flex-direction: column;
    flex: 0 0 420px;
    min-width: 0;
    padding-left: 20px;
    overflow: hidden; // 防止预览区撑开弹窗
    border-left: 1px solid #e4e7ed;

    .preview-header {
      display: flex;
      flex-shrink: 0; // 标题不收缩
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      font-weight: bold;
    }
  }

  :deep(.el-tabs__content) {
    max-height: calc(70vh - 100px); // 根据弹窗高度调整
    overflow-y: auto;

    // 隐藏滚动条但保持滚动功能
    scrollbar-width: none; // Firefox
    -ms-overflow-style: none; // IE 10+

    &::-webkit-scrollbar {
      display: none; // Chrome, Safari, Edge
    }
  }
</style>
