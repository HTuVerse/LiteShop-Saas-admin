<template>
  <div class="service-groups">
    <section
      v-if="!props.fileOnly"
      id="website-message"
      class="service-config"
      v-loading="messageLoading"
    >
      <header>
        <div>
          <h2>信息配置</h2>
          <p>由超级管理员统一配置邮件与短信通道，新发送立即生效。</p>
        </div>
        <ArtSvgIcon icon="ri:mail-settings-line" />
      </header>
      <ElAlert v-if="messageLoadError" type="error" :closable="false" class="mb-4">
        信息配置加载失败，暂时无法保存。<ElButton link @click="reloadMessage">重新加载</ElButton>
      </ElAlert>
      <ArtForm
        v-if="messageReady"
        :model="messageForm"
        label-position="top"
        :disabled="messageSaving"
      >
        <h3>邮件通道</h3>
        <div class="field-grid">
          <ElFormItem label="SMTP 主机"
            ><ElInput v-model="messageForm.mailHost" placeholder="smtp.example.com"
          /></ElFormItem>
          <ElFormItem label="SMTP 端口"
            ><ElInputNumber v-model="messageForm.mailPort" :min="1" :max="65535"
          /></ElFormItem>
          <ElFormItem label="协议">
            <ElSelect v-model="messageForm.mailProtocol"
              ><ElOption label="SMTPS" value="smtps" /><ElOption
                label="SMTP / STARTTLS"
                value="smtp"
            /></ElSelect>
          </ElFormItem>
          <ElFormItem label="SMTP 用户名"
            ><ElInput v-model="messageForm.mailUsername"
          /></ElFormItem>
          <ElFormItem label="发件邮箱"><ElInput v-model="messageForm.mailFrom" /></ElFormItem>
          <ElFormItem label="SMTP 密码">
            <ElInput
              v-model="messageForm.mailPassword"
              type="password"
              show-password
              autocomplete="new-password"
              :placeholder="secretHint(messageForm.mailPasswordConfigured)"
            />
            <ElCheckbox v-model="messageForm.clearMailPassword">清除现有密码</ElCheckbox>
          </ElFormItem>
        </div>

        <h3>短信通道</h3>
        <div class="field-grid">
          <ElFormItem label="AppKey"><ElInput v-model="messageForm.smsAppKey" /></ElFormItem>
          <ElFormItem label="模板 ID"><ElInput v-model="messageForm.smsTemplateId" /></ElFormItem>
          <ElFormItem label="AppSecret">
            <ElInput
              v-model="messageForm.smsAppSecret"
              type="password"
              show-password
              autocomplete="new-password"
              :placeholder="secretHint(messageForm.smsAppSecretConfigured)"
            />
            <ElCheckbox v-model="messageForm.clearSmsAppSecret">清除现有 AppSecret</ElCheckbox>
          </ElFormItem>
          <ElFormItem label="APPCODE">
            <ElInput
              v-model="messageForm.smsAppcode"
              type="password"
              show-password
              autocomplete="new-password"
              :placeholder="secretHint(messageForm.smsAppcodeConfigured)"
            />
            <ElCheckbox v-model="messageForm.clearSmsAppcode">清除现有 APPCODE</ElCheckbox>
          </ElFormItem>
          <ElFormItem class="full" label="APPCODE 接口地址"
            ><ElInput v-model="messageForm.smsHost" placeholder="https://..."
          /></ElFormItem>
        </div>

        <div class="actions">
          <span>信息配置版本 v{{ messageForm.revision }}</span>
          <ElButton
            type="primary"
            :loading="messageSaving"
            :disabled="!messageDirty"
            @click="saveMessage"
            >保存信息配置</ElButton
          >
        </div>
      </ArtForm>
    </section>

    <section id="website-file" class="service-config" v-loading="fileLoading">
      <header>
        <div>
          <h2>文件配置</h2>
          <p>选择默认存储驱动；切换仅影响新上传，旧资源继续使用其配置快照。</p>
        </div>
        <ArtSvgIcon icon="ri:folder-upload-line" />
      </header>
      <ElAlert v-if="fileLoadError" type="error" :closable="false" class="mb-4">
        文件配置加载失败，暂时无法保存。<ElButton link @click="reloadFile">重新加载</ElButton>
      </ElAlert>
      <ArtForm v-if="fileReady" :model="fileForm" label-position="top" :disabled="fileSaving">
        <h3>文件上传</h3>
        <ElAlert type="warning" :closable="false" class="mb-4">
          统一公开入口可让业务图片地址与存储平台解耦。启用前请将该路径转发到文件服务；旧源站域名和
          Bucket 仍需保留。首次保存云存储密钥前，请先为配置服务设置 CONFIG_CREDENTIAL_ENCRYPTION_KEY
          并重启。
        </ElAlert>
        <div class="field-grid">
          <ElFormItem label="默认存储方式">
            <ElSelect v-model="fileForm.storageMode">
              <ElOption label="本地磁盘 Local" value="LOCAL" />
              <ElOption label="MinIO" value="MINIO" />
              <ElOption label="阿里云 OSS" value="OSS" />
              <ElOption label="七牛云 OSS" value="QINIU" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="单文件上限（MB）"
            ><ElInputNumber v-model="fileForm.maxSize" :min="1" :max="2048"
          /></ElFormItem>
          <ElFormItem label="图片自动压缩">
            <ElSwitch v-model="fileForm.imageCompressionEnabled" />
            <div class="field-hint">管理端、小程序和资源库上传的图片统一生效。</div>
          </ElFormItem>
          <ElFormItem v-if="fileForm.imageCompressionEnabled" label="压缩后图片不超过（MB）">
            <ElInputNumber
              v-model="fileForm.imageCompressionTargetMb"
              :min="0.1"
              :max="50"
              :step="0.1"
              :precision="1"
            />
            <div class="field-hint"
              >已满足大小的图片保持原样；压缩后仍超限则上传失败。GIF 保留动画，动态 WebP
              超限时拒绝上传。</div
            >
          </ElFormItem>
          <ElFormItem class="full" label="统一公开资源入口">
            <ElInput
              v-model="fileForm.publicDeliveryBaseUrl"
              placeholder="https://static.example.com/images/resource"
            />
            <div class="field-hint"
              >留空沿用各存储驱动的公开域名；启用后公开 URL 为此地址加资源 ID。</div
            >
          </ElFormItem>
          <template v-if="fileForm.storageMode === 'LOCAL'">
            <ElFormItem label="本地上传目录"><ElInput v-model="fileForm.uploadPath" /></ElFormItem>
            <ElFormItem label="本地公开访问地址"
              ><ElInput v-model="fileForm.baseUrl" placeholder="https://static.example.com/images/"
            /></ElFormItem>
          </template>
          <ElFormItem class="full" label="允许的图片类型"
            ><ElInput v-model="fileForm.allowedTypes" placeholder="jpg,jpeg,png,gif,webp"
          /></ElFormItem>
          <template v-if="fileForm.storageMode === 'MINIO'">
            <ElFormItem label="MinIO API Endpoint"
              ><ElInput
                v-model="fileForm.minioEndpoint"
                placeholder="https://minio-api.example.com"
            /></ElFormItem>
            <ElFormItem label="浏览器可达 API Endpoint"
              ><ElInput
                v-model="fileForm.minioBrowserEndpoint"
                placeholder="私有签名链接使用，留空与 API Endpoint 相同"
            /></ElFormItem>
            <ElFormItem label="公开 Bucket"
              ><ElInput v-model="fileForm.minioPublicBucket"
            /></ElFormItem>
            <ElFormItem label="私有 Bucket"
              ><ElInput v-model="fileForm.minioPrivateBucket"
            /></ElFormItem>
            <ElFormItem class="full" label="公开资源域名"
              ><ElInput
                v-model="fileForm.minioPublicBaseUrl"
                placeholder="https://static.example.com/"
            /></ElFormItem>
            <ElFormItem label="Access Key"
              ><ElInput
                v-model="fileForm.minioAccessKey"
                type="password"
                show-password
                autocomplete="new-password"
                :placeholder="secretHint(fileForm.minioAccessKeyConfigured)"
              /><ElCheckbox v-model="fileForm.clearMinioAccessKey"
                >清除现有密钥</ElCheckbox
              ></ElFormItem
            >
            <ElFormItem label="Secret Key"
              ><ElInput
                v-model="fileForm.minioSecretKey"
                type="password"
                show-password
                autocomplete="new-password"
                :placeholder="secretHint(fileForm.minioSecretKeyConfigured)"
              /><ElCheckbox v-model="fileForm.clearMinioSecretKey"
                >清除现有密钥</ElCheckbox
              ></ElFormItem
            >
          </template>
          <template v-if="fileForm.storageMode === 'OSS'">
            <ElFormItem label="阿里云 OSS Endpoint"
              ><ElInput
                v-model="fileForm.ossEndpoint"
                placeholder="https://oss-cn-hangzhou.aliyuncs.com"
            /></ElFormItem>
            <ElFormItem label="公开 Bucket"
              ><ElInput v-model="fileForm.ossPublicBucket"
            /></ElFormItem>
            <ElFormItem label="私有 Bucket"
              ><ElInput v-model="fileForm.ossPrivateBucket"
            /></ElFormItem>
            <ElFormItem label="公开资源域名"
              ><ElInput
                v-model="fileForm.ossPublicBaseUrl"
                placeholder="https://static.example.com/"
            /></ElFormItem>
            <ElFormItem label="Access Key"
              ><ElInput
                v-model="fileForm.ossAccessKey"
                type="password"
                show-password
                autocomplete="new-password"
                :placeholder="secretHint(fileForm.ossAccessKeyConfigured)"
              /><ElCheckbox v-model="fileForm.clearOssAccessKey"
                >清除现有密钥</ElCheckbox
              ></ElFormItem
            >
            <ElFormItem label="Secret Key"
              ><ElInput
                v-model="fileForm.ossSecretKey"
                type="password"
                show-password
                autocomplete="new-password"
                :placeholder="secretHint(fileForm.ossSecretKeyConfigured)"
              /><ElCheckbox v-model="fileForm.clearOssSecretKey"
                >清除现有密钥</ElCheckbox
              ></ElFormItem
            >
          </template>
          <template v-if="fileForm.storageMode === 'QINIU'">
            <ElFormItem label="七牛空间"><ElInput v-model="fileForm.qiniuBucket" /></ElFormItem>
            <ElFormItem label="七牛访问域名"
              ><ElInput v-model="fileForm.qiniuDomain" placeholder="https://cdn.example.com"
            /></ElFormItem>
            <ElFormItem label="七牛私有 Bucket"
              ><ElInput v-model="fileForm.qiniuPrivateBucket"
            /></ElFormItem>
            <ElFormItem label="七牛私有访问域名"
              ><ElInput v-model="fileForm.qiniuPrivateDomain"
            /></ElFormItem>
            <ElFormItem label="AccessKey">
              <ElInput
                v-model="fileForm.qiniuAccessKey"
                type="password"
                show-password
                autocomplete="new-password"
                :placeholder="secretHint(fileForm.qiniuAccessKeyConfigured)"
              />
              <ElCheckbox v-model="fileForm.clearQiniuAccessKey">清除现有 AccessKey</ElCheckbox>
            </ElFormItem>
            <ElFormItem label="SecretKey">
              <ElInput
                v-model="fileForm.qiniuSecretKey"
                type="password"
                show-password
                autocomplete="new-password"
                :placeholder="secretHint(fileForm.qiniuSecretKeyConfigured)"
              />
              <ElCheckbox v-model="fileForm.clearQiniuSecretKey">清除现有 SecretKey</ElCheckbox>
            </ElFormItem>
          </template>
        </div>
        <div class="actions">
          <span>文件配置版本 v{{ fileForm.revision }}</span>
          <ElButton :loading="connectionChecking" :disabled="fileDirty" @click="checkConnection"
            >测试已保存的连接</ElButton
          >
          <ElButton type="primary" :loading="fileSaving" :disabled="!fileDirty" @click="saveFile"
            >保存文件配置</ElButton
          >
        </div>
      </ArtForm>
    </section>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, reactive, ref } from 'vue'
  import { ElMessage } from 'element-plus'
  import {
    fetchPlatformMessageConfig,
    publishPlatformMessageConfig,
    fetchPlatformFileConfig,
    publishPlatformFileConfig,
    checkPlatformFileConnection,
    type PlatformMessageConfig,
    type PlatformFileConfig
  } from '@/api/platform-services'

  const props = defineProps<{ fileOnly?: boolean }>()

  const messageForm = reactive({} as PlatformMessageConfig)
  const fileForm = reactive({} as PlatformFileConfig)
  const messageBaseline = ref('')
  const fileBaseline = ref('')
  const messageReady = ref(false)
  const fileReady = ref(false)
  const messageLoading = ref(false)
  const fileLoading = ref(false)
  const messageSaving = ref(false)
  const fileSaving = ref(false)
  const connectionChecking = ref(false)
  const messageLoadError = ref(false)
  const fileLoadError = ref(false)
  const messageDirty = computed(
    () => messageReady.value && JSON.stringify(messageForm) !== messageBaseline.value
  )
  const fileDirty = computed(
    () => fileReady.value && JSON.stringify(fileForm) !== fileBaseline.value
  )
  const dirty = computed(() => messageDirty.value || fileDirty.value)
  const secretHint = (configured: boolean) => (configured ? '已配置，留空保持原值' : '尚未配置')

  function acceptMessage(value: PlatformMessageConfig) {
    Object.assign(messageForm, value, {
      mailPassword: '',
      smsAppSecret: '',
      smsAppcode: '',
      clearMailPassword: false,
      clearSmsAppSecret: false,
      clearSmsAppcode: false
    })
    messageBaseline.value = JSON.stringify(messageForm)
    messageReady.value = true
  }
  function acceptFile(value: PlatformFileConfig) {
    Object.assign(fileForm, value, {
      imageCompressionEnabled: value.imageCompressionEnabled ?? false,
      imageCompressionTargetMb: value.imageCompressionTargetMb ?? 2,
      qiniuAccessKey: '',
      qiniuSecretKey: '',
      minioAccessKey: '',
      minioSecretKey: '',
      ossAccessKey: '',
      ossSecretKey: '',
      clearQiniuAccessKey: false,
      clearQiniuSecretKey: false,
      clearMinioAccessKey: false,
      clearMinioSecretKey: false,
      clearOssAccessKey: false,
      clearOssSecretKey: false
    })
    fileBaseline.value = JSON.stringify(fileForm)
    fileReady.value = true
  }
  async function reloadMessage() {
    messageLoading.value = true
    messageLoadError.value = false
    try {
      acceptMessage(await fetchPlatformMessageConfig())
    } catch {
      messageReady.value = false
      messageLoadError.value = true
    } finally {
      messageLoading.value = false
    }
  }
  async function reloadFile() {
    fileLoading.value = true
    fileLoadError.value = false
    try {
      acceptFile(await fetchPlatformFileConfig())
    } catch {
      fileReady.value = false
      fileLoadError.value = true
    } finally {
      fileLoading.value = false
    }
  }
  async function saveMessage() {
    if (messageSaving.value || !messageReady.value || !messageDirty.value) return
    messageSaving.value = true
    try {
      acceptMessage(await publishPlatformMessageConfig({ ...messageForm }))
      ElMessage.success('信息配置已保存')
    } catch {
      // 请求层已显示服务端的具体错误，避免再叠加一条笼统提示。
    } finally {
      messageSaving.value = false
    }
  }
  async function saveFile() {
    if (fileSaving.value || !fileReady.value || !fileDirty.value) return
    fileSaving.value = true
    try {
      acceptFile(await publishPlatformFileConfig({ ...fileForm }))
      ElMessage.success('文件配置已保存')
    } catch {
      // 请求层已显示服务端的具体错误，避免再叠加一条笼统提示。
    } finally {
      fileSaving.value = false
    }
  }
  async function checkConnection() {
    connectionChecking.value = true
    try {
      await checkPlatformFileConnection()
      ElMessage.success('公开与私有存储连接正常')
    } finally {
      connectionChecking.value = false
    }
  }
  onMounted(() => {
    if (!props.fileOnly) void reloadMessage()
    void reloadFile()
  })
  defineExpose({ dirty })
</script>

<style scoped lang="scss">
  .service-config {
    padding: 28px;
    margin-top: 24px;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-light);
    border-radius: 14px;
    scroll-margin-top: var(--website-sticky-top);
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
  }

  header h2 {
    margin: 0 0 8px;
    font-size: 19px;
  }

  header p {
    margin: 0;
    color: var(--el-text-color-secondary);
  }

  h3 {
    margin: 28px 0 18px;
    font-size: 16px;
  }

  .field-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 22px;
  }

  .full {
    grid-column: 1 / -1;
  }

  .field-hint {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .actions {
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: flex-end;
    padding-top: 16px;
    color: var(--el-text-color-secondary);
  }

  @media (width <= 700px) {
    .field-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
