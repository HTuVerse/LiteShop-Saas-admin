<template>
  <ElDialog
    v-model="dialogVisible"
    title="餐桌点餐二维码"
    width="800px"
    align-center
    destroy-on-close
  >
    <div class="qrcode-container">
      <!-- 左侧：信息和提示 -->
      <div class="left-panel">
        <!-- 平台选择 -->
        <div class="platform-selector">
          <ElRadioGroup v-model="platformType" size="default">
            <ElRadioButton value="h5">
              <ElIcon class="mr-1"><Monitor /></ElIcon>
              H5网页版
            </ElRadioButton>
            <ElRadioButton value="miniapp">
              <ElIcon class="mr-1"><Cellphone /></ElIcon>
              微信小程序
            </ElRadioButton>
          </ElRadioGroup>
        </div>

        <!-- 二维码信息 -->
        <div class="qrcode-info">
          <ElDescriptions :column="1" border label-width="93px" size="default">
            <ElDescriptionsItem label="餐桌编号">{{ tableData?.tableNumber }}</ElDescriptionsItem>
            <ElDescriptionsItem label="餐桌名称">{{ tableData?.tableName }}</ElDescriptionsItem>
            <ElDescriptionsItem label="所属门店">{{ tableData?.storeName }}</ElDescriptionsItem>
            <ElDescriptionsItem label="座位数">{{ tableData?.seats }}人</ElDescriptionsItem>
            <ElDescriptionsItem :label="platformType === 'h5' ? 'H5链接' : '小程序路径'">
              <div class="link-row">
                <ElText class="path-text" size="small">{{
                  platformType === 'h5' ? qrcodeValue : miniappPath
                }}</ElText>
                <ElButton
                  size="small"
                  plain
                  type="primary"
                  aria-label="复制链接"
                  title="复制链接"
                  @click="copyLink"
                >
                  <ElIcon><DocumentCopy /></ElIcon>
                </ElButton>
              </div>
            </ElDescriptionsItem>
          </ElDescriptions>
        </div>

        <!-- 使用说明 -->
        <ElAlert
          :type="platformType === 'h5' ? 'success' : 'info'"
          :closable="false"
          class="usage-alert"
        >
          <template #title>
            <span class="alert-title">{{
              platformType === 'h5' ? 'H5版使用说明' : '小程序版配置说明'
            }}</span>
          </template>
          <div class="alert-content" v-if="platformType === 'h5'">
            <p>1. 用户扫描二维码后，将直接打开H5网页点餐界面</p>
            <p>2. 支持所有浏览器扫码访问，无需安装任何应用</p>
            <p>3. 请确保H5应用已部署到服务器，并配置正确的域名</p>
            <p>4. <strong>当前域名：</strong>{{ h5BaseUrl || '未配置' }}</p>
          </div>
          <div class="alert-content" v-else>
            <p
              >1. 登录<a href="https://mp.weixin.qq.com" target="_blank">微信公众平台</a
              >，进入「开发管理」→「开发设置」</p
            >
            <p>2. 找到「扫普通链接二维码打开小程序」，添加规则</p>
            <p>3. 设置二维码规则前缀为您的域名，关联到小程序页面</p>
            <p>4. 或使用微信开发者工具生成正式的小程序码</p>
          </div>
        </ElAlert>
      </div>

      <!-- 右侧：二维码卡片 -->
      <div class="right-panel">
        <div class="qrcode-card" ref="qrcodeCardRef">
          <!-- 店铺信息 -->
          <div class="store-info">
            <div class="store-name">{{ tableData?.storeName || '门店名称' }}</div>
            <div class="table-name">{{ tableData?.tableName || '餐桌' }}</div>
          </div>

          <!-- 二维码 -->
          <div class="qrcode-box">
            <QrcodeVue
              ref="qrcodeRef"
              v-if="isConfigValid && qrcodeValue"
              :value="qrcodeValue"
              :size="180"
              level="L"
              render-as="canvas"
              foreground="#333333"
              background="#ffffff"
            />
          </div>

          <!-- 餐桌编号 -->
          <div class="table-number">
            <span class="label">桌号</span>
            <span class="number">{{ tableData?.tableNumber }}</span>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <ElButton @click="dialogVisible = false">关闭</ElButton>
        <ElButton
          type="primary"
          :disabled="!isConfigValid || !qrcodeValue || configLoading"
          @click="downloadQrcode"
        >
          <ElIcon class="mr-1"><Download /></ElIcon>
          下载二维码
        </ElButton>
      </div>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { ref, computed, watch, nextTick } from 'vue'
  import { ElMessage } from 'element-plus'
  import { Download, Monitor, Cellphone, DocumentCopy } from '@element-plus/icons-vue'
  import QrcodeVue from 'qrcode.vue'
  import { fetchGetDeployConfig, type DeployConfig } from '@/api/config-manage'
  import { generateTableQrcodeDataUrl, getQrcodeValue } from '../utils/tableQrcodeImage'

  interface Props {
    visible: boolean
    tableData?: Partial<Api.Table.TableListItem>
  }

  interface Emits {
    (e: 'update:visible', value: boolean): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  // 二维码组件引用
  const qrcodeRef = ref<any>()
  const qrcodeCardRef = ref<HTMLElement>()

  // 平台类型：h5 或 miniapp
  const platformType = ref<'h5' | 'miniapp'>('h5')

  // 部署配置（从后端获取）
  const deployConfig = ref<DeployConfig>({
    h5BaseUrl: '',
    miniappBaseUrl: '',
    miniappAppid: '',
    qrcodeDefaultPlatform: 'h5',
    appLogo: ''
  })

  // 配置加载状态
  const configLoading = ref(false)

  // 对话框显示控制
  const dialogVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
  })

  /**
   * 加载部署配置
   */
  const loadDeployConfig = async () => {
    try {
      configLoading.value = true
      const config = await fetchGetDeployConfig()
      deployConfig.value = config
      // 设置默认平台
      platformType.value = config.qrcodeDefaultPlatform || 'h5'
      console.log('[二维码] 部署配置已加载:', config)
    } catch (error) {
      console.error('[二维码] 加载部署配置失败:', error)
      // 使用默认值
      deployConfig.value = {
        h5BaseUrl: '',
        miniappBaseUrl: '',
        miniappAppid: '',
        qrcodeDefaultPlatform: 'h5',
        appLogo: ''
      }
    } finally {
      configLoading.value = false
    }
  }

  // 监听弹窗打开，加载配置
  watch(
    () => props.visible,
    (visible) => {
      if (visible) {
        loadDeployConfig()
      }
    },
    { immediate: true }
  )

  // H5 基础URL（从配置获取）
  const h5BaseUrl = computed(() => {
    let url = deployConfig.value.h5BaseUrl
    if (!url) return ''

    // 如果没有协议前缀，默认添加 http://（建议在配置时直接填写完整URL如 http://xxx 或 https://xxx）
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`
    }
    // 去掉末尾的斜杠和 # 符号，避免 URL 拼接问题
    url = url.replace(/[/#]+$/, '')
    return url
  })

  // 小程序域名前缀（从配置获取）
  const miniappBaseUrl = computed(() => {
    const url = deployConfig.value.miniappBaseUrl
    // 确保有 https:// 前缀
    if (url && !url.startsWith('http')) {
      return `https://${url}`
    }
    return url || ''
  })

  // 小程序页面路径
  const miniappPath = computed(() => {
    if (!props.tableData?.id) return ''
    return qrcodeValue.value.split('/#/')[1] || qrcodeValue.value
  })

  /**
   * 检查配置是否有效
   */
  const isConfigValid = computed(() => {
    if (platformType.value === 'h5') {
      return !!deployConfig.value.h5BaseUrl
    } else {
      return !!deployConfig.value.miniappBaseUrl
    }
  })

  /**
   * 生成二维码内容
   * 根据平台类型生成不同的URL
   */
  const qrcodeValue = computed(() => {
    if (!props.tableData?.id || !isConfigValid.value) return ''
    return getQrcodeValue(props.tableData, deployConfig.value, platformType.value)
  })

  /**
   * 复制链接到剪贴板
   */
  const copyLink = async () => {
    try {
      if (!isConfigValid.value || !qrcodeValue.value) {
        ElMessage.warning('请先配置点餐应用地址')
        return
      }
      const link = platformType.value === 'h5' ? qrcodeValue.value : miniappPath.value
      await navigator.clipboard.writeText(link)
      ElMessage.success('链接已复制到剪贴板')
    } catch (error) {
      ElMessage.error('复制失败，请手动复制')
    }
  }

  /**
   * 创建带标题、可选 Logo 的完整二维码图片（用于下载）
   */
  const createFullQrcodeImage = (): Promise<string> => {
    if (!props.tableData?.id) return Promise.reject(new Error('请选择餐桌'))
    return generateTableQrcodeDataUrl(props.tableData, deployConfig.value, platformType.value)
  }

  /**
   * 下载二维码图片
   */
  const downloadQrcode = async () => {
    try {
      await nextTick()
      const dataUrl = await createFullQrcodeImage()

      // 创建下载链接
      const link = document.createElement('a')
      link.download = `餐桌二维码_${props.tableData?.tableNumber || 'unknown'}.png`
      link.href = dataUrl
      link.click()

      ElMessage.success('二维码下载成功')
    } catch (error) {
      console.error('下载二维码失败:', error)
      ElMessage.error('下载失败，请重试')
    }
  }
</script>

<style scoped lang="scss">
  .qrcode-container {
    display: flex;
    gap: 24px;
    min-height: 420px;
  }

  // 左侧面板
  .left-panel {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 16px;
  }

  // 右侧面板
  .right-panel {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
    border-radius: 12px;
  }

  .platform-selector {
    :deep(.el-radio-button__inner) {
      display: flex;
      gap: 4px;
      align-items: center;
    }
  }

  .qrcode-card {
    width: 260px;
    padding: 20px;
    text-align: center;
    background: white;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgb(0 0 0 / 10%);
  }

  .store-info {
    margin-bottom: 16px;

    .store-name {
      margin-bottom: 6px;
      font-size: 16px;
      font-weight: bold;
      color: #303133;
    }

    .table-name {
      font-size: 13px;
      color: #909399;
    }
  }

  .qrcode-box {
    display: flex;
    justify-content: center;
    padding: 12px;
    margin-bottom: 12px;
    background: #fff;
    border: 2px dashed #e4e7ed;
    border-radius: 10px;
  }

  .qrcode-tips {
    display: flex;
    gap: 6px;
    align-items: center;
    justify-content: center;
    padding: 10px;
    margin-bottom: 12px;
    color: white;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 8px;
    transition: background 0.3s ease;

    &.h5 {
      background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
    }

    &.miniapp {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .tip-icon {
      font-size: 18px;
    }

    .tip-text {
      font-size: 13px;
      font-weight: 500;
    }
  }

  .table-number {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: center;
    padding: 10px 16px;
    background: #fef6f0;
    border: 2px solid #ff9500;
    border-radius: 24px;

    .label {
      font-size: 13px;
      color: #909399;
    }

    .number {
      font-size: 20px;
      font-weight: bold;
      color: #ff9500;
    }
  }

  .qrcode-info {
    .path-text {
      font-family: monospace;
      font-size: 12px;
      word-break: break-all;
    }

    .link-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }
  }

  .usage-alert {
    flex: 1;
  }

  .alert-title {
    font-weight: 600;
  }

  .alert-content {
    margin-top: 8px;
    font-size: 12px;
    line-height: 1.8;

    p {
      margin: 4px 0;
    }

    a {
      color: var(--el-color-primary);
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }

    strong {
      color: var(--el-color-danger);
    }
  }

  .dialog-footer {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }

  .mr-1 {
    margin-right: 4px;
  }
</style>
