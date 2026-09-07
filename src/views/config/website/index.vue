<template>
  <div class="website-page" :style="{ '--website-sticky-top': `${headerHeight + 16}px` }">
    <aside class="config-nav">
      <div class="nav-heading">配置分组 <ElTag size="small" effect="plain">平台全局</ElTag></div>
      <button
        v-for="item in sections"
        :key="item.id"
        :class="{ active: active === item.id }"
        @click="jump(item.id)"
      >
        <ArtSvgIcon :icon="item.icon" /><span>{{ item.label }}</span>
      </button>
      <div class="publish-note"
        ><strong>发布影响</strong><p>配置保存后应用于登录页、系统品牌、公共水印与浏览器标题。</p
        ><small>由超级管理员统一管理。</small></div
      >
    </aside>

    <main v-loading="loading" class="config-main">
      <div id="website-overview" class="status-grid">
        <article
          ><span>站点状态 <ArtSvgIcon icon="ri:pulse-line" /></span
          ><strong>{{ form.maintenanceEnabled ? '维护中' : '站点正常开放' }}</strong
          ><p>{{
            form.maintenanceEnabled
              ? '普通管理员暂停登录，超级管理员可登录处理维护。'
              : '管理端保持正常登录。'
          }}</p></article
        >
        <article
          ><span>验证码 <ArtSvgIcon icon="ri:shield-keyhole-line" /></span
          ><strong>{{ form.captchaEnabled ? '图片验证码' : '未开启' }}</strong
          ><p>{{
            form.captchaEnabled ? '服务端校验，一次有效。' : '登录时无需填写图片验证码。'
          }}</p></article
        >
        <article
          ><span>安全锁定 <ArtSvgIcon icon="ri:lock-line" /></span
          ><strong>{{
            form.maxLoginAttempts ? `${form.maxLoginAttempts} 次后锁定` : '不限失败次数'
          }}</strong
          ><p>{{
            form.maxLoginAttempts
              ? `15 分钟内累计失败后锁定 ${form.lockMinutes} 分钟。`
              : '仍保留服务端的基础请求频率限制。'
          }}</p></article
        >
        <article
          ><span>品牌名称 <ArtSvgIcon icon="ri:bookmark-line" /></span
          ><strong :title="form.systemName">{{ form.systemName || '未填写' }}</strong
          ><p>统一登录页、侧栏与顶栏品牌展示。</p></article
        >
      </div>
      <ElAlert
        v-if="loadError"
        class="load-error"
        type="error"
        :closable="false"
        title="配置加载失败，暂时无法保存"
        ><template #default
          ><ElButton link type="primary" @click="reload">重新加载</ElButton></template
        ></ElAlert
      >
      <ArtForm
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        size="large"
        :disabled="loading || saving || !ready"
      >
        <section id="website-identity" class="config-section">
          <header
            ><div><h2>系统标识</h2><p>配置系统名称、简介与公共水印内容。</p></div
            ><ArtSvgIcon icon="ri:apps-2-line"
          /></header>
          <div class="field-grid">
            <ElFormItem label="系统名称" prop="systemName"
              ><ElInput v-model="form.systemName" maxlength="80" show-word-limit /><small
                >用于登录页、顶部栏与侧边栏。</small
              ></ElFormItem
            >
            <ElFormItem label="水印内容" prop="watermarkMode"
              ><ElSelect v-model="form.watermarkMode"
                ><ElOption
                  v-for="o in watermarkOptions"
                  :key="o.value"
                  :label="o.label"
                  :value="o.value" /></ElSelect
            ></ElFormItem>
            <ElFormItem
              v-if="form.watermarkMode === 'custom'"
              class="full"
              label="自定义水印文本"
              prop="watermarkText"
              ><ElInput v-model="form.watermarkText" maxlength="100" show-word-limit
            /></ElFormItem>
            <ElFormItem class="full" label="站点简介" prop="description"
              ><ElInput
                v-model="form.description"
                type="textarea"
                :rows="3"
                maxlength="255"
                show-word-limit
            /></ElFormItem>
          </div>
          <div class="switch-row"
            ><div
              ><strong>启用公共水印</strong
              ><p>在已登录的管理页面展示。个人设置中可以临时隐藏。</p></div
            ><ElSwitch v-model="form.watermarkEnabled" aria-label="启用公共水印"
          /></div>
        </section>

        <section id="website-login" class="config-section">
          <header
            ><div><h2>登录体验</h2><p>设置欢迎文案、默认语言、验证码、安全锁定与维护模式。</p></div
            ><ArtSvgIcon icon="ri:shield-star-line"
          /></header>
          <div class="field-grid">
            <ElFormItem label="登录欢迎标题" prop="loginTitle"
              ><ElInput
                v-model="form.loginTitle"
                maxlength="100"
                placeholder="留空使用默认欢迎标题"
            /></ElFormItem>
            <ElFormItem label="默认语言" prop="defaultLanguage"
              ><ElSelect v-model="form.defaultLanguage"
                ><ElOption label="简体中文" value="zh" /><ElOption
                  label="English"
                  value="en" /></ElSelect
              ><small>应用于未手动选择语言的用户。</small></ElFormItem
            >
            <ElFormItem class="full" label="登录欢迎描述" prop="loginDescription"
              ><ElInput
                v-model="form.loginDescription"
                type="textarea"
                :rows="3"
                maxlength="255"
                show-word-limit
            /></ElFormItem>
          </div>
          <div class="field-grid three">
            <ElFormItem label="验证码类型"
              ><ElSelect v-model="form.captchaType" :disabled="!form.captchaEnabled"
                ><ElOption label="图片验证码" value="image" /></ElSelect
              ><small>由后端生成并一次性校验。</small></ElFormItem
            >
            <ElFormItem label="最大失败次数" prop="maxLoginAttempts"
              ><ElInputNumber
                v-model="attempts"
                :min="1"
                :max="100"
                :precision="0"
                controls-position="right"
                placeholder="留空不限制"
              /><small>按登录账号统计，成功后清零。</small></ElFormItem
            >
            <ElFormItem label="锁定时间（分钟）" prop="lockMinutes"
              ><ElInputNumber
                v-model="form.lockMinutes"
                :disabled="!form.maxLoginAttempts"
                :min="1"
                :max="1440"
                :precision="0"
                controls-position="right"
            /></ElFormItem>
          </div>
          <div class="switch-row"
            ><div
              ><strong>图片验证码</strong
              ><p>开启后，密码登录与手机 / 邮箱验证码登录均需通过图片校验。</p></div
            ><ElSwitch v-model="form.captchaEnabled" aria-label="图片验证码"
          /></div>
          <div class="switch-row"
            ><div
              ><strong>维护模式</strong
              ><p>登录页展示维护公告，暂停普通管理员登录；超级管理员可继续登录。</p></div
            ><ElSwitch v-model="form.maintenanceEnabled" aria-label="维护模式"
          /></div>
          <ElFormItem class="maintenance-input" label="维护提示文案" prop="maintenanceMessage"
            ><ElInput
              v-model="form.maintenanceMessage"
              maxlength="255"
              placeholder="例如：系统今晚 23:00–24:00 升级维护"
          /></ElFormItem>
        </section>

        <section id="website-seo" class="config-section">
          <header
            ><div><h2>SEO 与搜索展现</h2><p>设置浏览器标题、页面摘要与品牌检索信息。</p></div
            ><ArtSvgIcon icon="ri:search-eye-line"
          /></header>
          <ElFormItem label="SEO 标题" prop="seoTitle"
            ><ElInput
              v-model="form.seoTitle"
              maxlength="100"
              placeholder="留空使用系统名称"
            /><small>浏览器标题显示为「页面名称 - SEO 标题」。</small></ElFormItem
          >
          <ElFormItem label="SEO 关键词" prop="seoKeywords"
            ><ElInput v-model="form.seoKeywords" maxlength="255" placeholder="多个关键词用逗号分隔"
          /></ElFormItem>
          <ElFormItem label="SEO 描述" prop="seoDescription"
            ><ElInput
              v-model="form.seoDescription"
              type="textarea"
              :rows="3"
              maxlength="500"
              show-word-limit
              placeholder="留空使用站点简介"
          /></ElFormItem>
          <p class="section-hint">用于页面元信息展示。搜索引擎是否收录及最终摘要由搜索引擎决定。</p>
        </section>

        <section id="website-contact" class="config-section">
          <header
            ><div><h2>联系与合规信息</h2><p>配置对外联系方式、地址和登录页页脚文案。</p></div
            ><ArtSvgIcon icon="ri:file-shield-2-line"
          /></header>
          <div class="field-grid">
            <ElFormItem label="联系邮箱" prop="contactEmail"
              ><ElInput
                v-model="form.contactEmail"
                maxlength="120"
                placeholder="support@example.com"
            /></ElFormItem>
            <ElFormItem label="联系电话" prop="contactPhone"
              ><ElInput v-model="form.contactPhone" maxlength="50" placeholder="400-800-9000"
            /></ElFormItem>
            <ElFormItem class="full" label="联系地址" prop="contactAddress"
              ><ElInput
                v-model="form.contactAddress"
                maxlength="255"
                placeholder="填写公开联系地址"
            /></ElFormItem>
            <ElFormItem class="full" label="版权文案" prop="copyright"
              ><ElInput v-model="form.copyright" maxlength="255" placeholder="Copyright © LiteShop"
            /></ElFormItem>
            <ElFormItem label="ICP 备案号" prop="icpNumber"
              ><ElInput v-model="form.icpNumber" maxlength="100" placeholder="填写实际备案号"
            /></ElFormItem>
            <ElFormItem label="公安备案号" prop="publicSecurityNumber"
              ><ElInput
                v-model="form.publicSecurityNumber"
                maxlength="100"
                placeholder="填写实际备案号"
            /></ElFormItem>
          </div>
        </section>

        <section id="website-preview" class="config-section">
          <header
            ><div><h2>发布预览</h2><p>预览当前表单内容，保存后应用到网站。</p></div
            ><ElTag :type="dirty ? 'warning' : 'success'">{{
              dirty ? '有未保存的修改' : '已与发布配置同步'
            }}</ElTag></header
          >
          <div class="preview-grid">
            <div class="login-preview"
              ><span class="preview-brand">{{ form.systemName || '系统名称' }}</span
              ><h3>{{ form.loginTitle || '欢迎回来' }}</h3
              ><p>{{ form.loginDescription || form.description }}</p
              ><ElAlert
                v-if="form.maintenanceEnabled"
                :title="form.maintenanceMessage || '系统维护中'"
                type="warning"
                :closable="false"
              /><div class="preview-input">账号 / 手机号 / 邮箱</div
              ><div class="preview-input">••••••••</div><div class="preview-submit">登录</div
              ><small v-if="form.watermarkEnabled">水印预览：{{ previewWatermark }}</small></div
            >
            <div class="search-preview"
              ><span class="preview-label">浏览器与搜索摘要</span
              ><h3>{{ form.seoTitle || form.systemName }}</h3
              ><p>{{ form.seoDescription || form.description || '填写描述后在这里预览' }}</p
              ><hr /><WebsiteFooter :config="form"
            /></div>
          </div>
        </section>
      </ArtForm>
      <footer class="save-bar"
        ><div
          ><strong>{{ form.systemName || '网站配置' }}</strong
          ><p>{{ dirty ? '修改尚未发布' : `当前发布版本 v${form.revision}` }}</p></div
        ><div class="save-actions"
          ><ElButton :disabled="!ready || loading || saving" @click="reset">重置当前表单</ElButton
          ><ElButton
            type="primary"
            :disabled="!ready || loading || !dirty"
            :loading="saving"
            @click="save"
            >保存并发布配置</ElButton
          ></div
        ></footer
      >
    </main>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, reactive, ref } from 'vue'
  import { useElementSize } from '@vueuse/core'
  import { onBeforeRouteLeave } from 'vue-router'
  import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
  import { defaultWebsiteConfig, type WebsiteConfig } from '@/config/website'
  import { fetchWebsiteConfig, publishWebsiteConfig } from '@/api/website-config'
  import { useWebsiteStore } from '@/store/modules/website'
  import WebsiteFooter from '@/components/business/WebsiteFooter.vue'

  defineOptions({ name: 'WebsiteConfiguration' })
  const site = useWebsiteStore()
  const headerElement = ref<HTMLElement>()
  const { height: headerHeight } = useElementSize(headerElement)
  const form = reactive<WebsiteConfig>({
    ...defaultWebsiteConfig,
    maxLoginAttempts: null,
    lockMinutes: 10
  })
  const baseline = ref('')
  const ready = ref(false)
  const loading = ref(false)
  const saving = ref(false)
  const loadError = ref(false)
  const formRef = ref<FormInstance>()
  const active = ref('overview')
  const dirty = computed(() => ready.value && JSON.stringify(form) !== baseline.value)
  const attempts = computed({
    get: () => form.maxLoginAttempts ?? undefined,
    set: (value: number | undefined | null) => {
      form.maxLoginAttempts = value ?? null
    }
  })
  const sections = [
    { id: 'overview', label: '状态概览', icon: 'ri:pulse-line' },
    { id: 'identity', label: '系统标识', icon: 'ri:apps-2-line' },
    { id: 'login', label: '登录体验', icon: 'ri:shield-star-line' },
    { id: 'seo', label: 'SEO 展现', icon: 'ri:search-eye-line' },
    { id: 'contact', label: '联系合规', icon: 'ri:file-shield-2-line' },
    { id: 'preview', label: '发布预览', icon: 'ri:edit-box-line' }
  ]
  const watermarkOptions = [
    { value: 'username', label: '用户名' },
    { value: 'username_time', label: '用户名 + 时间' },
    { value: 'system', label: '系统名称' },
    { value: 'custom', label: '自定义文本' }
  ]
  const previewWatermark = computed(
    () =>
      ({
        username: '当前用户名',
        username_time: '当前用户名 · 当前时间',
        system: form.systemName,
        custom: form.watermarkText
      }[form.watermarkMode])
  )
  const rules: FormRules = {
    systemName: [{ required: true, whitespace: true, message: '请输入系统名称', trigger: 'blur' }],
    contactEmail: [{ type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }],
    watermarkText: [
      {
        validator: (_rule, value, done) =>
          done(
            form.watermarkEnabled && form.watermarkMode === 'custom' && !value?.trim()
              ? new Error('请输入自定义水印内容')
              : undefined
          ),
        trigger: 'blur'
      }
    ],
    maintenanceMessage: [
      {
        validator: (_rule, value, done) =>
          done(
            form.maintenanceEnabled && !value?.trim() ? new Error('请输入维护提示文案') : undefined
          ),
        trigger: 'blur'
      }
    ]
  }
  function jump(id: string) {
    active.value = id
    document.getElementById(`website-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  function accept(data: WebsiteConfig) {
    Object.assign(form, data)
    baseline.value = JSON.stringify(form)
    ready.value = true
  }
  async function reload() {
    loading.value = true
    loadError.value = false
    try {
      accept(await fetchWebsiteConfig())
    } catch {
      loadError.value = true
      ready.value = false
    } finally {
      loading.value = false
    }
  }
  function reset() {
    if (baseline.value) Object.assign(form, JSON.parse(baseline.value))
    formRef.value?.clearValidate()
  }
  async function save() {
    if (saving.value || !ready.value || !(await formRef.value?.validate().catch(() => false)))
      return
    saving.value = true
    try {
      const published = await publishWebsiteConfig({ ...form, systemName: form.systemName.trim() })
      accept(published)
      site.published(published)
      ElMessage.success('网站配置已保存并发布')
    } catch (error) {
      if ((error as { code?: number }).code === 409) {
        const reloadLatest = await ElMessageBox.confirm(
          '其他管理员已发布新配置。重新加载会替换当前表单，是否继续？',
          '配置版本冲突',
          { confirmButtonText: '加载最新配置', cancelButtonText: '保留当前表单', type: 'warning' }
        )
          .then(() => true)
          .catch(() => false)
        if (reloadLatest) await reload()
      }
    } finally {
      saving.value = false
    }
  }
  onMounted(() => {
    headerElement.value = document.getElementById('app-header') || undefined
    void reload()
  })
  onBeforeRouteLeave(
    async () =>
      !dirty.value ||
      (await ElMessageBox.confirm('当前修改尚未保存，确定离开吗？', '未保存的修改', {
        type: 'warning'
      })
        .then(() => true)
        .catch(() => false))
  )
</script>

<style scoped lang="scss">
  .website-page {
    display: grid;
    grid-template-columns: 230px minmax(0, 1fr);
    gap: 24px;
    align-items: start;
    color: var(--el-text-color-primary);
  }

  .config-nav,
  .config-section,
  .status-grid article,
  .save-bar {
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-light);
    border-radius: 14px;
  }

  .config-nav {
    position: sticky;
    top: var(--website-sticky-top);
    padding: 24px 16px;
  }

  .nav-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px 22px;
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }

  .config-nav button {
    display: flex;
    gap: 14px;
    align-items: center;
    width: 100%;
    padding: 15px;
    margin-bottom: 8px;
    font-size: 15px;
    color: var(--el-text-color-regular);
    text-align: left;
    cursor: pointer;
    background: transparent;
    border: 0;
    border-radius: 8px;
  }

  .config-nav button.active,
  .config-nav button:hover {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }

  .publish-note {
    padding: 18px;
    margin: 28px 0 0;
    font-size: 13px;
    line-height: 1.8;
    background: var(--el-fill-color-light);
    border-radius: 8px;
  }

  .publish-note p,
  .publish-note small {
    color: var(--el-text-color-secondary);
  }

  .config-main {
    min-width: 0;
  }

  .status-grid {
    scroll-margin-top: var(--website-sticky-top);
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }

  .status-grid article {
    min-width: 0;
    padding: 22px;
  }

  .status-grid span {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }

  .status-grid strong {
    display: block;
    margin-top: 20px;
    overflow: hidden;
    font-size: 21px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .status-grid p {
    margin: 10px 0 0;
    font-size: 13px;
    line-height: 1.8;
    color: var(--el-text-color-secondary);
  }

  .config-section {
    padding: 30px;
    margin-bottom: 24px;
    scroll-margin-top: var(--website-sticky-top);
  }

  .config-section header {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    justify-content: space-between;
    padding-bottom: 24px;
    margin-bottom: 28px;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  h2 {
    margin: 0;
    font-size: 21px;
    font-weight: 650;
  }

  header p {
    margin: 10px 0 0;
    font-size: 14px;
    line-height: 1.7;
    color: var(--el-text-color-secondary);
  }

  .field-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 24px;
  }

  .field-grid.three {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .full {
    grid-column: 1 / -1;
  }

  :deep(.el-form-item) {
    margin-bottom: 28px;
  }

  :deep(.el-select),
  :deep(.el-input-number) {
    width: 100%;
  }

  :deep(.el-form-item__content) {
    align-content: flex-start;
  }

  .el-form-item small {
    display: block;
    width: 100%;
    margin-top: 7px;
    font-size: 12px;
    line-height: 1.6;
    color: var(--el-text-color-secondary);
  }

  .switch-row {
    display: flex;
    gap: 24px;
    align-items: center;
    justify-content: space-between;
    padding: 20px;
    margin-bottom: 16px;
    background: var(--el-fill-color-extra-light);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 9px;
  }

  .switch-row p,
  .section-hint {
    margin: 8px 0 0;
    font-size: 13px;
    line-height: 1.7;
    color: var(--el-text-color-secondary);
  }

  .maintenance-input {
    margin-top: 24px;
  }

  .preview-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }

  .login-preview,
  .search-preview {
    padding: 26px;
    overflow-wrap: anywhere;
    border: 1px solid var(--el-border-color-light);
    border-radius: 10px;
  }

  .preview-brand {
    font-weight: 700;
    color: var(--el-color-primary);
  }

  .login-preview h3 {
    margin: 22px 0 10px;
    font-size: 20px;
  }

  .preview-grid p,
  .preview-grid small {
    font-size: 13px;
    line-height: 1.8;
    color: var(--el-text-color-secondary);
  }

  .preview-input {
    padding: 10px 14px;
    margin: 14px 0;
    font-size: 13px;
    color: var(--el-text-color-placeholder);
    border: 1px solid var(--el-border-color);
    border-radius: 6px;
  }

  .preview-submit {
    padding: 10px;
    margin-bottom: 16px;
    color: white;
    text-align: center;
    background: var(--el-color-primary);
    border-radius: 6px;
  }

  .preview-label {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .search-preview h3 {
    margin: 20px 0 8px;
    color: var(--el-color-primary);
  }

  .search-preview hr {
    margin: 28px 0;
    border: 0;
    border-top: 1px solid var(--el-border-color-light);
  }

  .save-bar {
    position: sticky;
    bottom: 0;
    z-index: 10;
    display: flex;
    gap: 20px;
    align-items: center;
    justify-content: space-between;
    padding: 20px 26px;
    box-shadow: 0 -5px 24px rgb(0 0 0 / 3%);
  }

  .save-bar strong {
    font-size: 17px;
    overflow-wrap: anywhere;
  }

  .save-bar p {
    margin: 7px 0 0;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .save-actions {
    display: flex;
    flex-shrink: 0;
  }

  .load-error {
    margin-bottom: 20px;
  }

  @media (width <= 1300px) {
    .status-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .website-page {
      grid-template-columns: 200px minmax(0, 1fr);
      gap: 18px;
    }
  }

  @media (width <= 900px) {
    .website-page {
      display: block;
    }

    .config-nav {
      position: static;
      display: flex;
      gap: 8px;
      padding: 10px;
      margin-bottom: 18px;
      overflow-x: auto;
    }

    .nav-heading,
    .publish-note {
      display: none;
    }

    .config-nav button {
      width: auto;
      padding: 10px;
      margin: 0;
      white-space: nowrap;
    }

    .config-section {
      padding: 22px;
    }

    .field-grid.three {
      grid-template-columns: 1fr;
    }
  }

  @media (width <= 600px) {
    .field-grid,
    .preview-grid {
      grid-template-columns: 1fr;
    }

    .save-bar {
      flex-direction: column;
      gap: 12px;
      align-items: stretch;
      padding: 16px;
    }

    .save-actions {
      justify-content: flex-end;
    }

    .status-grid article {
      padding: 16px;
    }

    .status-grid strong {
      font-size: 18px;
    }
  }
</style>
