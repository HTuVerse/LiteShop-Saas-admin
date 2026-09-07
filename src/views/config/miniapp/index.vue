<!-- 小程序配置页面 -->
<template>
  <div class="config-page art-full-height">
    <ElCard shadow="never">
      <template #header>
        <div class="card-header">
          <span>小程序配置管理</span>
          <ElSpace>
            <ElButton
              v-auth="'config:basic:edit'"
              type="primary"
              :loading="saveLoading"
              @click="handleSave"
              v-ripple
            >
              <i class="i-ep:check mr-1"></i>
              保存配置
            </ElButton>
            <ElButton @click="handleRefresh" v-ripple>
              <i class="i-ep:refresh mr-1"></i>
              刷新缓存
            </ElButton>
          </ElSpace>
        </div>
      </template>

      <ElTabs v-model="activeTab" type="border-card">
        <!-- 应用信息配置 -->
        <ElTabPane label="应用信息" name="appInfo">
          <ArtForm :model="configForm" label-width="140px" class="config-form">
            <ElFormItem label="应用名称">
              <ElInput v-model="configForm.app_name" placeholder="请输入应用名称" maxlength="50" />
            </ElFormItem>
            <ElFormItem label="应用描述">
              <ElInput
                v-model="configForm.app_desc"
                type="textarea"
                :rows="2"
                placeholder="请输入应用描述"
                maxlength="200"
              />
            </ElFormItem>
            <ElFormItem label="应用Logo">
              <div class="image-upload-wrapper">
                <ElImage
                  v-if="configForm.app_logo"
                  :src="configForm.app_logo"
                  fit="contain"
                  class="preview-image small"
                />
                <ElUpload
                  :http-request="uploadRequest"
                  :headers="uploadHeaders"
                  :show-file-list="false"
                  :on-success="(res: any) => handleUploadSuccess(res, 'app_logo')"
                  :before-upload="beforeUpload"
                  accept="image/*"
                >
                  <ElButton size="small">上传Logo</ElButton>
                </ElUpload>
              </div>
            </ElFormItem>
          </ArtForm>
        </ElTabPane>

        <!-- 默认图片配置 -->
        <ElTabPane label="图片配置" name="defaultImage">
          <div class="image-config-container">
            <!-- 背景图片分组 -->
            <div class="config-section">
              <div class="section-title">
                <i class="i-ep:picture"></i>
                <span>页面背景</span>
              </div>
              <ElRow :gutter="24">
                <ElCol :span="12">
                  <div class="image-config-item">
                    <div class="item-label">首页背景图片</div>
                    <div class="image-upload-box">
                      <ElImage
                        v-if="configForm.home_background_image"
                        :src="configForm.home_background_image"
                        fit="cover"
                        class="preview-img banner"
                        :preview-src-list="[configForm.home_background_image]"
                      />
                      <div v-else class="upload-placeholder banner">
                        <i class="i-ep:picture"></i>
                        <span>暂无图片</span>
                      </div>
                    </div>
                    <div class="item-actions">
                      <ElUpload
                        :http-request="uploadRequest"
                        :headers="uploadHeaders"
                        :show-file-list="false"
                        :on-success="
                          (res: any) => handleUploadSuccess(res, 'home_background_image')
                        "
                        :before-upload="beforeUpload"
                        accept="image/*"
                      >
                        <ElButton size="small" type="primary">上传图片</ElButton>
                      </ElUpload>
                      <ElButton
                        v-if="configForm.home_background_image"
                        size="small"
                        type="danger"
                        plain
                        @click="configForm.home_background_image = ''"
                        >删除</ElButton
                      >
                    </div>
                    <div class="item-tip">建议尺寸 750x500</div>
                  </div>
                </ElCol>
                <ElCol :span="12">
                  <div class="image-config-item">
                    <div class="item-label">点餐页背景图片</div>
                    <div class="image-upload-box">
                      <ElImage
                        v-if="configForm.order_background_image"
                        :src="configForm.order_background_image"
                        fit="cover"
                        class="preview-img banner"
                        :preview-src-list="[configForm.order_background_image]"
                      />
                      <div v-else class="upload-placeholder banner">
                        <i class="i-ep:picture"></i>
                        <span>暂无图片</span>
                      </div>
                    </div>
                    <div class="item-actions">
                      <ElUpload
                        :http-request="uploadRequest"
                        :headers="uploadHeaders"
                        :show-file-list="false"
                        :on-success="
                          (res: any) => handleUploadSuccess(res, 'order_background_image')
                        "
                        :before-upload="beforeUpload"
                        accept="image/*"
                      >
                        <ElButton size="small" type="primary">上传图片</ElButton>
                      </ElUpload>
                      <ElButton
                        v-if="configForm.order_background_image"
                        size="small"
                        type="danger"
                        plain
                        @click="configForm.order_background_image = ''"
                        >删除</ElButton
                      >
                    </div>
                    <div class="item-tip">建议尺寸 750x320</div>
                  </div>
                </ElCol>
              </ElRow>
            </div>

            <!-- 默认图片分组 -->
            <div class="config-section">
              <div class="section-title">
                <i class="i-ep:files"></i>
                <span>默认图片</span>
              </div>
              <ElRow :gutter="24">
                <ElCol :span="6">
                  <div class="image-config-item">
                    <div class="item-label">默认头像</div>
                    <div class="image-upload-box">
                      <ElImage
                        v-if="configForm.default_avatar"
                        :src="configForm.default_avatar"
                        fit="cover"
                        class="preview-img square"
                        :preview-src-list="[configForm.default_avatar]"
                      />
                      <div v-else class="upload-placeholder square">
                        <i class="i-ep:user"></i>
                      </div>
                    </div>
                    <div class="item-actions">
                      <ElUpload
                        :http-request="uploadRequest"
                        :headers="uploadHeaders"
                        :show-file-list="false"
                        :on-success="(res: any) => handleUploadSuccess(res, 'default_avatar')"
                        :before-upload="beforeUpload"
                        accept="image/*"
                      >
                        <ElButton size="small" type="primary">上传</ElButton>
                      </ElUpload>
                    </div>
                    <div class="item-tip">用户默认头像</div>
                  </div>
                </ElCol>
                <ElCol :span="6">
                  <div class="image-config-item">
                    <div class="item-label">默认菜品图片</div>
                    <div class="image-upload-box">
                      <ElImage
                        v-if="configForm.default_dish_image"
                        :src="configForm.default_dish_image"
                        fit="cover"
                        class="preview-img square"
                        :preview-src-list="[configForm.default_dish_image]"
                      />
                      <div v-else class="upload-placeholder square">
                        <i class="i-ep:dish"></i>
                      </div>
                    </div>
                    <div class="item-actions">
                      <ElUpload
                        :http-request="uploadRequest"
                        :headers="uploadHeaders"
                        :show-file-list="false"
                        :on-success="(res: any) => handleUploadSuccess(res, 'default_dish_image')"
                        :before-upload="beforeUpload"
                        accept="image/*"
                      >
                        <ElButton size="small" type="primary">上传</ElButton>
                      </ElUpload>
                    </div>
                    <div class="item-tip">菜品默认图</div>
                  </div>
                </ElCol>
                <ElCol :span="6">
                  <div class="image-config-item">
                    <div class="item-label">默认订单图片</div>
                    <div class="image-upload-box">
                      <ElImage
                        v-if="configForm.default_order_image"
                        :src="configForm.default_order_image"
                        fit="cover"
                        class="preview-img square"
                        :preview-src-list="[configForm.default_order_image]"
                      />
                      <div v-else class="upload-placeholder square">
                        <i class="i-ep:document"></i>
                      </div>
                    </div>
                    <div class="item-actions">
                      <ElUpload
                        :http-request="uploadRequest"
                        :headers="uploadHeaders"
                        :show-file-list="false"
                        :on-success="(res: any) => handleUploadSuccess(res, 'default_order_image')"
                        :before-upload="beforeUpload"
                        accept="image/*"
                      >
                        <ElButton size="small" type="primary">上传</ElButton>
                      </ElUpload>
                    </div>
                    <div class="item-tip">订单默认图</div>
                  </div>
                </ElCol>
                <ElCol :span="6">
                  <div class="image-config-item">
                    <div class="item-label">默认空图片</div>
                    <div class="image-upload-box">
                      <ElImage
                        v-if="configForm.default_empty_image"
                        :src="configForm.default_empty_image"
                        fit="contain"
                        class="preview-img square"
                        :preview-src-list="[configForm.default_empty_image]"
                      />
                      <div v-else class="upload-placeholder square">
                        <i class="i-ep:folder"></i>
                      </div>
                    </div>
                    <div class="item-actions">
                      <ElUpload
                        :http-request="uploadRequest"
                        :headers="uploadHeaders"
                        :show-file-list="false"
                        :on-success="(res: any) => handleUploadSuccess(res, 'default_empty_image')"
                        :before-upload="beforeUpload"
                        accept="image/*"
                      >
                        <ElButton size="small" type="primary">上传</ElButton>
                      </ElUpload>
                    </div>
                    <div class="item-tip">空数据占位图</div>
                  </div>
                </ElCol>
              </ElRow>
            </div>
          </div>
        </ElTabPane>

        <!-- 主题配置 -->
        <ElTabPane label="主题配置" name="theme">
          <ArtForm :model="configForm" label-width="140px" class="config-form">
            <ElFormItem label="主题色">
              <ElColorPicker v-model="configForm.theme_color" show-alpha />
              <span class="color-value">{{ configForm.theme_color }}</span>
            </ElFormItem>
            <ElFormItem label="主题浅色">
              <ElColorPicker v-model="configForm.theme_color_light" show-alpha />
              <span class="color-value">{{ configForm.theme_color_light }}</span>
            </ElFormItem>
            <ElFormItem label="主题深色">
              <ElColorPicker v-model="configForm.theme_color_dark" show-alpha />
              <span class="color-value">{{ configForm.theme_color_dark }}</span>
            </ElFormItem>
          </ArtForm>
        </ElTabPane>

        <!-- 联系方式配置 -->
        <ElTabPane label="联系方式" name="contact">
          <ArtForm :model="configForm" label-width="140px" class="config-form">
            <ElFormItem label="客服电话">
              <ElInput
                v-model="configForm.service_phone"
                placeholder="请输入客服电话"
                maxlength="20"
              />
            </ElFormItem>
            <ElFormItem label="客服微信">
              <ElInput
                v-model="configForm.service_wechat"
                placeholder="请输入客服微信号"
                maxlength="50"
              />
            </ElFormItem>
            <ElFormItem label="公司地址">
              <ElInput
                v-model="configForm.company_address"
                type="textarea"
                :rows="2"
                placeholder="请输入公司地址"
                maxlength="200"
              />
            </ElFormItem>
          </ArtForm>
        </ElTabPane>

        <!-- 其他配置 -->
        <ElTabPane label="其他配置" name="other">
          <ArtForm :model="configForm" label-width="140px" class="config-form">
            <ElFormItem label="公告内容">
              <ElInput
                v-model="configForm.announcement"
                type="textarea"
                :rows="3"
                placeholder="请输入公告内容"
                maxlength="500"
              />
            </ElFormItem>
            <ElFormItem label="显示公告">
              <ElSwitch
                v-model="configForm.announcement_enabled"
                active-value="1"
                inactive-value="0"
              />
            </ElFormItem>
            <ElFormItem label="分享标题">
              <ElInput
                v-model="configForm.share_title"
                placeholder="请输入分享标题"
                maxlength="100"
              />
            </ElFormItem>
            <ElFormItem label="分享图片">
              <div class="image-upload-wrapper">
                <ElImage
                  v-if="configForm.share_image"
                  :src="configForm.share_image"
                  fit="cover"
                  class="preview-image"
                />
                <ElUpload
                  :http-request="uploadRequest"
                  :headers="uploadHeaders"
                  :show-file-list="false"
                  :on-success="(res: any) => handleUploadSuccess(res, 'share_image')"
                  :before-upload="beforeUpload"
                  accept="image/*"
                >
                  <ElButton size="small">上传图片</ElButton>
                </ElUpload>
              </div>
              <div class="form-tip">建议尺寸 500x400</div>
            </ElFormItem>
          </ArtForm>
        </ElTabPane>

        <!-- 部署配置 -->
        <ElTabPane label="部署配置" name="deploy">
          <ArtForm :model="configForm" label-width="160px" class="config-form">
            <ElAlert type="info" :closable="false" class="mb-4">
              <template #title>
                <span class="alert-title">配置说明</span>
              </template>
              <div class="alert-content">
                <p>以下域名配置用于生成桌位二维码，用户扫码后将访问对应的点餐页面。</p>
                <p>请确保域名已正确配置 HTTPS 证书，且应用已部署到对应服务器。</p>
              </div>
            </ElAlert>

            <div class="config-section">
              <div class="section-title">
                <i class="i-ep:link"></i>
                <span>H5 网页端配置</span>
              </div>
              <ElFormItem label="H5 应用域名">
                <ElInput
                  v-model="configForm.h5_base_url"
                  placeholder="请输入H5应用域名，如 https://h5.example.com"
                  maxlength="200"
                >
                  <template #prepend>https://</template>
                </ElInput>
                <div class="form-tip"> H5应用部署地址，用户扫码后访问此域名进入点餐页面 </div>
              </ElFormItem>
            </div>

            <div class="config-section">
              <div class="section-title">
                <i class="i-ep:cellphone"></i>
                <span>微信小程序配置</span>
              </div>
              <ElFormItem label="小程序域名前缀">
                <ElInput
                  v-model="configForm.miniapp_base_url"
                  placeholder="请输入小程序二维码域名前缀，如 https://mp.example.com/order"
                  maxlength="200"
                >
                  <template #prepend>https://</template>
                </ElInput>
                <div class="form-tip">
                  用于「扫普通链接二维码打开小程序」功能，需在微信公众平台配置对应规则
                </div>
              </ElFormItem>
              <ElFormItem label="小程序 AppID">
                <ElInput
                  v-model="configForm.miniapp_appid"
                  placeholder="请输入微信小程序AppID"
                  maxlength="50"
                />
                <div class="form-tip"> 微信小程序的 AppID，可在微信公众平台查看 </div>
              </ElFormItem>
            </div>

            <div class="config-section">
              <div class="section-title">
                <i class="i-ep:setting"></i>
                <span>二维码默认设置</span>
              </div>
              <ElFormItem label="默认二维码平台">
                <ElRadioGroup v-model="configForm.qrcode_default_platform">
                  <ElRadio value="h5">H5 网页版</ElRadio>
                  <ElRadio value="miniapp">微信小程序</ElRadio>
                </ElRadioGroup>
                <div class="form-tip"> 生成桌位二维码时的默认平台选择 </div>
              </ElFormItem>
            </div>
          </ArtForm>
        </ElTabPane>
      </ElTabs>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { uploadRequest } from '@/api/upload'
  import { ElMessage } from 'element-plus'
  import {
    fetchGetConfigList,
    fetchBatchUpdateConfig,
    fetchRefreshConfigCache
  } from '@/api/config-manage'
  import { useUserStore } from '@/store/modules/user'

  defineOptions({ name: 'MiniappConfig' })

  const userStore = useUserStore()

  // 当前Tab
  const activeTab = ref('appInfo')
  const saveLoading = ref(false)

  // 上传配置（与 dish-dialog 保持一致）
  const uploadUrl = import.meta.env.VITE_API_URL + '/file-upload/upload/image'
  const uploadHeaders = computed(() => ({
    satoken: userStore.accessToken || ''
  }))

  // 配置表单
  const configForm = reactive<Record<string, string>>({
    // 应用信息
    app_name: '',
    app_logo: '',
    app_desc: '',
    // 默认图片
    home_background_image: '',
    order_background_image: '',
    default_dish_image: '',
    default_avatar: '',
    default_empty_image: '',
    default_order_image: '',
    // 主题配置
    theme_color: '#FF6B35',
    theme_color_light: '#FFE4D4',
    theme_color_dark: '#E55A2B',
    // 联系方式
    service_phone: '',
    service_wechat: '',
    company_address: '',
    // 其他配置
    announcement: '',
    announcement_enabled: '1',
    share_title: '',
    share_image: '',
    // 部署配置
    h5_base_url: '',
    miniapp_base_url: '',
    miniapp_appid: '',
    qrcode_default_platform: 'h5'
  })

  /**
   * 获取配置列表
   */
  const fetchConfigData = async () => {
    try {
      const res = await fetchGetConfigList()
      if (res && Array.isArray(res)) {
        res.forEach((item: Api.Config.AppConfig) => {
          if (item.configKey && configForm.hasOwnProperty(item.configKey)) {
            configForm[item.configKey] = item.configValue || ''
          }
        })
      }
    } catch (error: any) {
      ElMessage.error(error.message || '获取配置失败')
    }
  }

  /**
   * 保存配置
   */
  const handleSave = async () => {
    try {
      saveLoading.value = true
      // 过滤掉空值
      const configs: Record<string, string> = {}
      Object.keys(configForm).forEach((key) => {
        if (configForm[key] !== undefined && configForm[key] !== null) {
          configs[key] = configForm[key]
        }
      })
      await fetchBatchUpdateConfig(configs)
      ElMessage.success('保存成功')
    } catch (error: any) {
      ElMessage.error(error.message || '保存失败')
    } finally {
      saveLoading.value = false
    }
  }

  /**
   * 刷新缓存
   */
  const handleRefresh = async () => {
    try {
      await fetchRefreshConfigCache()
      ElMessage.success('缓存已刷新')
    } catch (error: any) {
      ElMessage.error(error.message || '刷新失败')
    }
  }

  /**
   * 上传前校验
   */
  const beforeUpload = (file: File) => {
    const isImage = file.type.startsWith('image/')
    const isLt2M = file.size / 1024 / 1024 < 2

    if (!isImage) {
      ElMessage.error('只能上传图片文件!')
      return false
    }
    if (!isLt2M) {
      ElMessage.error('图片大小不能超过 2MB!')
      return false
    }
    return true
  }

  /**
   * 上传成功（与 dish-dialog 一致：取 response.data.url）
   */
  const handleUploadSuccess = (response: any, key: string) => {
    if ((response.code === '200' || response.code === 200) && response.data) {
      configForm[key] = response.data.url ?? response.data
      ElMessage.success('上传成功')
    } else {
      ElMessage.error(response.msg || '上传失败')
    }
  }

  // 初始化
  onMounted(() => {
    fetchConfigData()
  })
</script>

<style lang="scss" scoped>
  .config-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 0;

    :deep(.el-card) {
      display: flex;
      flex-direction: column;
      height: 100%;

      .el-card__body {
        flex: 1;
        padding: 0;
        overflow: hidden;
      }
    }

    :deep(.el-tabs) {
      display: flex;
      flex-direction: column;
      height: 100%;

      .el-tabs__content {
        flex: 1;
        padding: 0 !important;
        overflow: hidden;

        .el-tab-pane {
          height: 100%;
          padding: 20px;
          overflow-y: auto;

          // 隐藏滚动条但保留滚动功能
          scrollbar-width: none; // Firefox
          -ms-overflow-style: none; // IE/Edge

          &::-webkit-scrollbar {
            display: none; // Chrome/Safari/Opera
          }
        }
      }
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .config-form {
      max-width: 600px;
      padding: 20px;
    }

    // 图片配置容器
    .image-config-container {
      padding: 0;
    }

    // 配置分组
    .config-section {
      margin-bottom: 32px;

      &:last-child {
        margin-bottom: 0;
      }

      .section-title {
        display: flex;
        gap: 8px;
        align-items: center;
        padding-bottom: 12px;
        margin-bottom: 20px;
        font-size: 16px;
        font-weight: 500;
        color: #303133;
        border-bottom: 1px solid #ebeef5;

        i {
          font-size: 18px;
          color: var(--el-color-primary);
        }
      }
    }

    // 图片配置项
    .image-config-item {
      padding: 16px;
      text-align: center;
      background: #fafafa;
      border-radius: 8px;
      transition: all 0.3s;

      &:hover {
        background: #f5f7fa;
        box-shadow: 0 2px 8px rgb(0 0 0 / 6%);
      }

      .item-label {
        margin-bottom: 12px;
        font-size: 14px;
        font-weight: 500;
        color: #303133;
      }

      .image-upload-box {
        margin-bottom: 12px;
      }

      .preview-img {
        cursor: pointer;
        border: 1px solid #e4e7ed;
        border-radius: 6px;

        &.banner {
          width: 100%;
          height: 120px;
        }

        &.square {
          width: 100px;
          height: 100px;
        }
      }

      .upload-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #909399;
        background: #fff;
        border: 1px dashed #dcdfe6;
        border-radius: 6px;

        &.banner {
          width: 100%;
          height: 120px;
        }

        &.square {
          width: 100px;
          height: 100px;
          margin: 0 auto;
        }

        i {
          margin-bottom: 8px;
          font-size: 28px;
        }

        span {
          font-size: 12px;
        }
      }

      .item-actions {
        display: flex;
        gap: 8px;
        justify-content: center;
        margin-bottom: 8px;
      }

      .item-tip {
        font-size: 12px;
        color: #909399;
      }
    }

    .image-upload-wrapper {
      display: flex;
      gap: 16px;
      align-items: center;

      .preview-image {
        width: 120px;
        height: 80px;
        border: 1px solid #eee;
        border-radius: 4px;

        &.small {
          width: 80px;
          height: 80px;
        }

        &.large {
          width: 180px;
          height: 100px;
        }
      }
    }

    .form-tip {
      margin-top: 4px;
      font-size: 12px;
      color: #909399;
    }

    .color-value {
      margin-left: 12px;
      font-family: monospace;
      color: #606266;
    }

    :deep(.el-tabs__content) {
      padding: 20px;
    }

    .mb-4 {
      margin-bottom: 16px;
    }

    .alert-title {
      font-weight: 600;
    }

    .alert-content {
      margin-top: 8px;
      font-size: 13px;
      line-height: 1.8;

      p {
        margin: 4px 0;
      }
    }
  }
</style>
