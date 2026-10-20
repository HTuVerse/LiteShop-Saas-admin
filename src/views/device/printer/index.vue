<!-- 打印机管理页面 -->
<template>
  <div class="printer-page art-full-height">
    <!-- 搜索栏 -->
    <PrinterSearch
      :model-value="searchForm"
      @update:model-value="(value) => Object.assign(searchForm, value)"
      @search="handleSearch"
      @reset="handleReset"
    />

    <ElCard class="art-table-card" shadow="never">
      <!-- 表格头部 -->
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElSpace wrap>
            <ElButton
              v-auth="'restaurant:printer:add'"
              type="primary"
              @click="showDialog('add')"
              v-ripple
            >
              <template #icon>
                <Icon icon="ri:add-line" />
              </template>
              添加打印机
            </ElButton>
            <ElButton v-auth="'restaurant:printer:sync'" @click="handleSyncAll" v-ripple>
              <template #icon>
                <Icon icon="ri:refresh-line" />
              </template>
              同步所有状态
            </ElButton>
          </ElSpace>
        </template>
      </ArtTableHeader>

      <!-- 表格 -->
      <ArtTable
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      >
      </ArtTable>
    </ElCard>

    <!-- 添加/编辑打印机弹窗 -->
    <ElDialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '添加打印机' : '编辑打印机'"
      width="1000px"
      :close-on-click-modal="false"
      align-center
    >
      <div class="printer-dialog-content">
        <!-- 左侧表单 -->
        <div class="form-section">
          <ArtForm
            ref="formRef"
            :model="formData"
            :rules="formRules"
            :disabled="dialogLoading || submitLoading"
            label-width="120px"
          >
            <ElFormItem label="打印机编号" prop="sn">
              <ElInput
                v-model="formData.sn"
                placeholder="请输入打印机编号"
                :disabled="dialogType === 'edit'"
              />
            </ElFormItem>
            <ElFormItem v-if="dialogType === 'add'" label="识别码" prop="printerKey">
              <ElInput v-model="formData.printerKey" placeholder="请输入打印机识别码" />
            </ElFormItem>
            <ElFormItem label="备注名称" prop="remark">
              <ElInput v-model="formData.remark" placeholder="请输入备注名称" />
            </ElFormItem>
            <ElFormItem label="流量卡号" prop="cardNum">
              <ElInput v-model="formData.cardNum" placeholder="请输入流量卡号码" />
            </ElFormItem>
            <ElFormItem label="所属门店" prop="storeId">
              <ElSelect
                v-model="formData.storeId"
                placeholder="请选择有管理权限的门店"
                filterable
                :loading="storesLoading"
                :disabled="dialogLoading || submitLoading"
                :no-data-text="storesError ? '门店加载失败，请重新打开弹窗' : '暂无可管理的门店'"
                style="width: 100%"
                @change="handleStoreChange"
              >
                <ElOption
                  v-for="store in storeOptions"
                  :key="store.value"
                  :label="store.label"
                  :value="store.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="打印机品牌" prop="printerBrand">
              <ElSelect
                v-model="formData.printerBrand"
                placeholder="请选择打印机品牌"
                clearable
                style="width: 100%"
              >
                <ElOption label="飞鹅" :value="1" />
                <ElOption label="其它" :value="2" />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="打印机类型" prop="printerType">
              <ElRadioGroup v-model="formData.printerType">
                <ElRadio :value="1">小票机</ElRadio>
                <ElRadio :value="2">标签机</ElRadio>
              </ElRadioGroup>
            </ElFormItem>
            <ElFormItem label="实际纸张宽度" prop="paperWidth">
              <ElRadioGroup v-model="formData.paperWidth">
                <ElRadio :value="0">58mm</ElRadio>
                <ElRadio :value="1">80mm</ElRadio>
              </ElRadioGroup>
            </ElFormItem>
            <ElFormItem label="打印模板" prop="templateId">
              <ElSelect
                v-model="formData.templateId"
                placeholder="请选择这台打印机固定使用的模板"
                filterable
                :disabled="!formData.storeId || dialogLoading"
                style="width: 100%"
                @change="handleTemplateChange"
              >
                <ElOption
                  v-if="hasUnavailableTemplate"
                  :value="formData.templateId ?? ''"
                  label="原模板不可用，请重新选择"
                  disabled
                />
                <ElOption
                  v-for="template in availableTemplates"
                  :key="template.id"
                  :label="template.templateName"
                  :value="template.id"
                >
                  <div style="display: flex; align-items: center; justify-content: space-between">
                    <span>{{ template.templateName }}</span>
                    <div style="display: flex; gap: 4px">
                      <ElTag v-if="template.isDefault === 1" type="success" size="small">
                        默认
                      </ElTag>
                      <ElTag size="small">{{ template.paperWidth === 1 ? '80mm' : '58mm' }}</ElTag>
                    </div>
                  </div>
                </ElOption>
              </ElSelect>
              <ElText type="info" size="small" class="mt-1" style="display: block">
                首次下单与后续加菜都使用此模板；加菜只打印本次新增菜品
              </ElText>
            </ElFormItem>
          </ArtForm>
        </div>

        <!-- 右侧模板预览 -->
        <div class="preview-section">
          <div class="preview-header">
            <span>模板预览</span>
            <ElButton
              v-if="selectedTemplateData"
              size="small"
              type="primary"
              @click="handleViewTemplateDetail"
            >
              <template #icon>
                <Icon icon="ri:eye-line" />
              </template>
              查看详情
            </ElButton>
          </div>
          <div v-if="selectedTemplateData" class="preview-wrapper">
            <ElAlert
              v-if="selectedTemplateData.paperWidth !== formData.paperWidth"
              title="模板纸宽与设备不同，实际打印按设备纸宽排版"
              type="warning"
              :closable="false"
            />
            <TemplatePreview :template-data="effectivePreviewTemplate" />
          </div>
          <ElEmpty v-else description="请选择打印模板以查看预览" :image-size="120" />
        </div>
      </div>

      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton
          type="primary"
          @click="handleSubmit"
          :loading="submitLoading"
          :disabled="dialogLoading || storesError || !storeOptions.length"
        >
          确定
        </ElButton>
      </template>
    </ElDialog>

    <!-- 模板详情弹窗 -->
    <ElDialog v-model="templateDetailVisible" title="模板详情" width="500px" align-center>
      <ElDescriptions v-if="selectedTemplateData" :column="1" border>
        <ElDescriptionsItem label="模板名称">
          {{ selectedTemplateData.templateName }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="模板纸宽">
          {{ selectedTemplateData.paperWidth === 1 ? '80mm' : '58mm' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="实际打印纸宽">
          {{ formData.paperWidth === 1 ? '80mm' : '58mm' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="打印联数">
          {{ selectedTemplateData.printCopies || 1 }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="显示店铺Logo">
          {{ selectedTemplateData.showLogo === 1 ? '是' : '否' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="显示菜品规格">
          {{ selectedTemplateData.showDishSpec === 1 ? '是' : '否' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="显示支付信息">
          {{ selectedTemplateData.showPaymentInfo === 1 ? '是' : '否' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="底部欢迎语">
          {{ selectedTemplateData.footerText || '-' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="备注">
          {{ selectedTemplateData.remark || '-' }}
        </ElDescriptionsItem>
      </ElDescriptions>
      <template #footer>
        <ElButton @click="templateDetailVisible = false">关闭</ElButton>
      </template>
    </ElDialog>

    <!-- 订单统计弹窗 -->
    <ElDialog v-model="orderDialogVisible" title="订单统计" width="500px" align-center>
      <ArtForm label-width="100px">
        <ElFormItem label="打印机编号">
          <ElText>{{ currentPrinter.sn }}</ElText>
        </ElFormItem>
        <ElFormItem label="选择日期">
          <ElDatePicker
            v-model="orderDate"
            type="date"
            placeholder="选择日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
            @change="handleQueryOrderInfo"
          />
        </ElFormItem>
        <ElDivider />
        <ElFormItem label="成功数量">
          <ElTag type="primary" size="large">{{ orderInfo.successCount || 0 }}</ElTag>
        </ElFormItem>
        <ElFormItem label="失败数量">
          <ElTag type="danger" size="large">{{ orderInfo.failCount || 0 }}</ElTag>
        </ElFormItem>
      </ArtForm>
      <template #footer>
        <ElButton @click="orderDialogVisible = false">关闭</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, h, nextTick, computed } from 'vue'
  import { useTable } from '@/hooks/core/useTable'
  import { ElTag, ElButton, ElSpace, ElMessageBox, ElMessage } from 'element-plus'
  import { Icon } from '@iconify/vue'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import { DialogType } from '@/types'
  import {
    getPrinterPage,
    addPrinter,
    updatePrinter,
    deletePrinter,
    queryPrinterStatus,
    updatePrinterEnabled,
    syncAllPrinterStatus,
    queryOrderInfoByDate
  } from '@/api/printer'
  import { getTemplatePage, getTemplateById } from '@/api/print-template'
  import { testPrint } from '@/api/order-print'
  import TemplatePreview from '../template/modules/TemplatePreview.vue'
  import PrinterSearch from './components/printer-search.vue'
  import { convertPrinterToNumber, StatusTextMap, getEnumNumber } from '../utils/enumConverter'
  import { useManagedStores } from '../composables/useManagedStores'
  import type { Id } from '@/types/backend'
  import type { FormRules } from 'element-plus'

  const statusLoading = ref(false)
  const testingPrinterId = ref<Id>()
  defineOptions({ name: 'PrinterManage' })

  // 搜索表单
  const searchForm = reactive({
    storeId: undefined as Id | undefined,
    printerBrand: undefined as number | undefined,
    status: undefined as number | undefined
  })

  // 弹窗相关
  const dialogType = ref<DialogType>('add')
  const dialogVisible = ref(false)
  const submitLoading = ref(false)
  const dialogLoading = ref(false)
  const {
    storeOptions,
    storesLoading,
    storesError,
    loadStores,
    resolveStoreId,
    defaultStoreId,
    storeRules
  } = useManagedStores()
  const formRef = ref()
  const templateList = ref<any[]>([])
  const selectedTemplateData = ref<any>(null)
  const effectivePreviewTemplate = computed(() =>
    selectedTemplateData.value
      ? { ...selectedTemplateData.value, paperWidth: formData.paperWidth }
      : null
  )
  const templateDetailVisible = ref(false)
  const formData = reactive({
    id: undefined as number | undefined,
    sn: '',
    printerKey: '',
    remark: '',
    cardNum: '',
    storeId: undefined as string | undefined,
    printerBrand: undefined as number | undefined,
    printerType: 1,
    paperWidth: 0,
    templateId: undefined as number | undefined
  })

  // 表单验证规则
  const formRules: FormRules = {
    storeId: storeRules,
    paperWidth: [{ required: true, message: '请选择打印机实际纸张宽度', trigger: 'change' }],
    templateId: [
      {
        trigger: 'change',
        validator: (_rule, value, callback) => {
          if (!value)
            callback(new Error('请选择这台打印机使用的打印模板'))
          else if (hasUnavailableTemplate.value)
            callback(new Error('请重新选择当前门店适用的打印模板'))
          else callback()
        }
      }
    ],
    sn: [{ required: true, message: '请输入打印机编号', trigger: 'blur' }],
    printerKey: [
      {
        trigger: 'blur',
        validator: (_rule, value, callback) => {
          if (dialogType.value === 'add' && !String(value || '').trim())
            callback(new Error('请输入打印机识别码'))
          else callback()
        }
      }
    ]
  }

  // 订单统计相关
  const orderDialogVisible = ref(false)
  const currentPrinter = ref<any>({})
  const orderDate = ref('')
  const orderInfo = reactive({
    successCount: 0,
    failCount: 0
  })

  // 打印机状态配置（支持数字和文字）
  const PRINTER_STATUS_CONFIG = {
    // 数字状态（兼容旧版）
    0: { type: 'info' as const, text: '离线' },
    1: { type: 'success' as const, text: '在线' },
    2: { type: 'warning' as const, text: '缺纸' },
    // 文字状态（新版）
    离线: { type: 'info' as const, text: '离线' },
    在线: { type: 'success' as const, text: '在线' },
    缺纸: { type: 'warning' as const, text: '缺纸' }
  }

  // 打印机品牌配置（支持数字和文字）
  const PRINTER_BRAND_CONFIG = {
    // 数字品牌（兼容旧版）
    1: { type: 'primary' as const, text: '飞鹅' },
    2: { type: 'info' as const, text: '其它' },
    // 文字品牌（新版）
    飞鹅: { type: 'primary' as const, text: '飞鹅' },
    其它: { type: 'info' as const, text: '其它' }
  }

  // 打印机类型配置（支持数字和文字）
  const PRINTER_TYPE_CONFIG = {
    // 数字类型（兼容旧版）
    1: { type: 'primary' as const, text: '小票机' },
    2: { type: 'success' as const, text: '标签机' },
    // 文字类型（新版）
    小票机: { type: 'primary' as const, text: '小票机' },
    标签机: { type: 'success' as const, text: '标签机' }
  }

  // 启用状态配置
  const PRINTER_ENABLED_CONFIG = {
    // 数字状态（兼容旧版）
    0: { type: 'danger' as const, text: '禁用' },
    1: { type: 'success' as const, text: '正常' },
    // 文字状态（新版）
    禁用: { type: 'danger' as const, text: '禁用' },
    正常: { type: 'success' as const, text: '正常' }
  }

  // 获取状态配置
  const getStatusConfig = (status: number | string) => {
    return (
      PRINTER_STATUS_CONFIG[status as keyof typeof PRINTER_STATUS_CONFIG] || {
        type: 'info' as const,
        text: '未知'
      }
    )
  }

  // 获取品牌配置
  const getBrandConfig = (brand: number | string) => {
    return (
      PRINTER_BRAND_CONFIG[brand as keyof typeof PRINTER_BRAND_CONFIG] || {
        type: 'info' as const,
        text: '未知'
      }
    )
  }

  // 获取类型配置
  const getTypeConfig = (type: number | string) => {
    return (
      PRINTER_TYPE_CONFIG[type as keyof typeof PRINTER_TYPE_CONFIG] || {
        type: 'info' as const,
        text: '未知'
      }
    )
  }

  // 获取启用状态配置
  const getEnabledConfig = (enabled: number | string) => {
    return (
      PRINTER_ENABLED_CONFIG[enabled as keyof typeof PRINTER_ENABLED_CONFIG] || {
        type: 'info' as const,
        text: '未知'
      }
    )
  }

  // useTable 配置
  const {
    columns,
    columnChecks,
    data,
    loading,
    pagination,
    getData,
    resetSearchParams,
    handleSizeChange,
    handleCurrentChange,
    refreshData,
    refreshCreate,
    refreshRemove,
    refreshUpdate
  } = useTable({
    core: {
      apiFn: getPrinterPage,
      apiParams: {
        currentPage: 1,
        pageSize: 10,
        storeId: searchForm.storeId,

        status: searchForm.status
      },
      paginationKey: {
        current: 'currentPage',
        size: 'pageSize'
      },
      columnsFactory: () => [
        { type: 'index', width: 60, label: '序号' },
        { prop: 'sn', label: '打印机编号', width: 150 },
        { prop: 'remark', label: '备注名称', width: 150 },
        {
          prop: 'printerBrand',
          label: '打印机品牌',
          width: 120,
          formatter: (row: any) => {
            const config = getBrandConfig(row.printerBrand)
            return h(ElTag, { type: config.type }, { default: () => config.text })
          }
        },
        {
          prop: 'printerType',
          label: '打印机类型',
          width: 120,
          formatter: (row: any) => {
            const config = getTypeConfig(row.printerType)
            return h(ElTag, { type: config.type }, { default: () => config.text })
          }
        },
        {
          prop: 'paperWidth',
          label: '实际纸宽',
          width: 100,
          formatter: (row: any) => row.paperWidth === 1 ? '80mm' : '58mm'
        },
        {
          prop: 'status',
          label: '在线状态',
          width: 100,
          formatter: (row: any) => {
            const config = getStatusConfig(row.status)
            return h(ElTag, { type: config.type }, { default: () => config.text })
          }
        },
        {
          prop: 'enabled',
          label: '启用状态',
          width: 100,
          formatter: (row: any) => {
            const config = getEnabledConfig(row.enabled)
            return h(ElTag, { type: config.type }, { default: () => config.text })
          }
        },
        { prop: 'storeId', label: '门店ID', width: 100 },
        { prop: 'cardNum', label: '流量卡号', width: 120 },
        { prop: 'lastOnlineTime', label: '最后在线', width: 160 },
        { prop: 'updatedAt', label: '更新时间', width: 160 },
        {
          prop: 'operation',
          label: '操作',
          width: 140,
          fixed: 'right',
          formatter: (row: any) =>
            h(
              ElSpace,
              { wrap: true },
              {
                default: () => [
                  h(ArtButtonTable, {
                    auth: 'restaurant:printer:print',
                    label: '试打绑定模板',
                    icon: 'ri:printer-line',
                    iconColor: '#409eff',
                    buttonBgColor: '#ecf5ff',
                    disabled: testingPrinterId.value === row.id,
                    onClick: () => handleTestPrint(row)
                  }),
                  h(ArtButtonTable, {
                    icon: 'ri:refresh-line',
                    iconColor: '#67c23a',
                    buttonBgColor: '#f0f9eb',
                    onClick: () => handleRefreshStatus(row)
                  }),
                  h(ArtButtonTable, {
                    auth: 'restaurant:printer:status',
                    icon:
                      row.enabled === '正常' || row.enabled === 1
                        ? 'ion:ban'
                        : 'majesticons:unlock-open-line',
                    iconColor: row.enabled === '正常' || row.enabled === 1 ? '#e6a23c' : '#67c23a',
                    buttonBgColor:
                      row.enabled === '正常' || row.enabled === 1 ? '#fdf6ec' : '#f0f9eb',
                    onClick: () => handleToggleEnabled(row)
                  }),
                  h(ArtButtonTable, {
                    icon: 'ri:bar-chart-box-line',
                    iconColor: '#909399',
                    buttonBgColor: '#f4f4f5',
                    onClick: () => showOrderDialog(row)
                  }),
                  h(ArtButtonTable, {
                    auth: 'restaurant:printer:edit',
                    type: 'edit',
                    onClick: () => showDialog('edit', row)
                  }),
                  h(ArtButtonTable, {
                    auth: 'restaurant:printer:delete',
                    type: 'delete',
                    onClick: () => handleDelete(row)
                  })
                ]
              }
            )
        }
      ]
    }
  })

  // 搜索
  const handleSearch = () => {
    const params: any = {
      currentPage: 1
    }
    if (searchForm.storeId) {
      params.storeId = searchForm.storeId
    }
    if (searchForm.printerBrand !== undefined) {
      params.printerBrand = searchForm.printerBrand
    }
    if (searchForm.status !== undefined) {
      params.status = searchForm.status
    }
    getData(params)
  }

  // 重置
  const handleReset = () => {
    searchForm.storeId = undefined as number | undefined
    searchForm.printerBrand = undefined
    searchForm.status = undefined
    resetSearchParams()
  }

  const availableTemplates = computed(() =>
    formData.storeId
      ? templateList.value.filter(
          (template) =>
            (template.storeId == null || String(template.storeId) === formData.storeId)
        )
      : []
  )

  const handleStoreChange = () => {
    formData.templateId = undefined
    selectedTemplateData.value = null
  }

  const hasUnavailableTemplate = computed(
    () =>
      formData.templateId != null &&
      !availableTemplates.value.some(
        (template) => String(template.id) === String(formData.templateId)
      )
  )

  // 取齐有权查看的模板，选择时仅展示当前门店和可用的商户通用模板。
  const loadTemplateList = async () => {
    templateList.value = []
    try {
      const records: any[] = []
      let currentPage = 1
      for (;;) {
        const result: any = await getTemplatePage({ currentPage, pageSize: 100, enabled: 1 })
        records.push(...result.records)
        if (!result.records.length || records.length >= result.total) break
        currentPage++
      }
      templateList.value = records
    } catch (error) {
      console.error('加载模板列表失败', error)
    }
  }

  // 加载模板详情
  const loadTemplateDetail = async (templateId: number) => {
    try {
      const result: any = await getTemplateById(templateId)
      if (result && String(formData.templateId) === String(templateId)) {
        selectedTemplateData.value = result
      }
    } catch (error) {
      console.error('加载模板详情失败', error)
      if (String(formData.templateId) === String(templateId)) selectedTemplateData.value = null
    }
  }

  // 模板选择变化
  const handleTemplateChange = async (templateId: number | undefined) => {
    if (templateId) {
      await loadTemplateDetail(templateId)
    } else {
      selectedTemplateData.value = null
    }
  }

  // 查看模板详情
  const handleViewTemplateDetail = () => {
    templateDetailVisible.value = true
  }

  // 显示弹窗
  const showDialog = async (type: DialogType, row?: any) => {
    if (dialogLoading.value || submitLoading.value) return
    dialogType.value = type
    dialogLoading.value = true
    selectedTemplateData.value = null
    dialogVisible.value = true
    await Promise.all([loadStores(), loadTemplateList()])

    if (type === 'edit' && row) {
      // 编辑时需要转换文字枚举为数字枚举
      const convertedRow = convertPrinterToNumber(row)
      Object.assign(formData, convertedRow)
      formData.paperWidth = row.paperWidth ?? 0
      // printerKey 是只写字段，查询不会返回；编辑时保持为空且绝不回传。
      formData.printerKey = ''
      formData.storeId = resolveStoreId(row.storeId)

      // 如果有模板ID，加载模板详情
      if (
        row.templateId &&
        availableTemplates.value.some((item) => String(item.id) === String(row.templateId))
      ) {
        await loadTemplateDetail(row.templateId)
      } else {
        selectedTemplateData.value = null
      }
    } else {
      // 重置表单
      Object.assign(formData, {
        id: undefined,
        sn: '',
        printerKey: '',
        remark: '',
        cardNum: '',
        storeId: resolveStoreId(searchForm.storeId) ?? defaultStoreId.value,
        printerBrand: undefined,
        printerType: 1,
        paperWidth: 0,
        templateId: undefined
      })
      selectedTemplateData.value = null
    }
    dialogLoading.value = false
    await nextTick()
    formRef.value?.clearValidate()
  }

  // 提交表单
  const handleSubmit = async () => {
    if (dialogLoading.value || submitLoading.value) return
    submitLoading.value = true
    try {
      await formRef.value?.validate()

      // 准备提交数据：只提交必要字段
      const submitData: Api.Device.PrinterFormParams & { paperWidth: number } = {
        id: formData.id,
        sn: formData.sn,
        remark: formData.remark,
        cardNum: formData.cardNum,
        storeId: formData.storeId,
        printerBrand: formData.printerBrand,
        printerType: formData.printerType,
        paperWidth: formData.paperWidth,
        templateId: formData.templateId
      }

      if (dialogType.value === 'add') {
        await addPrinter({ ...submitData, printerKey: formData.printerKey.trim() })
        ElMessage.success('添加成功')
        refreshCreate()
      } else {
        await updatePrinter(submitData)
        ElMessage.success('更新成功')
        refreshUpdate()
      }

      dialogVisible.value = false
    } catch (error) {
      console.error('表单验证失败', error)
    } finally {
      submitLoading.value = false
    }
  }

  // 删除打印机
  const handleDelete = (row: any) => {
    ElMessageBox.confirm('确定要删除该打印机吗？', '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(async () => {
        await deletePrinter(row.id)
        ElMessage.success('删除成功')
        refreshRemove()
      })
      .catch(() => {
        ElMessage.info('已取消删除')
      })
  }

  // 使用打印机绑定模板或门店默认模板生成演示订单小票。
  const handleTestPrint = async (row: any) => {
    if (testingPrinterId.value != null) return
    testingPrinterId.value = row.id
    try {
      const result: any = await testPrint({ printerId: row.id })
      ElMessage.success(result?.msg || '模板演示小票已提交，请检查打印机是否出纸')
    } catch (error) {
      console.error('测试打印失败', error)
    } finally {
      testingPrinterId.value = undefined
    }
  }

  // 刷新打印机状态
  const handleRefreshStatus = async (row: any) => {
    try {
      statusLoading.value = true
      const result: any = await queryPrinterStatus(row.sn)
      if (result.success) {
        ElMessage.success(`状态更新成功: ${result.status}`)
        refreshData()
      }
    } catch (error) {
      console.error('刷新状态失败', error)
    } finally {
      statusLoading.value = false
    }
  }

  // 切换启用状态
  const handleToggleEnabled = async (row: any) => {
    // 使用枚举工具判断当前状态（兼容数字和文字格式）
    const currentEnabled = getEnumNumber(row.enabled, StatusTextMap) ?? row.enabled
    const isEnabled = currentEnabled === 1
    const enabled = isEnabled ? 0 : 1
    const text = enabled === 1 ? '启用' : '禁用'

    try {
      await ElMessageBox.confirm(`确定要${text}该打印机吗？`, '操作确认', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })

      await updatePrinterEnabled({ id: row.id, enabled })
      ElMessage.success(`${text}成功`)
      refreshUpdate()
    } catch (error: any) {
      if (error !== 'cancel') {
        console.error('切换状态失败', error)
      }
    }
  }

  // 同步所有打印机状态
  const handleSyncAll = async () => {
    try {
      statusLoading.value = true
      const result: any = await syncAllPrinterStatus()
      ElMessage.success(`同步完成! 成功: ${result.successCount}, 失败: ${result.failCount}`)
      refreshData()
    } catch (error) {
      console.error('同步失败', error)
    } finally {
      statusLoading.value = false
    }
  }

  // 显示订单统计弹窗
  const showOrderDialog = (row: any) => {
    currentPrinter.value = row
    orderDate.value = new Date().toISOString().split('T')[0]
    orderDialogVisible.value = true
    handleQueryOrderInfo()
  }

  // 查询订单统计
  const handleQueryOrderInfo = async () => {
    if (!orderDate.value) {
      return
    }
    try {
      const result: any = await queryOrderInfoByDate({
        sn: currentPrinter.value.sn,
        date: orderDate.value
      })
      if (result.success) {
        Object.assign(orderInfo, {
          successCount: result.print || 0,
          failCount: result.waiting || 0
        })
      }
    } catch (error) {
      console.error('查询订单统计失败', error)
    }
  }
</script>

<style scoped lang="scss">
  .printer-page {
    display: flex;
    flex-direction: column;
  }

  .printer-dialog-content {
    display: flex;
    gap: 24px;
    max-height: 70vh; // 改为最大高度，避免超出视口
    overflow: hidden; // 父容器不滚动
  }

  .form-section {
    flex: 1;
    max-width: 600px;
    overflow-y: auto; // 表单区域可滚动

    // 隐藏滚动条但保持滚动功能
    scrollbar-width: none; // Firefox
    -ms-overflow-style: none; // IE 10+

    &::-webkit-scrollbar {
      display: none; // Chrome, Safari, Edge
    }
  }

  .preview-section {
    display: flex;
    flex: 0 0 420px;
    flex-direction: column;
    min-width: 0;
    padding-left: 24px;
    overflow: hidden; // 防止预览区撑开弹窗
    border-left: 1px solid #e4e7ed;

    .preview-header {
      display: flex;
      flex-shrink: 0; // 标题不收缩
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      font-size: 14px;
      font-weight: bold;
    }

    .preview-wrapper {
      flex: 1;
      overflow-y: auto;

      // 隐藏滚动条但保持滚动功能
      scrollbar-width: none; // Firefox
      -ms-overflow-style: none; // IE 10+

      &::-webkit-scrollbar {
        display: none; // Chrome, Safari, Edge
      }
    }
  }
</style>
