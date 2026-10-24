<template>
  <ElDialog v-model="visible" title="审计日志完整性校验" width="560px" destroy-on-close>
    <ArtForm :model="form" label-width="105px" @submit.prevent>
      <ElFormItem label="租户范围">
        <ElInput v-model="form.tenantId" placeholder="0 表示平台全局" clearable />
      </ElFormItem>
    </ArtForm>
    <p class="mb-4 text-sm text-gray-500">
      输入租户 ID 校验该租户的完整日志链；0 表示平台全局。日志较多时可能需要等待。
    </p>
    <ElAlert
      v-if="result"
      :title="result.valid ? '校验通过' : '校验失败'"
      :type="result.valid ? 'success' : 'error'"
      :closable="false"
      show-icon
    >
      <p>范围：{{ result.tenantScopeId }}，已校验序号：{{ result.lastSequence }}</p>
      <p v-if="result.reason">原因：{{ result.reason }}</p>
      <p v-if="result.lastHash" class="break-all">链头摘要：{{ result.lastHash }}</p>
    </ElAlert>
    <template #footer>
      <ElButton @click="visible = false">关闭</ElButton>
      <ElButton type="primary" :loading="loading" @click="verify">开始校验</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { reactive, ref, watch } from 'vue'
  import { ElMessage } from 'element-plus'
  import { verifyAuditIntegrity } from '@/api/system-audit'
  import type { AuditIntegrityResult } from '@/api/system-audit'

  const props = defineProps<{ defaultScope?: string }>()
  const visible = defineModel<boolean>({ default: false })
  const form = reactive({ tenantId: '0' })
  const loading = ref(false)
  const result = ref<AuditIntegrityResult | null>(null)

  watch(visible, (opened) => {
    if (opened) {
      form.tenantId = props.defaultScope || '0'
      result.value = null
    }
  })

  const verify = async () => {
    const tenantId = form.tenantId.trim()
    if (!/^(0|[1-9]\d*)$/.test(tenantId)) {
      ElMessage.warning('请输入有效的租户 ID，平台全局请填 0')
      return
    }
    loading.value = true
    result.value = null
    try {
      result.value = await verifyAuditIntegrity(tenantId)
    } catch {
      // 公共请求层已展示接口错误。
    } finally {
      loading.value = false
    }
  }
</script>
