<template>
  <section class="advisor-page">
    <div class="advisor-header">
      <div class="advisor-title">
        <h2>AI 智能问数</h2>
        <p>直接询问经营问题，AI 会读取可用数据并给出下一步建议。</p>
        <div class="permission-note">
          <ArtSvgIcon icon="ri:shield-check-line" />只读查询 · 数据仅来自授权范围，重要结论请核对
        </div>
      </div>
      <div class="scope-controls">
        <span class="control-label">查询范围</span>
        <ElSelect
          v-model="scopeType"
          aria-label="经营范围"
          :disabled="Boolean(activeSessionId)"
          @change="handleScopeChange"
        >
          <ElOption v-if="scope?.tenantViewAvailable" label="租户总部" value="TENANT" />
          <ElOption label="单门店" value="STORE" />
        </ElSelect>
        <ElSelect
          v-if="scopeType === 'STORE'"
          v-model="storeId"
          aria-label="选择门店"
          placeholder="选择门店"
          :disabled="Boolean(activeSessionId)"
        >
          <ElOption
            v-for="store in scope?.stores || []"
            :key="String(store.storeId)"
            :label="store.storeName"
            :value="store.storeId"
          />
        </ElSelect>
        <span v-if="callQuota" class="quota-pill">
          <ArtSvgIcon icon="ri:flashlight-line" />
          剩余 <strong>{{ callQuota.remaining ?? 0 }}</strong> 次
        </span>
      </div>
    </div>

    <ElAlert
      v-if="unavailableMessage && !statusLoading"
      :title="unavailableMessage"
      type="warning"
      :closable="false"
      show-icon
      class="status-alert"
    />

    <div class="advisor-grid">
      <ElCard shadow="never" class="advisor-card session-card">
        <div class="rail-heading">
          <div>
            <span>对话记录</span>
            <strong>历史会话</strong>
          </div>
          <ElButton type="primary" link @click="newSession">
            <ArtSvgIcon icon="ri:add-line" />新建
          </ElButton>
        </div>
        <div class="session-tabs">
          <ElRadioGroup v-model="sessionStatus" size="small" @change="loadSessions">
            <ElRadioButton value="ACTIVE">进行中</ElRadioButton
            ><ElRadioButton value="ARCHIVED">已归档</ElRadioButton>
          </ElRadioGroup>
        </div>
        <div v-loading="sessionsLoading" class="session-list">
          <button
            v-for="session in sessions"
            :key="String(session.id)"
            type="button"
            :class="['session-item', { active: String(session.id) === String(activeSessionId) }]"
            @click="openSession(session)"
          >
            <strong>{{ session.title }}</strong
            ><span>{{ formatDateTime(session.lastMessageAt) }}</span>
          </button>
          <ElEmpty
            v-if="!sessionsLoading && !sessions.length"
            description="暂无会话"
            :image-size="54"
          />
        </div>
        <div v-if="activeSessionId" class="session-actions">
          <ElButton size="small" @click="renameSession">重命名</ElButton>
          <ElButton size="small" @click="toggleArchive">{{
            activeSession?.status === 'ARCHIVED' ? '恢复' : '归档'
          }}</ElButton>
        </div>
      </ElCard>

      <ElCard shadow="never" class="advisor-card chat-card">
        <div class="preset-area">
          <div class="preset-heading">
            <strong>从一个经营问题开始</strong>
            <span>选择示例后仍可继续编辑</span>
          </div>
          <div class="quick-questions">
            <button
              v-for="preset in questionPresets"
              :key="preset.question"
              type="button"
              :disabled="chatLoading"
              @click="question = preset.question"
              >{{ preset.label }}</button
            >
          </div>
        </div>
        <div ref="messageListRef" class="message-list">
          <div v-if="!messages.length" class="empty-chat">
            <img :src="chatAvatar" alt="AI 智能问数" /><strong>想先了解什么？</strong>
            <span>{{
              diagnosisReference
                ? '已携带经营诊断上下文，可以直接追问原因或处理方案。'
                : '直接描述经营问题，无需先选择统计周期。'
            }}</span>
          </div>
          <article
            v-for="(item, index) in messages"
            :key="`${item.requestId || index}-${item.role}`"
            :class="['message', item.role]"
          >
            <img
              :src="item.role === 'user' ? userAvatar : chatAvatar"
              :alt="item.role === 'user' ? '我的头像' : 'AI 智能问数'"
            />
            <div class="message-main">
              <ReplyBubble
                v-if="item.role === 'assistant'"
                :message="item"
                :time="formatMessageTime(item.createdAt)"
                :disabled="chatLoading"
                @feedback="feedback(item, $event)"
                @ask="askFollowUp"
                @copy="copyReply(item.content)"
              />
              <div v-else class="message-bubble"><p>{{ item.content }}</p></div>
              <div v-if="item.role === 'user'" class="message-meta">
                <time>{{ formatMessageTime(item.createdAt) }}</time>
              </div>
            </div>
          </article>
          <article v-if="chatLoading" class="message assistant"
            ><img :src="chatAvatar" alt="AI 智能问数" /><div class="message-bubble typing"
              >正在读取经营数据并整理建议…</div
            ></article
          >
        </div>
        <ArtForm class="chat-composer" @submit.prevent="sendQuestion">
          <ElInput
            v-model.trim="question"
            type="textarea"
            :rows="3"
            maxlength="1000"
            show-word-limit
            resize="none"
            placeholder="例如：最近订单为什么下降？我现在应该先处理什么？"
            :disabled="chatLoading || !modelEnabled"
          />
          <div class="composer-actions"
            ><span>成功回答消耗 1 次；打开历史会话不消耗</span
            ><ElButton
              type="primary"
              native-type="submit"
              :loading="chatLoading"
              :disabled="!question || !canAsk"
              ><ArtSvgIcon v-if="!chatLoading" icon="ri:send-plane-fill" />发送 · 消耗1次</ElButton
            ></div
          >
        </ArtForm>
      </ElCard>
    </div>
  </section>
</template>

<script setup lang="ts">
  import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { useRoute, useRouter } from 'vue-router'
  import {
    askAiManager,
    feedbackAiManagerRecord,
    getAiAdvisorMessages,
    getAiAdvisorSessions,
    getAiManagerCapabilities,
    getAiManagerScope,
    getAiStatus,
    updateAiAdvisorSession,
    type AiAdvisorSession,
    type AiFeedback,
    type AiManagerCapabilities,
    type AiManagerScope
  } from '@/api/ai'
  import { AI_MANAGER_QUESTION_PRESETS } from '@/config/ai-manager'
  import { useAiQuota, resolveAiStatusMessage } from '@/hooks'
  import { useEntitlementStore } from '@/store/modules/entitlement'
  import { useUserStore } from '@/store/modules/user'
  import { resolveUserAvatar } from '@/utils/user-avatar'
  import {
    assistantMessageFromResult,
    restoreAdvisorRounds,
    type AdvisorMessage
  } from '@/utils/ai/advisor-message'
  import ReplyBubble from './modules/reply-bubble.vue'
  import chatAvatar from '@/assets/images/ai-manager/chat-avatar.png'

  const route = useRoute()
  const router = useRouter()
  const userStore = useUserStore()
  const entitlementStore = useEntitlementStore()
  const scope = ref<AiManagerScope>()
  const capabilities = ref<AiManagerCapabilities>()
  const scopeType = ref<'TENANT' | 'STORE'>('TENANT')
  const storeId = ref<number | string>()
  const modelEnabled = ref(false)
  const statusLoading = ref(true)
  const unavailableMessage = ref('')
  const chatLoading = ref(false)
  const question = ref('')
  const messages = ref<AdvisorMessage[]>([])
  const sessions = ref<AiAdvisorSession[]>([])
  const sessionsLoading = ref(false)
  const sessionStatus = ref<'ACTIVE' | 'ARCHIVED'>('ACTIVE')
  const activeSessionId = ref<number | string>()
  const messageListRef = ref<HTMLElement>()
  const diagnosisReference = ref(String(route.query.referenceRequestId || ''))
  const userAvatar = computed(() => resolveUserAvatar(userStore.info.avatar, userStore.info.gender))
  const { callQuota, hasQuota } = useAiQuota()
  const canAsk = computed(
    () =>
      modelEnabled.value &&
      hasQuota.value &&
      !chatLoading.value &&
      activeSession.value?.status !== 'ARCHIVED' &&
      (scopeType.value === 'TENANT' || Boolean(storeId.value))
  )
  const questionPresets = computed(() =>
    AI_MANAGER_QUESTION_PRESETS.filter(
      (preset) => capabilities.value?.[preset.capability] !== false
    )
  )
  const activeSession = computed(() =>
    sessions.value.find((item) => String(item.id) === String(activeSessionId.value))
  )
  let chatRequest: AbortController | undefined

  async function loadSessions() {
    sessionsLoading.value = true
    try {
      const page = await getAiAdvisorSessions({
        currentPage: 1,
        pageSize: 50,
        status: sessionStatus.value
      })
      sessions.value = page.records || []
    } catch (error: any) {
      ElMessage.error(String(error?.message || '会话加载失败'))
    } finally {
      sessionsLoading.value = false
    }
  }

  async function openSession(session: AiAdvisorSession) {
    chatRequest?.abort()
    activeSessionId.value = session.id
    scopeType.value = session.scopeType
    storeId.value = session.storeId
    messages.value = []
    try {
      const rounds = await getAiAdvisorMessages(session.id)
      messages.value = restoreAdvisorRounds(rounds)
    } catch (error: any) {
      ElMessage.error(String(error?.message || '会话恢复失败'))
    }
  }

  function newSession() {
    chatRequest?.abort()
    activeSessionId.value = undefined
    messages.value = []
    question.value = ''
    diagnosisReference.value = ''
  }

  async function renameSession() {
    if (!activeSessionId.value) return
    const { value } = await ElMessageBox.prompt('输入新的会话名称', '重命名会话', {
      inputValue: activeSession.value?.title,
      inputPattern: /\S+/,
      inputErrorMessage: '名称不能为空'
    })
    await updateAiAdvisorSession(activeSessionId.value, { title: value })
    await loadSessions()
  }

  async function toggleArchive() {
    if (!activeSessionId.value) return
    const status = activeSession.value?.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED'
    await updateAiAdvisorSession(activeSessionId.value, { status })
    newSession()
    await loadSessions()
    ElMessage.success(status === 'ARCHIVED' ? '会话已归档' : '会话已恢复')
  }

  function handleScopeChange() {
    if (scopeType.value === 'STORE' && !storeId.value)
      storeId.value = scope.value?.stores[0]?.storeId
  }

  async function initialize() {
    let autoAsk = false
    statusLoading.value = true
    try {
      const status = await getAiStatus()
      modelEnabled.value = status.enabled
      unavailableMessage.value = resolveAiStatusMessage(status)
      if (!status.enabled && status.reason === 'NOT_ENTITLED') return
      const [scopeData, capabilityData] = await Promise.all([
        getAiManagerScope(),
        getAiManagerCapabilities()
      ])
      scope.value = scopeData
      capabilities.value = capabilityData
      const queryScope = String(route.query.scopeType || '').toUpperCase()
      scopeType.value = queryScope === 'STORE' ? 'STORE' : scopeData.defaultScopeType
      storeId.value = route.query.storeId
        ? String(route.query.storeId)
        : scopeData.defaultStoreId || scopeData.stores[0]?.storeId
      question.value = String(route.query.question || '')
      autoAsk = route.query.autoAsk === '1'
      await loadSessions()
    } catch (error: any) {
      unavailableMessage.value = String(error?.message || 'AI 智能问数初始化失败')
    } finally {
      statusLoading.value = false
    }
    if (autoAsk && question.value && canAsk.value) {
      const query = { ...route.query }
      delete query.autoAsk
      delete query.question
      await router.replace({ query })
      await sendQuestion()
    }
  }

  async function sendQuestion() {
    if (!question.value || !canAsk.value) {
      if (!hasQuota.value) ElMessage.warning('AI 生成额度已用完，请购买次数包后重试。')
      return
    }
    const current = question.value
    const controller = new AbortController()
    chatRequest = controller
    messages.value.push({ role: 'user', content: current, createdAt: new Date().toISOString() })
    question.value = ''
    chatLoading.value = true
    try {
      const reply = await askAiManager(
        {
          scopeType: scopeType.value,
          storeId: scopeType.value === 'STORE' ? storeId.value : undefined,
          timeRange: 'TODAY',
          message: current,
          sessionId: activeSessionId.value,
          referenceRequestId: diagnosisReference.value || undefined
        },
        controller.signal
      )
      if (!controller.signal.aborted) {
        activeSessionId.value = reply.session.id
        const result = reply.result
        // 后端已直接返回本轮 requestId，无需再查询消息列表补偿。
        messages.value.push(assistantMessageFromResult(result, reply.requestId))
        await loadSessions()
      }
    } catch (error: any) {
      if (!controller.signal.aborted)
        ElMessage.error(String(error?.message || 'AI 智能问数暂时无法回答，请稍后重试'))
    } finally {
      if (chatRequest === controller) chatLoading.value = false
      entitlementStore.refresh().catch(() => undefined)
    }
  }

  async function feedback(item: AdvisorMessage, value: AiFeedback) {
    if (!item.requestId) return
    await feedbackAiManagerRecord(item.requestId, value)
    item.feedback = value
    ElMessage.success(value === 'USEFUL' ? '已标记为有用' : '已记录反馈')
  }

  function askFollowUp(value: string) {
    question.value = value
    if (canAsk.value) void sendQuestion()
  }

  async function copyReply(value: string) {
    try {
      await navigator.clipboard.writeText(value)
      ElMessage.success('回答已复制')
    } catch {
      ElMessage.error('复制失败，请手动选择回答文字')
    }
  }

  const formatMessageTime = (value: string) =>
    new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(
      new Date(value)
    )
  const formatDateTime = (value: string) => (value ? value.replace('T', ' ').slice(5, 16) : '-')
  watch(
    () => messages.value.length,
    async () => {
      await nextTick()
      messageListRef.value?.scrollTo({ top: messageListRef.value.scrollHeight, behavior: 'smooth' })
    }
  )
  watch(() => userStore.sessionRevision, initialize)
  onMounted(initialize)
  onUnmounted(() => chatRequest?.abort())
</script>

<style scoped lang="scss">
  .permission-note .art-svg-icon {
    color: var(--el-color-success);
  }

  .scope-controls .el-select {
    width: 150px;
  }

  .status-alert {
    margin-bottom: 14px;
  }

  .composer-actions,
  .message-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .session-item:hover,
  .session-item.active {
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary-light-7);
  }

  .session-item strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .session-item span {
    font-size: 11px;
    color: var(--el-text-color-placeholder);
  }

  .quick-questions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  }

  .message {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    margin-bottom: 16px;
  }

  .message.user {
    flex-direction: row-reverse;
  }

  .message-main {
    max-width: 82%;
  }

  .message.assistant .message-main {
    width: min(100%, 860px);
    max-width: calc(100% - 44px);
  }

  .message-bubble > p {
    margin: 0;
    white-space: pre-wrap;
  }

  .message-meta {
    gap: 6px;
    margin-top: 4px;
    font-size: 11px;
    color: var(--el-text-color-placeholder);
  }

  .data-period {
    margin-top: 10px !important;
    font-size: 12px;
    color: var(--el-text-color-placeholder);
  }

  .composer-actions {
    margin-top: 8px;
  }

  .composer-actions span {
    font-size: 12px;
    color: var(--el-text-color-placeholder);
  }

  .answer-points {
    display: grid;
    margin-top: 10px;
  }

  .answer-point {
    display: flex;
    gap: 9px;
    align-items: baseline;
    padding: 8px 0;

    & + .answer-point {
      border-top: 1px solid var(--el-border-color-lighter);
    }

    strong {
      font-size: 13px;
      font-weight: 600;
      line-height: 1.5;
      color: var(--el-text-color-primary);
    }

    p {
      margin: 3px 0 0;
      font-size: 12px;
      line-height: 1.6;
      color: var(--el-text-color-secondary);
    }
  }

  .answer-point-index {
    flex: 0 0 auto;
    min-width: 14px;
    font-size: 13px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    line-height: 1.5;
    color: var(--el-color-primary);
  }

  .answer-actions {
    display: grid;
    gap: 6px;
    padding: 10px 12px;
    margin-top: 12px;
    background: var(--el-color-primary-light-9);
    border-radius: 9px;
  }

  .answer-actions-title {
    font-size: 11px;
    font-weight: 600;
    color: var(--el-color-primary);
  }

  .answer-action {
    strong {
      font-size: 12px;
      color: var(--el-text-color-primary);
    }

    span {
      display: block;
      margin-top: 2px;
      font-size: 12px;
      line-height: 1.55;
      color: var(--el-text-color-secondary);
    }
  }

  .advisor-page {
    max-width: 1680px;
    margin: 0 auto;
  }

  .advisor-header {
    display: flex;
    gap: 24px;
    align-items: flex-end;
    justify-content: space-between;
    margin-bottom: 25px;
  }

  .advisor-title {
    h2,
    p {
      margin: 0;
    }

    h2 {
      font-size: 24px;
    }

    p {
      margin-top: 14px;
      line-height: 1.8;
      color: var(--el-text-color-secondary);
    }
  }

  .permission-note {
    display: flex;
    gap: 6px;
    align-items: center;
    margin-top: 8px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .scope-controls {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    justify-content: flex-end;
    padding: 5px;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 10px;

    :deep(.el-select__wrapper) {
      min-height: 34px;
      background: var(--el-bg-color);
      border-radius: 7px;
      box-shadow: 0 0 0 1px var(--el-border-color) inset;
    }
  }

  .control-label {
    padding: 0 4px 0 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--el-text-color-secondary);
  }

  .quota-pill {
    display: inline-flex;
    gap: 5px;
    align-items: center;
    min-height: 34px;
    padding: 0 10px;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    color: var(--el-text-color-secondary);
    white-space: nowrap;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 7px;

    .art-svg-icon {
      color: var(--el-color-warning-dark-2);
    }

    strong {
      color: var(--el-text-color-primary);
    }
  }

  .advisor-grid {
    display: grid;
    grid-template-columns: 260px minmax(0, 1fr);
    gap: 18px;
    min-height: 650px;
  }

  .advisor-card {
    min-width: 0;
    overflow: hidden;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 16px;

    :deep(.el-card__body) {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 0;
    }
  }

  .rail-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 65px;
    padding: 12px 14px;
    border-bottom: 1px solid var(--el-border-color-lighter);

    > div {
      display: grid;
      gap: 2px;
    }

    span {
      font-size: 11px;
      color: var(--el-text-color-placeholder);
    }

    strong {
      font-size: 14px;
      color: var(--el-text-color-primary);
    }

    .el-button .art-svg-icon {
      margin-right: 3px;
    }
  }

  .session-tabs {
    padding: 12px 12px 6px;
    margin: 0;

    :deep(.el-radio-group) {
      width: 100%;
    }

    :deep(.el-radio-button) {
      flex: 1;
    }

    :deep(.el-radio-button__inner) {
      width: 100%;
      border-radius: 6px;
    }
  }

  .session-list {
    flex: 1;
    height: auto;
    padding: 6px 8px 12px;
    overflow-y: auto;
    scrollbar-width: thin;
  }

  .session-item {
    position: relative;
    display: grid;
    gap: 5px;
    width: 100%;
    padding: 11px 10px 11px 13px;
    margin-bottom: 3px;
    text-align: left;
    cursor: pointer;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 8px;

    &::before {
      position: absolute;
      top: 10px;
      bottom: 10px;
      left: 0;
      width: 2px;
      content: '';
      background: transparent;
      border-radius: 2px;
    }

    &.active {
      background: color-mix(in srgb, var(--el-color-primary) 9%, var(--el-bg-color));
      border-color: transparent;

      &::before {
        background: var(--el-color-primary);
      }
    }

    &:focus-visible {
      outline: 2px solid var(--el-color-primary-light-5);
      outline-offset: -2px;
    }
  }

  .session-actions {
    display: flex;
    gap: 6px;
    padding: 10px 12px 12px;
    background: var(--el-bg-color);
    border-top: 1px solid var(--el-border-color-lighter);
  }

  .preset-area {
    padding: 14px 18px 13px;
    background: var(--el-fill-color-light);
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .preset-heading {
    display: flex;
    gap: 10px;
    align-items: baseline;
    justify-content: space-between;

    strong {
      font-size: 13px;
      color: var(--el-text-color-primary);
    }

    span {
      font-size: 11px;
      color: var(--el-text-color-placeholder);
    }
  }

  .quick-questions button {
    padding: 6px 10px;
    line-height: 1.35;
    color: var(--el-text-color-regular);
    cursor: pointer;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 7px;
    transition:
      color 0.16s ease,
      border-color 0.16s ease,
      background-color 0.16s ease;

    &:hover:not(:disabled),
    &:focus-visible {
      color: var(--el-color-primary);
      background: color-mix(in srgb, var(--el-color-primary) 5%, var(--el-bg-color));
      border-color: var(--el-color-primary-light-5);
      outline: none;
    }
  }

  .message-list {
    flex: 1;
    min-height: 330px;
    padding: 22px clamp(16px, 3vw, 32px);
    overflow-y: auto;
    scrollbar-width: thin;
  }

  .empty-chat {
    display: flex;
    flex-direction: column;
    gap: 7px;
    align-items: center;
    justify-content: center;
    min-height: 320px;
    color: var(--el-text-color-secondary);

    img {
      width: 64px;
      height: 64px;
      padding: 5px;
      background: var(--el-fill-color-light);
      border: 1px solid var(--el-border-color-lighter);
      border-radius: 18px;
    }

    strong {
      margin-top: 6px;
      font-size: 17px;
      color: var(--el-text-color-primary);
    }

    span {
      max-width: 420px;
      line-height: 1.6;
      text-align: center;
    }
  }

  .message > img {
    width: 34px;
    height: 34px;
    object-fit: cover;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 50%;
  }

  .message-bubble {
    padding: 11px 14px;
    line-height: 1.7;
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 4px 12px 12px;
  }

  .user .message-bubble {
    color: #fff;
    background: var(--el-color-primary);
    border-color: var(--el-color-primary);
    border-radius: 12px 4px 12px 12px;
  }

  .chat-composer {
    padding: 14px clamp(16px, 3vw, 32px) 17px;
    background: var(--el-bg-color);
    border-top: 1px solid var(--el-border-color-lighter);

    :deep(.el-textarea__inner) {
      min-height: 86px !important;
      padding: 12px 14px;
      line-height: 1.65;
      border-radius: 9px;
      box-shadow: 0 0 0 1px var(--el-border-color) inset;

      &:focus {
        box-shadow: 0 0 0 1px var(--el-color-primary) inset;
      }
    }
  }

  .composer-actions .el-button {
    min-width: 126px;
    height: 36px;
    margin-left: 0;
    border-radius: 8px;
  }

  @media (width <= 1180px) {
    .advisor-grid {
      grid-template-columns: 218px minmax(0, 1fr);
    }
  }

  @media (width <= 760px) {
    .scope-controls {
      justify-content: flex-start;
      width: 100%;
    }

    .control-label {
      width: 100%;
      padding-top: 2px;
    }

    .scope-controls .el-select {
      flex: 1 1 140px;
      width: auto;
    }

    .advisor-header {
      flex-direction: column;
      align-items: stretch;
    }

    .advisor-grid {
      grid-template-columns: minmax(0, 1fr);
      min-height: 0;
    }

    .session-list {
      max-height: 190px;
    }

    .chat-card {
      min-height: 620px;
    }

    .preset-heading,
    .composer-actions {
      flex-direction: column;
      align-items: flex-start;
    }

    .composer-actions .el-button {
      width: 100%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .quick-questions button,
    .session-item {
      transition: none;
    }
  }
</style>
