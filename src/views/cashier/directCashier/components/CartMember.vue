<template>
  <div class="cart-member">
    <div v-if="member && !editing" class="member-info">
      <div class="member-header">
        <ElAvatar class="member-avatar" :size="48" :src="member.avatar || member.portrait">
          {{ memberName.charAt(0) }}
        </ElAvatar>
        <div class="member-identity">
          <div class="member-headline">
            <strong class="nickname" :title="memberName">{{ memberName }}</strong>
            <span class="level-badge">{{ memberLevel }}</span>
          </div>
          <span class="phone">手机号：{{ member.phone || member.cellphone || '未绑定' }}</span>
        </div>
        <div v-if="!memberLocked" class="member-actions">
          <ElButton plain size="small" @click="startEditing">更换</ElButton>
          <ElButton type="danger" text size="small" @click="handleClear">清除</ElButton>
        </div>
      </div>
      <div class="member-stats">
        <div class="member-stat">
          <span>积分</span>
          <strong>{{ memberPoints }}</strong>
        </div>
        <div class="member-stat balance-stat">
          <span>会员余额</span>
          <strong>￥{{ formatMoney(memberBalance) }}</strong>
        </div>
      </div>
    </div>

    <div v-else-if="!memberLocked" class="member-lookup">
      <ElAvatar :size="40" :icon="User" />
      <ElInput
        ref="phoneInputRef"
        v-model="phone"
        inputmode="numeric"
        maxlength="11"
        clearable
        placeholder="输入会员手机号"
        :prefix-icon="Iphone"
        @input="handlePhoneInput"
        @keyup.enter="lookupMember"
      />
      <ElButton type="primary" :loading="loading" @click="lookupMember">加载会员</ElButton>
      <ElButton v-if="member" text @click="editing = false">取消</ElButton>
    </div>

  </div>
</template>

<script setup lang="ts">
  import { computed, inject, nextTick, ref } from 'vue'
  import { ElAvatar, ElButton, ElInput, ElMessage } from 'element-plus'
  import { Iphone, User } from '@element-plus/icons-vue'
  import { fetchCashierMemberByPhone } from '@/api/cashier'
  import { formatMoney } from '@utils/cashier/utils'

  const { member, updateMember } = inject<any>('member')
  const tableInfo = inject<any>('tableInfo', null)
  const memberLocked = computed(() => Boolean(tableInfo?.hasOrder?.value))
  const phone = ref('')
  const editing = ref(false)
  const loading = ref(false)
  const phoneInputRef = ref<InstanceType<typeof ElInput>>()
  let lookupSequence = 0

  const memberName = computed(
    () => member.value?.username || member.value?.nickname || `会员${member.value?.id || ''}`
  )
  const memberBalance = computed(() =>
    Number(member.value?.surplusMoney ?? member.value?.balance ?? 0)
  )
  const memberLevel = computed(() => {
    const name = String(member.value?.levelName || '').trim()
    return name && !/^\d+$/.test(name) ? name : '未设置等级'
  })
  const memberPoints = computed(() => Number(member.value?.points ?? 0))

  const startEditing = () => {
    phone.value = ''
    editing.value = true
    nextTick(() => phoneInputRef.value?.focus())
  }

  const handlePhoneInput = (value: string) => {
    phone.value = String(value || '')
      .replace(/\D/g, '')
      .slice(0, 11)
  }

  const lookupMember = async () => {
    if (!/^1\d{10}$/.test(phone.value)) {
      ElMessage.warning('请输入正确的11位手机号')
      return
    }
    const sequence = ++lookupSequence
    loading.value = true
    try {
      const result: any = await fetchCashierMemberByPhone(phone.value)
      if (sequence !== lookupSequence) return
      if (!result?.id) {
        ElMessage.warning('未找到该手机号对应的会员')
        return
      }
      updateMember({
        ...result,
        username: result.username || result.nickname || `会员${result.id}`,
        surplusMoney: Number(result.surplusMoney ?? result.balance ?? 0)
      })
      editing.value = false
      ElMessage.success('会员加载成功')
    } catch (error: any) {
      if (sequence === lookupSequence) {
        ElMessage.error(error?.message || error?.msg || '会员加载失败')
      }
    } finally {
      if (sequence === lookupSequence) loading.value = false
    }
  }

  const handleClear = () => {
    lookupSequence++
    updateMember(null)
    phone.value = ''
    editing.value = false
  }
</script>

<style scoped lang="scss">
  .cart-member {
    flex-shrink: 0;
    margin-bottom: 10px;
  }

  .member-info {
    padding: 12px 14px;
    background: linear-gradient(135deg, #fffaf2, var(--el-fill-color-blank));
    border: 1px solid #f1e6d2;
    border-radius: 12px;
  }

  .member-header {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
  }

  .member-avatar {
    flex-shrink: 0;
  }

  .member-identity {
    flex: 1;
    min-width: 150px;
  }

  .member-headline {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 7px;
    align-items: center;
    margin-bottom: 4px;
  }

  .nickname {
    max-width: 100%;
    overflow: hidden;
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .level-badge {
    flex-shrink: 0;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 600;
    color: #8b5b19;
    background: #f8e8c9;
    border-radius: 99px;
  }

  .phone {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .member-actions {
    display: flex;
    flex-shrink: 0;
    gap: 2px;
    align-items: center;
    margin-left: auto;

    :deep(.el-button + .el-button) {
      margin-left: 0;
    }
  }

  .member-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    padding-top: 12px;
    margin-top: 12px;
    border-top: 1px solid #f1e6d2;
  }

  .member-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    padding-left: 12px;

    &:first-child {
      padding-left: 0;
      border-right: 1px solid #f1e6d2;
    }

    > span {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }

    > strong {
      overflow: hidden;
      font-size: 18px;
      color: var(--el-text-color-primary);
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .balance-stat > strong {
    color: var(--el-color-danger);
  }

  .member-lookup {
    display: flex;
    gap: 8px;
    align-items: center;
    min-height: 42px;
    padding: 2px;
  }

  .member-lookup :deep(.el-input) {
    flex: 1;
    min-width: 120px;
  }

  @media (width <= 540px) {
    .member-header {
      flex-wrap: wrap;
    }

    .member-actions {
      width: 100%;
      justify-content: flex-end;
    }

    .member-info {
      padding: 10px;
    }

    .member-lookup {
      flex-wrap: wrap;
    }

    .member-lookup :deep(.el-input) {
      flex-basis: calc(100% - 52px);
    }
  }
</style>
