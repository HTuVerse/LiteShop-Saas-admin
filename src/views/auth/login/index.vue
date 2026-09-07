<template>
  <main class="login-page">
    <section class="login-intro">
      <div class="brand"
        >{{ website.systemName }}<small>{{ website.description }}</small></div
      >
      <div
        ><p class="eyebrow">让日常经营更从容</p><h1>一家门店的日常，<br />一个平台的掌控。</h1
        ><p class="intro-copy"
          >连接门店、商品与订单，专注每一次服务。<br />登录后选择您有权管理的商户，开始今天的工作。</p
        ></div
      >
      <div class="intro-footer"
        ><span>门店经营</span><span>会员营销</span><span>数据分析</span></div
      >
    </section>
    <section class="login-form">
      <div class="form-inner">
        <div class="step-label">安全登录 <span>01 验证身份 · 02 选择商户</span></div>
        <template v-if="selection">
          <h2>{{ selectedTenant ? '选择工作门店' : '选择工作空间' }}</h2
          ><p class="muted">{{
            selectedTenant
              ? `已选择 ${selectedTenant.tenantName}，请选择本次要管理的门店。`
              : '身份验证已通过，请选择本次要管理的商户。'
          }}</p>
          <ElAlert
            :title="'登录凭证剩余 ' + remaining + ' 秒'"
            :type="remaining ? 'info' : 'warning'"
            :closable="false"
          />
          <div v-if="!selectedTenant" class="tenant-options">
            <button
              v-for="tenant in selection.tenants"
              :key="tenant.tenantId"
              :disabled="loading || !remaining"
              @click="chooseTenant(tenant)"
            >
              <span class="tenant-icon">店</span
              ><span
                ><strong>{{ tenant.tenantName }}</strong
                ><small
                  >{{ tenant.tenantCode }} ·
                  {{ tenant.roleCodes?.includes('ADMIN') ? '商户管理员' : '门店账号' }}</small
                ></span
              ><span class="arrow">→</span>
            </button>
          </div>
          <div v-else class="tenant-options">
            <button
              v-for="store in selectedTenant.stores"
              :key="store.storeId"
              :disabled="loading || !remaining"
              @click="chooseStore(store)"
            >
              <span class="tenant-icon">店</span
              ><span
                ><strong>{{ store.storeName }}</strong
                ><small>门店工作空间</small></span
              ><ElTag v-if="store.defaultStore" size="small" effect="plain">默认</ElTag
              ><span class="arrow">→</span>
            </button>
            <ElEmpty
              v-if="!selectedTenant.stores?.length"
              description="尚未分配门店，请联系商户管理员"
            />
          </div>
          <ElButton v-if="selectedTenant" :disabled="loading" @click="selectedTenant = null"
            >返回选择商户</ElButton
          ><ElButton v-else :disabled="loading" @click="resetSelection">返回登录</ElButton>
        </template>
        <template v-else>
          <h2>{{ website.loginTitle || '欢迎回来' }}</h2
          ><p class="muted">{{ website.loginDescription || website.description }}</p>
          <ElAlert
            v-if="website.maintenanceEnabled"
            :title="website.maintenanceMessage"
            description="维护期间普通管理员暂停登录，超级管理员可继续登录处理维护。"
            type="warning"
            :closable="false"
            show-icon
            class="login-notice"
          />
          <ElAlert
            v-if="site.error"
            :title="site.error"
            type="error"
            :closable="false"
            class="login-notice"
            ><template #default
              ><ElButton link type="primary" @click="site.refresh(true)"
                >重新加载</ElButton
              ></template
            ></ElAlert
          >
          <ElTabs v-model="mode"
            ><ElTabPane label="账号密码" name="password" /><ElTabPane
              label="验证码登录"
              name="code"
          /></ElTabs>
          <ArtForm
            ref="formRef"
            :model="form"
            :rules="rules"
            label-position="top"
            size="large"
            @submit.prevent="submit"
          >
            <ElFormItem :label="mode === 'password' ? '账号' : '手机号或邮箱'" prop="account"
              ><ElInput
                v-model.trim="form.account"
                autocomplete="username"
                placeholder="请输入账号 / 手机号 / 邮箱"
                :disabled="loading"
            /></ElFormItem>
            <ElFormItem v-if="mode === 'password'" label="密码" prop="password"
              ><ElInput
                v-model="form.password"
                type="password"
                show-password
                autocomplete="current-password"
                placeholder="请输入密码"
                :disabled="loading"
            /></ElFormItem>
            <ElFormItem v-else label="验证码" prop="verifyCode"
              ><ElInput
                v-model.trim="form.verifyCode"
                autocomplete="one-time-code"
                placeholder="请输入验证码"
                maxlength="8"
                ><template #append
                  ><ElButton :disabled="sending || cooldown > 0 || loading" @click="sendCode">{{
                    cooldown ? cooldown + 's 后重发' : '获取验证码'
                  }}</ElButton></template
                ></ElInput
              ></ElFormItem
            >
            <ElFormItem v-if="website.captchaEnabled" label="图片验证码" prop="captchaCode">
              <div class="captcha-row"
                ><ElInput
                  v-model.trim="form.captchaCode"
                  placeholder="请输入图片验证码"
                  maxlength="4"
                  autocomplete="off"
                  :disabled="loading"
                /><button
                  type="button"
                  :disabled="captchaLoading || loading"
                  aria-label="刷新图片验证码"
                  @click="refreshCaptcha"
                  ><img v-if="captcha.image" :src="captcha.image" alt="图片验证码，点击刷新" /><span
                    v-else
                    >{{ captchaLoading ? '加载中…' : '点击获取' }}</span
                  ></button
                ></div
              >
            </ElFormItem>
            <ElButton
              class="submit"
              type="primary"
              native-type="submit"
              :disabled="!site.loaded || !!site.error || captchaLoading"
              :loading="loading"
              >{{ mode === 'password' ? '验证并继续' : '验证码登录' }}</ElButton
            >
          </ArtForm>
          <p class="help">账号与权限由管理员开通。忘记密码请联系管理员重置。</p>
        </template>
      </div>
      <footer class="login-footer"
        ><WebsiteFooter :config="website" /><span v-if="!website.copyright"
          >{{ website.systemName }} · {{ website.description }}</span
        ></footer
      >
    </section>
  </main>
</template>

<script setup lang="ts">
  import { computed, onUnmounted, reactive, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
  import {
    fetchLogin,
    fetchVerifyCodeLogin,
    normalizeUser,
    selectAdminTenant,
    sendVerifyCode
  } from '@/api/auth'
  import { isHttpError } from '@/utils/http/error'
  import { website } from '@/config/website'
  import { useWebsiteStore } from '@/store/modules/website'
  import { fetchLoginCaptcha, type LoginCaptcha } from '@/api/website-config'
  import WebsiteFooter from '@/components/business/WebsiteFooter.vue'
  import { useUserStore } from '@/store/modules/user'
  import type {
    AdminLoginResult,
    BackendUser,
    StoreOption,
    TenantOption,
    TenantSelection
  } from '@/types/backend'
  const session = useUserStore()
  const site = useWebsiteStore()
  const captcha = ref<LoginCaptcha>({ enabled: false })
  const captchaLoading = ref(false)
  async function refreshCaptcha() {
    if (captchaLoading.value || !website.captchaEnabled) return
    captchaLoading.value = true
    form.captchaCode = ''
    captcha.value = { enabled: true }
    try {
      captcha.value = await fetchLoginCaptcha()
    } catch {
      /* Request reports failure; allow retry. */
    } finally {
      captchaLoading.value = false
    }
  }
  const route = useRoute()
  const router = useRouter()
  const mode = ref('password')
  const formRef = ref<FormInstance>()
  const form = reactive({ account: '', password: '', verifyCode: '', captchaCode: '' })
  watch(
    () => website.captchaEnabled,
    (enabled) => {
      if (enabled) void refreshCaptcha()
    },
    { immediate: true }
  )
  const loading = ref(false)
  const sending = ref(false)
  const cooldownUntil = ref(0)
  const now = ref(Date.now())
  const expiresAt = ref(0)
  // A selection ticket is deliberately kept only in this component's memory.
  const selection = ref<TenantSelection | null>(null)
  const selectedTenant = ref<TenantOption | null>(null)
  const cooldown = computed(() => Math.max(0, Math.ceil((cooldownUntil.value - now.value) / 1000)))
  const remaining = computed(() => Math.max(0, Math.ceil((expiresAt.value - now.value) / 1000)))
  const timer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
  onUnmounted(() => clearInterval(timer))
  const rules: FormRules = {
    captchaCode: [
      {
        validator: (_rule, value, done) =>
          done(website.captchaEnabled && !value ? new Error('请输入图片验证码') : undefined),
        trigger: 'blur'
      }
    ],
    account: [{ required: true, message: '请输入账号', trigger: 'blur' }],
    password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
    verifyCode: [{ required: true, message: '请输入验证码', trigger: 'blur' }]
  }
  watch(mode, () => {
    form.password = ''
    form.verifyCode = ''
    formRef.value?.clearValidate()
  })
  function resetSelection() {
    selection.value = null
    selectedTenant.value = null
    expiresAt.value = 0
    form.password = ''
    form.verifyCode = ''
    if (!session.isLogin) void refreshCaptcha()
  }
  async function complete(user: BackendUser, tenant?: TenantOption, store?: StoreOption) {
    if (
      !user.token ||
      !user.roleCode?.some((role) =>
        ['ADMIN', 'SUPER_ADMIN', 'STORE_ADMIN', 'STORE_STAFF'].includes(role)
      )
    )
      throw new Error('当前账号没有管理权限')
    session.clearBusinessState()
    session.setToken(user.token)
    session.setUserInfo(normalizeUser(user))
    session.activeTenant = tenant
      ? {
          id: tenant.tenantId,
          tenantName: tenant.tenantName,
          tenantCode: tenant.tenantCode,
          status: 1
        }
      : user.currentTenant || null
    session.activeStore =
      store ||
      (user.activeStoreId == null
        ? null
        : {
            storeId: user.activeStoreId,
            storeName: `门店 ${user.activeStoreId}`,
            defaultStore: false
          })
    session.setLoginStatus(true)
    resetSelection()
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    await router.replace(
      redirect.startsWith('/') && !redirect.startsWith('//') && !redirect.startsWith('/auth/')
        ? redirect
        : '/'
    )
  }
  async function accept(result: AdminLoginResult) {
    if ('tenantSelectionRequired' in result && result.tenantSelectionRequired === true) {
      const next = result as TenantSelection
      if (!next.selectionTicket || !next.tenants?.length)
        throw new Error('没有可用商户，请联系管理员')
      selection.value = next
      expiresAt.value = Date.now() + next.expiresInSeconds * 1000
      form.password = ''
      form.verifyCode = ''
    } else await complete(result as BackendUser)
  }
  async function submit() {
    if (loading.value) return
    await site.refresh(true)
    if (site.error || !site.loaded) return
    if (loading.value || !(await formRef.value?.validate().catch(() => false))) return
    loading.value = true
    try {
      await accept(
        mode.value === 'password'
          ? await fetchLogin({
              account: form.account,
              password: form.password,
              captchaId: captcha.value.captchaId,
              captchaCode: form.captchaCode
            })
          : await fetchVerifyCodeLogin({
              account: form.account,
              verifyCode: form.verifyCode,
              captchaId: captcha.value.captchaId,
              captchaCode: form.captchaCode
            })
      )
    } catch (error) {
      if (!isHttpError(error)) ElMessage.error(error instanceof Error ? error.message : '登录失败')
      await refreshCaptcha()
    } finally {
      loading.value = false
    }
  }
  async function chooseTenant(tenant: TenantOption) {
    if (!selection.value || !remaining.value || loading.value) return
    const stores = tenant.stores || []
    if (!tenant.roleCodes?.includes('ADMIN') && stores.length !== 1) {
      selectedTenant.value = tenant
      return
    }
    await finishSelection(tenant, stores.length === 1 ? stores[0] : undefined)
  }
  async function chooseStore(store: StoreOption) {
    if (!selectedTenant.value) return
    await finishSelection(selectedTenant.value, store)
  }
  async function finishSelection(tenant: TenantOption, store?: StoreOption) {
    if (!selection.value || !remaining.value || loading.value) return
    loading.value = true
    const ticket = selection.value.selectionTicket
    try {
      await complete(
        await selectAdminTenant(ticket, tenant.tenantId, store?.storeId),
        tenant,
        store
      )
    } catch {
      // The server consumes the ticket before validating the selected tenant. Never reuse it.
      resetSelection()
      ElMessage.warning('本次登录凭证已使用，请重新验证身份')
    } finally {
      loading.value = false
    }
  }
  async function sendCode() {
    if (sending.value || cooldown.value) return
    if (!/^1[3-9]\d{9}$/.test(form.account) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.account)) {
      ElMessage.warning('请输入有效手机号或邮箱')
      return
    }
    sending.value = true
    try {
      await sendVerifyCode(form.account)
      cooldownUntil.value = Date.now() + 60000
      ElMessage.success('验证码已发送')
    } catch {
      /* Central request error. */
    } finally {
      sending.value = false
    }
  }
</script>

<style scoped>
  .login-notice {
    margin: 16px 0;
  }

  .captcha-row {
    display: flex;
    gap: 12px;
    width: 100%;
  }

  .captcha-row button {
    flex-shrink: 0;
    width: 150px;
    padding: 0;
    overflow: hidden;
    cursor: pointer;
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color);
    border-radius: 6px;
  }

  .captcha-row img {
    display: block;
    width: 100%;
    height: 46px;
  }

  .login-page {
    display: grid;
    grid-template-rows: minmax(0, 1fr);
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
    height: 100vh;
    height: 100dvh;
    min-height: 0;
    overflow: hidden;
    color: #172d30;
    background: #f9fafb;
  }

  .login-intro {
    position: relative;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 0;
    padding: 58px 9%;
    overflow: hidden;
    color: #edf6ef;
    overflow-wrap: anywhere;
    background: #123f3a;
  }

  .login-intro::after {
    position: absolute;
    right: -370px;
    bottom: 20px;
    width: 600px;
    height: 600px;
    pointer-events: none;
    content: '';
    border: 1px solid #95b8a330;
    border-radius: 50%;
  }

  .brand {
    font-size: 27px;
    font-weight: 750;
    letter-spacing: 2px;
  }

  .brand span {
    color: #b4d9b5;
  }

  .brand small {
    display: block;
    margin-top: 9px;
    font-size: 12px;
    font-weight: 400;
    color: #b5cbc5;
    letter-spacing: 4px;
  }

  .eyebrow {
    font-size: 13px;
    color: #b4d9b5;
    letter-spacing: 4px;
  }

  h1 {
    margin: 25px 0;
    font-size: clamp(32px, 3.3vw, 54px);
    font-weight: 550;
    line-height: 1.55;
  }

  .intro-copy {
    font-size: 15px;
    line-height: 2.2;
    color: #b9d0ca;
  }

  .intro-footer {
    display: flex;
    gap: 30px;
    font-size: 12px;
    color: #a6c1b7;
  }

  .login-form {
    position: relative;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 30px;
    align-items: center;
    justify-content: flex-start;
    min-width: 0;
    min-height: 0;
    padding: 50px 30px 28px;
    overflow-y: auto;
  }

  .form-inner {
    flex-shrink: 0;
    width: 100%;
    max-width: 390px;
    margin-block: auto;
    overflow-wrap: anywhere;
  }

  .step-label {
    margin-bottom: 42px;
    font-size: 12px;
    color: #46796a;
  }

  .step-label span {
    float: right;
    font-size: 11px;
    color: #929b9c;
  }

  h2 {
    margin: 0 0 13px;
    font-size: 29px;
  }

  .muted {
    margin-bottom: 28px;
    font-size: 14px;
    color: #7b8686;
  }

  .submit {
    width: 100%;
    height: 48px;
    margin-top: 12px;
    background: #205e50;
    border-color: #205e50;
  }

  .help {
    margin-top: 23px;
    font-size: 12px;
    line-height: 1.9;
    color: #969e9d;
  }

  .login-footer {
    flex-shrink: 0;
    width: 100%;
    max-width: 560px;
    font-size: 12px;
    color: #a1aaa8;
    text-align: center;
    overflow-wrap: anywhere;
  }

  .tenant-options {
    display: grid;
    gap: 12px;
    margin: 20px 0;
  }

  .tenant-options button {
    display: flex;
    gap: 15px;
    align-items: center;
    padding: 17px;
    color: #173d33;
    text-align: left;
    cursor: pointer;
    background: white;
    border: 1px solid #dce5e0;
    border-radius: 9px;
  }

  .tenant-options button:hover {
    border-color: #205e50;
  }

  .tenant-options button:disabled {
    cursor: default;
    opacity: 0.5;
  }

  .tenant-options small {
    display: block;
    margin-top: 5px;
    color: #939d96;
  }

  .tenant-icon {
    padding: 10px;
    background: #edf4ee;
    border-radius: 8px;
  }

  .arrow {
    margin-left: auto;
  }

  @media (height <= 800px) {
    .login-intro {
      padding-block: 32px;
    }

    .login-form {
      gap: 20px;
      padding-block: 24px 20px;
    }

    .step-label {
      margin-bottom: 24px;
    }

    .muted {
      margin-bottom: 18px;
    }

    .form-inner :deep(.el-form-item) {
      margin-bottom: 20px;
    }

    .help {
      margin-top: 16px;
    }
  }

  @media (width <= 800px) {
    .login-page {
      grid-template-rows: auto minmax(0, 1fr);
      grid-template-columns: minmax(0, 1fr);
    }

    .login-intro {
      min-height: auto;
      padding: 25px 30px;
    }

    .login-intro > div:nth-child(2),
    .intro-footer {
      display: none;
    }

    .login-form {
      gap: 20px;
      padding: 24px 24px 20px;
    }

    .step-label {
      margin-bottom: 25px;
    }
  }
</style>
