<template>
  <div class="payment-account-page art-full-height">
    <ElAlert type="info" :closable="false" show-icon class="inheritance-alert">
      <template #title>支付账户由租户总部统一维护</template>
      当前租户下所有门店自动沿用这里启用的支付参数；门店管理员和门店员工无法查看或修改。支付宝沙箱环境会进入测试收银台，收到支付宝支付成功通知后才完成订单。当前微信支付
      API v3 暂不支持小程序沙箱下单。
    </ElAlert>

    <div v-loading="loading" class="channel-grid">
      <section v-for="channel in channels" :key="channel.code" class="channel-card">
        <header class="channel-header">
          <div class="channel-title">
            <span :class="['channel-icon', channel.code.toLowerCase()]">
              <ArtSvgIcon :icon="channel.icon" />
            </span>
            <div>
              <h2>{{ channel.name }}</h2>
              <p>{{ channel.description }}</p>
            </div>
          </div>
          <ElTag :type="channel.form.enabled ? 'success' : 'info'" effect="light">
            {{ channel.form.enabled ? '已启用' : '未启用' }}
          </ElTag>
        </header>

        <ArtForm
          :ref="(instance) => setFormRef(channel.code, instance)"
          :model="channel.form"
          :rules="rulesFor(channel.code)"
          label-position="top"
          :disabled="loading || saving[channel.code]"
          @submit.prevent="submit(channel.code)"
        >
          <div class="enable-row">
            <div>
              <strong>启用{{ channel.name }}</strong>
              <p>启用后，租户下门店发起的对应渠道支付将使用本账户。</p>
            </div>
            <ElSwitch
              v-model="channel.form.enabled"
              :aria-label="`启用${channel.name}`"
              @change="onEnabledChange(channel.code)"
            />
          </div>

          <ElFormItem
            :label="channel.code === 'WECHAT' ? '小程序 AppId' : '支付宝应用 ID'"
            prop="appId"
          >
            <ElInput
              v-model.trim="channel.form.appId"
              maxlength="64"
              :placeholder="
                channel.code === 'WECHAT' ? '请输入微信小程序 AppId' : '请输入支付宝应用 ID'
              "
            />
          </ElFormItem>

          <ElFormItem :label="`${channel.name}回调地址`" prop="notifyUrl">
            <ElInput
              v-model.trim="channel.form.notifyUrl"
              maxlength="500"
              :placeholder="`https://example.com/${channel.code === 'WECHAT' ? 'wechatPay' : 'alipayPay'}/notify`"
            />
          </ElFormItem>
          <ElFormItem
            :label="channel.code === 'ALIPAY' ? '支付宝沙箱环境' : '微信沙箱环境（暂不支持）'"
          >
            <ElSwitch
              v-model="channel.form.sandboxEnabled"
              :aria-label="`${channel.name}沙箱环境`"
              :disabled="channel.code === 'WECHAT' && !channel.form.sandboxEnabled"
            />
          </ElFormItem>

          <template v-if="channel.code === 'WECHAT'">
            <div class="field-grid">
              <ElFormItem label="微信商户号" prop="mchId">
                <ElInput
                  v-model.trim="channel.form.mchId"
                  maxlength="64"
                  placeholder="请输入商户号"
                />
              </ElFormItem>
              <ElFormItem label="商户 API 证书序列号" prop="mchSerialNo">
                <ElInput
                  v-model.trim="channel.form.mchSerialNo"
                  maxlength="128"
                  placeholder="请输入证书序列号"
                />
              </ElFormItem>
            </div>
            <SecretField
              v-model="channel.form.privateKey"
              v-model:clear="channel.form.clearPrivateKey"
              label="商户 API 私钥"
              prop="privateKey"
              multiline
              :disable-clear="channel.form.enabled"
              :configured="channel.form.privateKeyConfigured"
              placeholder="请粘贴 PEM 格式商户私钥"
            />
            <SecretField
              v-model="channel.form.apiV3Key"
              v-model:clear="channel.form.clearApiV3Key"
              label="APIv3 密钥"
              prop="apiV3Key"
              :disable-clear="channel.form.enabled"
              :configured="channel.form.apiV3KeyConfigured"
              placeholder="请输入 32 位 APIv3 密钥"
            />
          </template>

          <template v-else>
            <ElAlert type="warning" :closable="false" class="alipay-key-alert">
              当前系统使用支付宝公钥模式。请在支付宝开放平台启用公钥模式，上传应用公钥；下方填写与之配对的应用私钥，以及支付宝提供的平台公钥。应用公钥不能填入“支付宝公钥”。
            </ElAlert>
            <SecretField
              v-model="channel.form.privateKey"
              v-model:clear="channel.form.clearPrivateKey"
              label="应用私钥"
              prop="privateKey"
              multiline
              :disable-clear="channel.form.enabled"
              :configured="channel.form.privateKeyConfigured"
              placeholder="请粘贴支付宝应用私钥"
            />
            <SecretField
              v-model="channel.form.alipayPublicKey"
              v-model:clear="channel.form.clearAlipayPublicKey"
              label="支付宝公钥"
              prop="alipayPublicKey"
              multiline
              :disable-clear="channel.form.enabled"
              :configured="channel.form.alipayPublicKeyConfigured"
              placeholder="请粘贴支付宝平台公钥，不是应用公钥"
            />
          </template>

          <div class="save-actions">
            <ElButton :disabled="!isDirty(channel.code)" @click="reset(channel.code)"
              >重置</ElButton
            >
            <ElButton
              type="primary"
              native-type="submit"
              :loading="saving[channel.code]"
              :disabled="!isDirty(channel.code)"
            >
              保存{{ channel.name }}配置
            </ElButton>
          </div>
        </ArtForm>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, defineComponent, h, onMounted, reactive, ref } from 'vue'
  import {
    ElCheckbox,
    ElFormItem,
    ElInput,
    ElMessage,
    type FormInstance,
    type FormRules
  } from 'element-plus'
  import {
    fetchPaymentAccounts,
    savePaymentAccount,
    type PaymentChannel,
    type TenantPaymentAccount
  } from '@/api/payment-account'

  type EditableAccount = TenantPaymentAccount & {
    privateKey: string
    apiV3Key: string
    alipayPublicKey: string
  }

  const emptyAccount = (channel: PaymentChannel): EditableAccount => ({
    channel,
    enabled: false,
    appId: '',
    mchId: '',
    mchSerialNo: '',
    notifyUrl: '',
    sandboxEnabled: false,
    privateKeyConfigured: false,
    apiV3KeyConfigured: false,
    alipayPublicKeyConfigured: false,
    privateKey: '',
    apiV3Key: '',
    alipayPublicKey: '',
    clearPrivateKey: false,
    clearApiV3Key: false,
    clearAlipayPublicKey: false
  })

  const accounts = reactive<Record<PaymentChannel, EditableAccount>>({
    WECHAT: emptyAccount('WECHAT'),
    ALIPAY: emptyAccount('ALIPAY')
  })
  const loading = ref(false)
  const saving = reactive<Record<PaymentChannel, boolean>>({ WECHAT: false, ALIPAY: false })
  const baselines = reactive<Record<PaymentChannel, string>>({ WECHAT: '', ALIPAY: '' })
  const formRefs: Partial<Record<PaymentChannel, FormInstance>> = {}

  const channels = computed(() => [
    {
      code: 'WECHAT' as const,
      name: '微信支付',
      icon: 'ri:wechat-pay-line',
      description: '小程序 JSAPI 支付、订单查询及原路退款',
      form: accounts.WECHAT
    },
    {
      code: 'ALIPAY' as const,
      name: '支付宝',
      icon: 'ri:alipay-line',
      description: '手机网站支付、订单查询及原路退款',
      form: accounts.ALIPAY
    }
  ])

  const requiredWhenEnabled = (channel: PaymentChannel, label: string) => ({
    validator: (_rule: unknown, value: string, done: (error?: Error) => void) =>
      done(accounts[channel].enabled && !value?.trim() ? new Error(`请输入${label}`) : undefined),
    trigger: 'blur'
  })
  const secretRule = (
    channel: PaymentChannel,
    configuredKey: 'privateKeyConfigured' | 'apiV3KeyConfigured' | 'alipayPublicKeyConfigured',
    clearKey: 'clearPrivateKey' | 'clearApiV3Key' | 'clearAlipayPublicKey',
    label: string
  ) => ({
    validator: (_rule: unknown, value: string, done: (error?: Error) => void) => {
      const form = accounts[channel]
      const missing = !value?.trim() && (!form[configuredKey] || form[clearKey])
      done(form.enabled && missing ? new Error(`请输入${label}`) : undefined)
    },
    trigger: 'blur'
  })
  const rulesFor = (channel: PaymentChannel): FormRules =>
    channel === 'WECHAT'
      ? {
          appId: [requiredWhenEnabled(channel, '小程序 AppId')],
          notifyUrl: [requiredWhenEnabled(channel, '微信支付回调地址')],
          mchId: [requiredWhenEnabled(channel, '微信商户号')],
          mchSerialNo: [requiredWhenEnabled(channel, '商户 API 证书序列号')],
          privateKey: [
            secretRule(channel, 'privateKeyConfigured', 'clearPrivateKey', '商户 API 私钥')
          ],
          apiV3Key: [
            secretRule(channel, 'apiV3KeyConfigured', 'clearApiV3Key', 'APIv3 密钥'),
            {
              validator: (_rule: unknown, value: string, done: (error?: Error) => void) =>
                done(
                  value && new TextEncoder().encode(value.trim()).length !== 32
                    ? new Error('APIv3 密钥必须为 32 字节')
                    : undefined
                ),
              trigger: 'blur'
            }
          ]
        }
      : {
          appId: [requiredWhenEnabled(channel, '支付宝应用 ID')],
          notifyUrl: [requiredWhenEnabled(channel, '支付宝回调地址')],
          privateKey: [secretRule(channel, 'privateKeyConfigured', 'clearPrivateKey', '应用私钥')],
          alipayPublicKey: [
            secretRule(channel, 'alipayPublicKeyConfigured', 'clearAlipayPublicKey', '支付宝公钥')
          ]
        }

  const SecretField = defineComponent({
    props: {
      modelValue: { type: String, default: '' },
      clear: Boolean,
      configured: Boolean,
      multiline: Boolean,
      disableClear: Boolean,
      label: { type: String, required: true },
      prop: { type: String, required: true },
      placeholder: { type: String, required: true }
    },
    emits: ['update:modelValue', 'update:clear'],
    setup(props, { emit }) {
      return () =>
        h(ElFormItem, { label: props.label, prop: props.prop }, () => [
          h(ElInput, {
            modelValue: props.modelValue,
            type: props.multiline ? 'textarea' : 'password',
            showPassword: !props.multiline,
            autosize: props.multiline ? { minRows: 4, maxRows: 8 } : undefined,
            maxlength: 32768,
            autocomplete: 'new-password',
            placeholder: props.configured
              ? `已保存${props.label}，留空表示保留`
              : props.placeholder,
            'onUpdate:modelValue': (value: string) => {
              emit('update:modelValue', value)
              if (value) emit('update:clear', false)
            }
          }),
          props.configured
            ? h(
                ElCheckbox,
                {
                  modelValue: props.clear,
                  disabled: props.disableClear || Boolean(props.modelValue),
                  'onUpdate:modelValue': (value: boolean | string | number) =>
                    emit('update:clear', Boolean(value))
                },
                () => `清除已保存的${props.label}（启用渠道时不可清除）`
              )
            : null
        ])
    }
  })

  function normalize(account?: TenantPaymentAccount, channel?: PaymentChannel): EditableAccount {
    return {
      ...emptyAccount(channel || account?.channel || 'WECHAT'),
      ...account,
      channel: channel || account?.channel || 'WECHAT',
      privateKey: '',
      apiV3Key: '',
      alipayPublicKey: '',
      clearPrivateKey: false,
      clearApiV3Key: false,
      clearAlipayPublicKey: false
    }
  }
  function accept(account: TenantPaymentAccount) {
    const normalized = normalize(account)
    Object.assign(accounts[account.channel], normalized)
    baselines[account.channel] = JSON.stringify(normalized)
    formRefs[account.channel]?.clearValidate()
  }
  function isDirty(channel: PaymentChannel) {
    return Boolean(baselines[channel]) && JSON.stringify(accounts[channel]) !== baselines[channel]
  }
  function setFormRef(channel: PaymentChannel, instance: unknown) {
    if (instance) formRefs[channel] = instance as FormInstance
  }
  async function load() {
    loading.value = true
    try {
      const result = await fetchPaymentAccounts()
      for (const channel of ['WECHAT', 'ALIPAY'] as const) {
        accept(result.find((item) => item.channel === channel) || emptyAccount(channel))
      }
    } finally {
      loading.value = false
    }
  }
  function reset(channel: PaymentChannel) {
    if (baselines[channel]) Object.assign(accounts[channel], JSON.parse(baselines[channel]))
    formRefs[channel]?.clearValidate()
  }
  function onEnabledChange(channel: PaymentChannel) {
    if (!accounts[channel].enabled) return
    accounts[channel].clearPrivateKey = false
    accounts[channel].clearApiV3Key = false
    accounts[channel].clearAlipayPublicKey = false
  }
  async function submit(channel: PaymentChannel) {
    const formRef = formRefs[channel]
    if (saving[channel] || !isDirty(channel) || !(await formRef?.validate().catch(() => false)))
      return
    saving[channel] = true
    try {
      accept(await savePaymentAccount({ ...accounts[channel] }))
      ElMessage.success(`${channel === 'WECHAT' ? '微信支付' : '支付宝'}配置已保存`)
    } finally {
      saving[channel] = false
    }
  }

  onMounted(load)
</script>

<style scoped lang="scss">
  .payment-account-page {
    padding: 20px;
  }

  .inheritance-alert {
    margin-bottom: 18px;
  }

  .alipay-key-alert {
    margin-bottom: 18px;
  }

  .channel-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
    min-height: 240px;
  }

  .channel-card {
    padding: 24px;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 14px;
  }

  .channel-header,
  .channel-title,
  .enable-row,
  .save-actions {
    display: flex;
    align-items: center;
  }

  .channel-header,
  .enable-row {
    justify-content: space-between;
  }

  .channel-header {
    gap: 16px;
    margin-bottom: 24px;
  }

  .channel-title {
    gap: 12px;
  }

  .channel-title h2,
  .channel-title p,
  .enable-row p {
    margin: 0;
  }

  .channel-title h2 {
    font-size: 18px;
  }

  .channel-title p,
  .enable-row p {
    margin-top: 5px;
    font-size: 13px;
    line-height: 1.5;
    color: var(--el-text-color-secondary);
  }

  .channel-icon {
    display: grid;
    place-items: center;
    width: 42px;
    height: 42px;
    font-size: 24px;
    color: #fff;
    border-radius: 12px;
  }

  .channel-icon.wechat {
    background: #07c160;
  }

  .channel-icon.alipay {
    background: #1677ff;
  }

  .enable-row {
    padding: 14px 16px;
    margin-bottom: 20px;
    background: var(--el-fill-color-light);
    border-radius: 10px;
  }

  .field-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 16px;
  }

  .save-actions {
    gap: 10px;
    justify-content: flex-end;
    padding-top: 8px;
  }

  @media (width <= 1100px) {
    .channel-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (width <= 640px) {
    .payment-account-page {
      padding: 12px;
    }

    .channel-card {
      padding: 18px;
    }

    .field-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
