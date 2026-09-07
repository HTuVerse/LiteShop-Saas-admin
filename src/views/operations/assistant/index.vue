<template>
  <section class="assistant-page">
    <h2>经营助手</h2
    ><p class="hint"
      >向助手咨询商品、活动和门店经营问题。每次提问独立处理，请在问题中提供必要背景。</p
    >
    <ElAlert
      v-if="!enabled"
      :title="loading ? '正在检查服务状态…' : '助手服务尚未启用，请联系平台管理员配置 AI 服务。'"
      type="info"
      :closable="false"
    />
    <div v-for="(item, index) in messages" :key="index" :class="['message', item.role]"
      ><strong>{{ item.role === 'user' ? '我的问题' : '助手回复' }}</strong
      ><p>{{ item.content }}</p></div
    >
    <ArtForm @submit.prevent="send">
      <ElInput
        v-model.trim="message"
        type="textarea"
        :rows="4"
        maxlength="6000"
        show-word-limit
        placeholder="例如：如何为新店设计一周的会员优惠活动？"
        :disabled="!enabled || sending"
      />
      <div class="actions"
        ><ElButton @click="messages = []" :disabled="sending || !messages.length">清空对话</ElButton
        ><ElButton v-if="sending" @click="controller?.abort()">停止等待</ElButton
        ><ElButton
          type="primary"
          native-type="submit"
          :loading="sending"
          :disabled="!enabled || !message"
          >发送问题</ElButton
        ></div
      >
    </ArtForm>
  </section>
</template>
<script setup lang="ts">
  import { onMounted, onUnmounted, ref } from 'vue'
  import { getAiStatus, sendAiMessage } from '@/api/ai'
  const enabled = ref(false),
    loading = ref(true),
    sending = ref(false),
    message = ref('')
  const messages = ref<{ role: 'user' | 'assistant'; content: string }[]>([])
  let controller: AbortController | undefined
  onMounted(async () => {
    try {
      enabled.value = (await getAiStatus()).enabled
    } catch {
    } finally {
      loading.value = false
    }
  })
  onUnmounted(() => controller?.abort())
  async function send() {
    if (sending.value || !enabled.value || !message.value) return
    const prompt = message.value
    sending.value = true
    controller = new AbortController()
    try {
      const result = await sendAiMessage(prompt, controller.signal)
      messages.value.push(
        { role: 'user', content: prompt },
        { role: 'assistant', content: result.content }
      )
      message.value = ''
    } catch {
    } finally {
      sending.value = false
    }
  }
</script>
<style scoped>
  .assistant-page {
    max-width: 900px;
    margin: 0 auto;
  }

  h2 {
    font-size: 24px;
  }

  .hint {
    margin: 14px 0 25px;
    line-height: 1.8;
    color: var(--el-text-color-secondary);
  }

  .message {
    padding: 20px;
    margin-bottom: 16px;
    background: var(--el-fill-color-light);
    border-radius: 12px;
  }

  .message.user {
    background: var(--el-color-primary-light-9);
  }

  .message p {
    margin-top: 10px;
    line-height: 1.9;
    white-space: pre-wrap;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 14px;
  }
</style>
