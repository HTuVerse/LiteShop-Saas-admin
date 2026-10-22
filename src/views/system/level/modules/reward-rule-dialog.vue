<template>
  <ElDialog
    :model-value="modelValue"
    title="经验规则配置"
    width="min(720px, 94vw)"
    align-center
    :close-on-click-modal="false"
    :show-close="!saving"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-loading="loading">
      <p class="rule-hint">餐饮订单完成后按实付金额发放；退款时按原规则撤回。每项结果向下取整。</p>
      <ArtForm ref="formRef" :model="form" :rules="rules" label-width="180px">
        <ElFormItem label="每实付 1 元获得经验" prop="expPerYuan">
          <ElInputNumber
            v-model="form.expPerYuan"
            :min="0"
            :max="10000"
            :precision="4"
            :step="0.1"
            :disabled="readOnly"
          />
        </ElFormItem>
        <ElFormItem label="每实付 1 元获得积分" prop="pointsPerYuan">
          <ElInputNumber
            v-model="form.pointsPerYuan"
            :min="0"
            :max="10000"
            :precision="4"
            :step="0.1"
            :disabled="readOnly"
          />
        </ElFormItem>
        <div class="level-heading">各等级获取倍率</div>
        <div v-for="level in levels" :key="level.levelCode" class="level-row">
          <span class="level-name">{{ level.levelName }}</span>
          <label
            >经验倍率
            <ElInputNumber
              v-model="multiplierMap[level.levelCode].expMultiplier"
              :min="0"
              :max="100"
              :precision="4"
              :step="0.1"
              :disabled="readOnly"
            />
          </label>
          <label
            >积分倍率
            <ElInputNumber
              v-model="multiplierMap[level.levelCode].pointsMultiplier"
              :min="0"
              :max="100"
              :precision="4"
              :step="0.1"
              :disabled="readOnly"
            />
          </label>
        </div>
      </ArtForm>
    </div>
    <template #footer>
      <ElButton :disabled="saving" @click="emit('update:modelValue', false)">{{
        readOnly ? '关闭' : '取消'
      }}</ElButton>
      <ElButton v-if="!readOnly" type="primary" :loading="saving" :disabled="loading" @click="save"
        >保存规则</ElButton
      >
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { reactive, ref, watch } from 'vue'
  import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
  import {
    getMemberRewardRule,
    saveMemberRewardRule,
    type LevelRewardMultiplier,
    type MemberLevel,
    type MemberRewardRule
  } from '@/api/member-level'
  import type { Id } from '@/types/backend'

  const props = defineProps<{
    modelValue: boolean
    schemeId: Id
    levels: MemberLevel[]
    readOnly: boolean
  }>()
  const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
  const formRef = ref<FormInstance>()
  const form = reactive<MemberRewardRule>({ expPerYuan: 0, pointsPerYuan: 0, levels: [] })
  const multiplierMap = reactive<Record<number, LevelRewardMultiplier>>({})
  const loading = ref(false)
  const saving = ref(false)
  const rules: FormRules = {
    expPerYuan: [{ required: true, type: 'number', message: '请输入每元经验', trigger: 'change' }],
    pointsPerYuan: [
      { required: true, type: 'number', message: '请输入每元积分', trigger: 'change' }
    ]
  }

  watch(
    () => [props.modelValue, props.schemeId] as const,
    async ([visible, schemeId]) => {
      if (!visible || !schemeId) return
      loading.value = true
      Object.keys(multiplierMap).forEach((key) => delete multiplierMap[Number(key)])
      for (const level of props.levels) {
        multiplierMap[level.levelCode] = {
          levelCode: level.levelCode,
          expMultiplier: 1,
          pointsMultiplier: 1
        }
      }
      try {
        const rule = await getMemberRewardRule(schemeId)
        form.expPerYuan = Number(rule.expPerYuan)
        form.pointsPerYuan = Number(rule.pointsPerYuan)
        for (const level of props.levels) {
          const saved = rule.levels.find((item) => item.levelCode === level.levelCode)
          multiplierMap[level.levelCode] = {
            levelCode: level.levelCode,
            expMultiplier: Number(saved?.expMultiplier ?? 1),
            pointsMultiplier: Number(saved?.pointsMultiplier ?? 1)
          }
        }
      } catch {
        emit('update:modelValue', false)
      } finally {
        loading.value = false
      }
    },
    { immediate: true }
  )

  async function save() {
    if (saving.value || !(await formRef.value?.validate().catch(() => false))) return
    const levels = props.levels.map((level) => multiplierMap[level.levelCode])
    if (
      levels.some(
        (row) =>
          !row || !Number.isFinite(row.expMultiplier) || !Number.isFinite(row.pointsMultiplier)
      )
    ) {
      ElMessage.warning('请填写完整的等级倍率')
      return
    }
    saving.value = true
    try {
      await saveMemberRewardRule(props.schemeId, {
        expPerYuan: form.expPerYuan,
        pointsPerYuan: form.pointsPerYuan,
        levels
      })
      ElMessage.success('经验积分规则已保存')
      emit('update:modelValue', false)
    } catch {
      // 请求错误由统一请求层提示。
    } finally {
      saving.value = false
    }
  }
</script>

<style scoped>
  .rule-hint {
    margin: 0 0 20px;
    color: var(--el-text-color-secondary);
  }

  .level-heading {
    margin: 8px 0 12px;
    font-weight: 600;
  }

  .level-row {
    display: grid;
    grid-template-columns: minmax(90px, 1fr) repeat(2, minmax(170px, 1.5fr));
    gap: 12px;
    align-items: center;
    padding: 12px 0;
    border-top: 1px solid var(--el-border-color-lighter);
  }

  .level-name {
    font-weight: 500;
  }

  .level-row label {
    display: flex;
    gap: 8px;
    align-items: center;
    color: var(--el-text-color-regular);
    white-space: nowrap;
  }

  @media (width <= 620px) {
    .level-row {
      grid-template-columns: 1fr;
    }
  }
</style>
